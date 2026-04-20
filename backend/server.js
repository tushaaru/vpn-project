const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "../frontend/dist")));

// ── In-memory ephemeral store (NO persistence, NO logs) ──
const sessions = new Map();
const devices = new Map();

// Session duration in ms (30 minutes)
const SESSION_DURATION = 30 * 60 * 1000;

// ── Helpers ──
function generateSessionId() {
  return crypto.randomBytes(16).toString("hex");
}

function generateWireGuardConfig(peerId) {
  const privKey = crypto.randomBytes(32).toString("base64");
  const pubKey = crypto.randomBytes(32).toString("base64");
  return {
    config: `[Interface]
PrivateKey = ${privKey}
Address = 10.0.0.${Math.floor(Math.random() * 254) + 1}/32
DNS = 1.1.1.1

[Peer]
PublicKey = ${pubKey}
AllowedIPs = 0.0.0.0/0
Endpoint = vpn.nexus-secure.io:51820
PersistentKeepalive = 25`,
    peerId,
    publicKey: pubKey,
  };
}

function getSimulatedMetrics() {
  return {
    latency: Math.floor(Math.random() * 40) + 28,
    downloadSpeed: (Math.random() * 80 + 40).toFixed(1),
    uploadSpeed: (Math.random() * 30 + 10).toFixed(1),
    dataTransferred: {
      download: (Math.random() * 200 + 20).toFixed(1),
      upload: (Math.random() * 50 + 5).toFixed(1),
    },
    connectionStrength: Math.random() > 0.1 ? (Math.random() > 0.3 ? "excellent" : "good") : "fair",
    packetLoss: (Math.random() * 0.5).toFixed(2),
  };
}

// Node rotation state
let currentNodes = {
  entry: { id: "vultr-fra-01", provider: "Vultr", location: "Frankfurt", ip: "45.76.xxx.xx" },
  exit: { id: "hetzner-hel-01", provider: "Hetzner", location: "Helsinki", ip: "95.216.xxx.xx" },
};
let lastRotation = Date.now();
let rotationInterval = 15 * 60 * 1000; // 15 min
let autoRotate = true;

const nodePool = {
  entry: [
    { id: "vultr-fra-01", provider: "Vultr", location: "Frankfurt", ip: "45.76.xxx.xx" },
    { id: "vultr-ams-01", provider: "Vultr", location: "Amsterdam", ip: "45.32.xxx.xx" },
    { id: "vultr-sgp-01", provider: "Vultr", location: "Singapore", ip: "45.77.xxx.xx" },
  ],
  exit: [
    { id: "hetzner-hel-01", provider: "Hetzner", location: "Helsinki", ip: "95.216.xxx.xx" },
    { id: "hetzner-nbg-01", provider: "Hetzner", location: "Nuremberg", ip: "78.46.xxx.xx" },
    { id: "hetzner-fsn-01", provider: "Hetzner", location: "Falkenstein", ip: "88.198.xxx.xx" },
  ],
};

function rotateNodes() {
  const newEntry = nodePool.entry[Math.floor(Math.random() * nodePool.entry.length)];
  const newExit = nodePool.exit[Math.floor(Math.random() * nodePool.exit.length)];
  currentNodes = { entry: newEntry, exit: newExit };
  lastRotation = Date.now();
  return currentNodes;
}

// ── Cleanup expired sessions ──
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > SESSION_DURATION) {
      sessions.delete(id);
      devices.delete(id);
    }
  }
  // Auto rotation
  if (autoRotate && now - lastRotation > rotationInterval) {
    rotateNodes();
  }
}, 10000);

// ── ROUTES ──

// Health
app.get("/", (req, res) => {
  res.json({ status: "running", mode: "no-logs", uptime: process.uptime() });
});

// Create ephemeral session
app.post("/api/session/create", (req, res) => {
  const sessionId = generateSessionId();
  const session = {
    id: sessionId,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION,
    connected: false,
    server: null,
  };
  sessions.set(sessionId, session);
  devices.set(sessionId, []);
  res.json({
    sessionId,
    expiresAt: session.expiresAt,
    duration: SESSION_DURATION,
    privacyMode: "no-logs",
  });
});

