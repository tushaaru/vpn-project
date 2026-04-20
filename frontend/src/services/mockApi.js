/**
 * MOCK SERVICE LAYER v2
 * Simulates API calls with latency and random data.
 * Follows "no logs" philosophy: data is in-memory only.
 */

const LATENCY_RANGE = [20, 150];
const SPEED_RANGE = [50, 500];

export const servers = [
    { id: 'de-1', country: "Germany", city: "Frankfurt", code: "DE", flag: "🇩🇪", region: "Europe", load: 42, tags: ["Fastest", "Recommended"] },
    { id: 'nl-1', country: "Netherlands", city: "Amsterdam", code: "NL", flag: "🇳🇱", region: "Europe", load: 15, tags: ["P2P Optimized"] },
    { id: 'fi-1', country: "Finland", city: "Helsinki", code: "FI", flag: "🇫🇮", region: "Europe", load: 28, tags: ["Secure Core"] },
    { id: 'ch-1', country: "Switzerland", city: "Zürich", code: "CH", flag: "🇨🇭", region: "Europe", load: 12, tags: ["Privacy First"] },
    { id: 'sg-1', country: "Singapore", city: "Singapore", code: "SG", flag: "🇸🇬", region: "Asia Pacific", load: 65, tags: ["Gaming"] },
    { id: 'jp-1', country: "Japan", city: "Tokyo", code: "JP", flag: "🇯🇵", region: "Asia Pacific", load: 55, tags: ["Fastest"] },
    { id: 'us-1', country: "United States", city: "New York", code: "US", flag: "🇺🇸", region: "North America", load: 82, tags: ["Streaming"] },
    { id: 'us-2', country: "United States", city: "Los Angeles", code: "US", flag: "🇺🇸", region: "North America", load: 74, tags: ["Recommended"] },
    { id: 'uk-1', country: "United Kingdom", city: "London", code: "GB", flag: "🇬🇧", region: "Europe", load: 38, tags: ["Fastest"] },
    { id: 'ca-1', country: "Canada", city: "Toronto", code: "CA", flag: "🇨🇦", region: "North America", load: 22, tags: ["P2P Optimized"] },
];

const nodePool = {
    entry: [
        { id: "vultr-fra", provider: "Vultr", location: "Frankfurt", ip: "45.76.12.88" },
        { id: "vultr-ams", provider: "Vultr", location: "Amsterdam", ip: "45.32.45.102" },
        { id: "vultr-sgp", provider: "Vultr", location: "Singapore", ip: "45.77.201.34" },
    ],
    exit: [
        { id: "hetzner-hel", provider: "Hetzner", location: "Helsinki", ip: "95.216.18.44" },
        { id: "hetzner-nbg", provider: "Hetzner", location: "Nuremberg", ip: "78.46.92.11" },
        { id: "hetzner-fsn", provider: "Hetzner", location: "Falkenstein", ip: "88.198.34.56" },
    ],
};

// In-memory state (destroyed on refresh)
let session = null;
let connected = false;
let currentServer = servers[0];
let currentNodes = { entry: nodePool.entry[0], exit: nodePool.exit[0] };
let devices = [];
let settings = {
    killSwitch: true,
    autoRotate: true,
    rotationInterval: '15m',
    defaultServer: 'de-1',
    protocol: 'wireguard',
    notifications: {
        qrGenerated: true,
        connectionSuccess: true,
        sessionExpiry: true
    },
    sessionTimeout: '30m',
    theme: 'dark'
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const mockApi = {
    getServers: async () => {
        await sleep(400);
        return servers.map(s => ({
            ...s,
            latency: Math.floor(Math.random() * (LATENCY_RANGE[1] - LATENCY_RANGE[0])) + LATENCY_RANGE[0]
        }));
    },

    getSettings: async () => {
        await sleep(300);
        return settings;
    },

    updateSettings: async (newSettings) => {
        await sleep(300);
        settings = { ...settings, ...newSettings };
        return settings;
    },

    createSession: async () => {
        await sleep(600);
        session = {
            id: Math.random().toString(36).substring(2, 15),
            expiresAt: Date.now() + 30 * 60 * 1000,
            createdAt: Date.now(),
        };
        return session;
    },

    connect: async (serverId) => {
        await sleep(1500);
        if (Math.random() < 0.05) throw new Error("Connection timeout. Peer unreachable.");

        connected = true;
        currentServer = servers.find(s => s.id === serverId) || servers[0];
        currentNodes = {
            entry: nodePool.entry[Math.floor(Math.random() * nodePool.entry.length)],
            exit: nodePool.exit[Math.floor(Math.random() * nodePool.exit.length)],
        };
        return { connected: true, server: currentServer, nodes: currentNodes };
    },

    disconnect: async () => {
        await sleep(500);
        connected = false;
        return { connected: false };
    },

    getMetrics: async () => {
        if (!connected) return null;
        return {
            latency: Math.floor(Math.random() * (LATENCY_RANGE[1] - LATENCY_RANGE[0])) + LATENCY_RANGE[0],
            downloadSpeed: (Math.random() * SPEED_RANGE[1]).toFixed(1),
            uploadSpeed: (Math.random() * (SPEED_RANGE[1] / 3)).toFixed(1),
            ip: `185.212.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            strength: Math.random() > 0.8 ? 'good' : 'excellent',
            dataTransferred: {
                down: (Math.random() * 500).toFixed(1),
                up: (Math.random() * 100).toFixed(1)
            }
        };
    },

    rotateNodes: async () => {
        await sleep(800);
        currentNodes = {
            entry: nodePool.entry[Math.floor(Math.random() * nodePool.entry.length)],
            exit: nodePool.exit[Math.floor(Math.random() * nodePool.exit.length)],
        };
        return currentNodes;
    },

    generateConfig: async (deviceName) => {
        await sleep(1000);
        const id = Math.random().toString(36).substring(7);
        const device = {
            id,
            name: deviceName || `Device-${id}`,
            type: 'mobile',
            addedAt: Date.now(),
            config: `vpn://nexus-secure-${id}`,
            expiresAt: Date.now() + 2 * 60 * 1000 // 2 minutes expiry
        };
        devices.push(device);
        return device;
    },

    getDevices: async () => {
        return devices;
    },

    revokeDevice: async (id) => {
        await sleep(400);
        devices = devices.filter(d => d.id !== id);
        return true;
    }
};