// Extend session
app.post("/api/session/extend", (req, res) => {
  const { sessionId } = req.body;
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: "Session not found or expired" });
  session.expiresAt = Date.now() + SESSION_DURATION;
  res.json({ expiresAt: session.expiresAt, extended: true });
});

// Get session status
app.get("/api/session/:id", (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Session expired", expired: true });
  const remaining = Math.max(0, session.expiresAt - Date.now());
  res.json({
    ...session,
    remaining,
    expired: remaining <= 0,
  });
});

// Connect
app.post("/api/connect", (req, res) => {
  const { sessionId, serverCode } = req.body;
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: "Session expired" });
  session.connected = true;
  session.server = serverCode;
  session.connectedAt = Date.now();
  res.json({ connected: true, server: serverCode, nodes: currentNodes });
});

// Disconnect
app.post("/api/disconnect", (req, res) => {
  const { sessionId } = req.body;
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: "Session expired" });
  session.connected = false;
  session.server = null;
  session.connectedAt = null;
  res.json({ connected: false });
});

// Real-time metrics (live only, never stored)
app.get("/api/metrics/:sessionId", (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session || !session.connected) {
    return res.json({ connected: false, metrics: null });
  }
  const uptime = Date.now() - (session.connectedAt || Date.now());
  res.json({
    connected: true,
    metrics: {
      ...getSimulatedMetrics(),
      uptime,
      server: session.server,
      nodes: currentNodes,
    },
  });
});

// Node rotation
app.get("/api/nodes", (req, res) => {
  const timeToRotation = Math.max(0, rotationInterval - (Date.now() - lastRotation));
  res.json({
    current: currentNodes,
    lastRotation,
    nextRotation: lastRotation + rotationInterval,
    timeToRotation,
    autoRotate,
  });
});

app.post("/api/nodes/rotate", (req, res) => {
  const nodes = rotateNodes();
  res.json({ rotated: true, nodes });
});

app.post("/api/nodes/auto-rotate", (req, res) => {
  autoRotate = req.body.enabled !== undefined ? req.body.enabled : !autoRotate;
  res.json({ autoRotate });
});

// QR-based provisioning
app.post("/api/generate-peer", (req, res) => {
  const { sessionId } = req.body;
  const peerId = crypto.randomBytes(4).toString("hex");
  const { config, publicKey } = generateWireGuardConfig(peerId);

  // Add to session's device list
  if (sessionId && devices.has(sessionId)) {
    const deviceList = devices.get(sessionId);
    deviceList.push({
      id: peerId,
      publicKey: publicKey.substring(0, 12) + "...",
      createdAt: Date.now(),
      type: req.body.deviceType || "mobile",
      name: req.body.deviceName || `Device-${peerId.substring(0, 4)}`,
    });
  }

  // Generate QR code URL with actual config
  const qrData = encodeURIComponent(config);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrData}`;

  res.json({
    peerId,
    qrUrl,
    config,
    message: "Scan QR with WireGuard app to connect",
  });
});

// Device management
app.get("/api/devices/:sessionId", (req, res) => {
  const deviceList = devices.get(req.params.sessionId);
  if (!deviceList) return res.json({ devices: [] });
  res.json({ devices: deviceList });
});

app.post("/api/devices/revoke", (req, res) => {
  const { sessionId, deviceId } = req.body;
  const deviceList = devices.get(sessionId);
  if (!deviceList) return res.json({ success: false });
  const idx = deviceList.findIndex((d) => d.id === deviceId);
  if (idx > -1) deviceList.splice(idx, 1);
  res.json({ success: true, remaining: deviceList.length });
});

// Privacy status
app.get("/api/privacy-status", (req, res) => {
  res.json({
    logsActive: false,
    dnsLogsStored: false,
    activityLogsStored: false,
    ipLogsStored: false,
    sessionPersistence: false,
    ephemeralMode: true,
    message: "No activity, IP, or DNS logs are stored",
  });
});

// Server status (health check for error handling)
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: Date.now(),
    activeSessions: sessions.size,
  });
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Nexus VPN Backend running on http://localhost:${PORT}`);
  console.log(`🔒 Mode: No-Logs Ephemeral`);
  console.log(`📡 Sessions: In-memory only`);
});