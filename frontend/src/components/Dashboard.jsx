import { useState, useEffect, useRef } from "react";

const servers = [
  { country: "Germany",     city: "Frankfurt",  code: "DE", flag: "🇩🇪", region: "Europe"      },
  { country: "Netherlands", city: "Amsterdam",  code: "NL", flag: "🇳🇱", region: "Europe"      },
  { country: "Finland",     city: "Helsinki",   code: "FI", flag: "🇫🇮", region: "Europe"      },
  { country: "Switzerland", city: "Zürich",     code: "CH", flag: "🇨🇭", region: "Europe"      },
  { country: "Singapore",   city: "Singapore",  code: "SG", flag: "🇸🇬", region: "Asia Pacific" },
  { country: "Japan",       city: "Tokyo",      code: "JP", flag: "🇯🇵", region: "Asia Pacific" },
];

const navItems = [
  { id: "dashboard", label: "Dashboard",    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { id: "servers",   label: "Servers",      icon: "M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" },
  { id: "settings",  label: "Settings",     icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

/* ── Globe ── */
function Globe({ active, size = 280 }) {
  const ref = useRef(null);
  const raf = useRef(null);
  const t   = useRef(0);

  useEffect(() => {
    const c = ref.current;
    const ctx = c.getContext("2d");
    const W = c.width, H = c.height;
    const cx = W / 2, cy = H / 2, R = W * 0.42;

    function pt(lat, lon, time) {
      const phi   = (90 - lat) * (Math.PI / 180);
      const theta = (lon + time * 14) * (Math.PI / 180);
      return {
        x: cx + R * Math.sin(phi) * Math.cos(theta),
        y: cy + R * Math.cos(phi),
        z:      R * Math.sin(phi) * Math.sin(theta),
      };
    }

    const hotspots = [
      { lat: 51, lon: 10 }, { lat: 52, lon: 5 }, { lat: 60, lon: 25 },
      { lat: 47, lon: 8  }, { lat: 1,  lon: 104}, { lat: 35, lon: 139},
    ];

    function frame() {
      t.current += 0.003;
      ctx.clearRect(0, 0, W, H);

      // Base
      const bg = ctx.createRadialGradient(cx - R*0.2, cy - R*0.2, 0, cx, cy, R);
      bg.addColorStop(0, active ? "rgba(0,255,180,0.08)" : "rgba(60,60,160,0.07)");
      bg.addColorStop(1, "transparent");
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2);
      ctx.fillStyle = bg; ctx.fill();

      // Grid
      ctx.globalAlpha = active ? 0.18 : 0.08;
      const col = active ? "#00ffb4" : "#7788ee";
      for (let la = -60; la <= 60; la += 20) {
        ctx.beginPath(); let f = true;
        for (let lo = 0; lo <= 360; lo += 3) {
          const p = pt(la, lo, t.current);
          if (p.z < 0) { f = true; continue; }
          f ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); f = false;
        }
        ctx.strokeStyle = col; ctx.lineWidth = 0.5; ctx.stroke();
      }
      for (let lo = 0; lo < 360; lo += 20) {
        ctx.beginPath(); let f = true;
        for (let la = -90; la <= 90; la += 3) {
          const p = pt(la, lo, t.current);
          if (p.z < 0) { f = true; continue; }
          f ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); f = false;
        }
        ctx.strokeStyle = col; ctx.lineWidth = 0.5; ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Hotspots
      if (active) {
        hotspots.forEach((h, i) => {
          const p = pt(h.lat, h.lon, t.current);
          if (p.z < 0) return;
          const pulse = (Math.sin(t.current * 2.5 + i) + 1) / 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2 + pulse * 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0,255,180,${0.5 + pulse * 0.5})`;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5 + pulse * 5, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(0,255,180,${0.1 + pulse * 0.12})`;
          ctx.lineWidth = 1; ctx.stroke();
        });
      }

      // Edge
      const edge = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R);
      edge.addColorStop(0, "transparent");
      edge.addColorStop(1, active ? "rgba(0,255,180,0.1)" : "rgba(60,60,180,0.07)");
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2);
      ctx.fillStyle = edge; ctx.fill();

      // Spec
      const spec = ctx.createRadialGradient(cx-R*0.35, cy-R*0.35, 0, cx-R*0.2, cy-R*0.2, R*0.5);
      spec.addColorStop(0, "rgba(255,255,255,0.07)");
      spec.addColorStop(1, "transparent");
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2);
      ctx.fillStyle = spec; ctx.fill();

      raf.current = requestAnimationFrame(frame);
    }
    frame();
    return () => cancelAnimationFrame(raf.current);
  }, [active]);

  return (
    <canvas ref={ref} width={size} height={size}
      style={{ filter: active ? "drop-shadow(0 0 40px rgba(0,255,180,0.25))" : "drop-shadow(0 0 20px rgba(60,60,180,0.18))", transition: "filter 1s" }} />
  );
}

/* ── Route strip ── */
function RouteStrip({ active }) {
  const hops = ["Client", "Vultr · Relay", "Hetzner · Exit", "Internet"];
  return (
    <div className="flex items-center gap-0">
      {hops.map((h, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full transition-all duration-700"
                style={{
                  background: active ? (i === 0 ? "#00ffb4" : i === hops.length-1 ? "#00ccff" : "rgba(255,255,255,0.5)") : "rgba(255,255,255,0.15)",
                  boxShadow: active ? (i === 0 ? "0 0 8px #00ffb4" : i === hops.length-1 ? "0 0 8px #00ccff" : "none") : "none",
                }} />
            </div>
            <span style={{ fontSize: 10, color: active ? (i===0?"#00ffb4":i===hops.length-1?"#00ccff":"rgba(255,255,255,0.5)") : "rgba(255,255,255,0.2)", fontFamily:"'Space Mono',monospace", whiteSpace:"nowrap", transition:"color 0.7s" }}>
              {h}
            </span>
          </div>
          {i < hops.length - 1 && (
            <div className="relative mx-3 flex-shrink-0" style={{ width: 40, height: 1, background: "rgba(255,255,255,0.07)", overflow:"hidden" }}>
              {active && (
                <div style={{ position:"absolute", top:0, height:"100%", width:"50%", background:"linear-gradient(90deg,transparent,#00ffb4,transparent)", animation:`slide ${1.2 + i*0.2}s linear ${i*0.3}s infinite` }} />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Trust badge ── */
function Badge({ label, ok }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
      style={{ background: ok ? "rgba(0,255,180,0.06)" : "rgba(255,255,255,0.03)", border: `1px solid ${ok ? "rgba(0,255,180,0.2)" : "rgba(255,255,255,0.07)"}`, transition:"all 0.5s" }}>
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: ok ? "#00ffb4" : "rgba(255,255,255,0.2)", boxShadow: ok ? "0 0 5px #00ffb4" : "none", transition:"all 0.5s" }} />
      <span style={{ fontSize: 11, color: ok ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.28)", fontFamily:"'Space Mono',monospace" }}>{label}</span>
    </div>
  );
}

/* ── Main ── */
export default function Dashboard() {
  const [connected,  setConnected]  = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [selected,   setSelected]   = useState(0);
  const [activeNav,  setActiveNav]  = useState("dashboard");

  const toggle = () => {
    if (connecting) return;
    setConnecting(true);
    setTimeout(() => { setConnected(c => !c); setConnecting(false); }, 1800);
  };

  const server      = servers[selected];
  const statusColor = connecting ? "#ffaa00" : connected ? "#00ffb4" : "#ff4466";

  return (
    <div className="flex min-h-screen" style={{ background: "#080b14", fontFamily: "'Sora', sans-serif", color: "#fff" }}>

      {/* ── Sidebar ── */}
      <aside className="flex flex-col w-56 flex-shrink-0 border-r" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
        {/* Logo */}
        <div className="px-6 py-6 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #00ffb4, #00aaff)" }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 1L2 4v4c0 3.5 2.5 6.2 6 7 3.5-.8 6-3.5 6-7V4L8 1z" fill="white"/>
              </svg>
            </div>
            <div>
              <div className="font-bold text-white text-sm tracking-tight" style={{ fontFamily:"'Space Mono',monospace" }}>NEXUS</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily:"'Space Mono',monospace" }}>VPN</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveNav(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left"
              style={{
                background: activeNav === item.id ? "rgba(0,255,180,0.08)" : "transparent",
                border: `1px solid ${activeNav === item.id ? "rgba(0,255,180,0.15)" : "transparent"}`,
                color: activeNav === item.id ? "#00ffb4" : "rgba(255,255,255,0.4)",
                cursor: "pointer",
              }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d={item.icon}/>
              </svg>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom status */}
        <div className="px-4 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}`, transition: "all 0.5s" }} />
            <div>
              <div style={{ fontSize: 11, color: statusColor, fontFamily:"'Space Mono',monospace", transition:"color 0.5s" }}>
                {connecting ? "Connecting…" : connected ? "Protected" : "Offline"}
              </div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>
                {connected ? `${server.city}, ${server.code}` : "No tunnel"}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className="flex items-center justify-between px-8 py-4 border-b flex-shrink-0"
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}>
          <div>
            <h1 className="font-bold text-white" style={{ fontSize: 20, letterSpacing: "-0.3px" }}>Dashboard</h1>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>No-logs double-hop VPN · Prototype</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily:"'Space Mono',monospace" }}>
              WireGuard · AES-256-GCM
            </div>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#00ffb4,#00aaff)", fontSize: 13, fontWeight: 700, color: "#000" }}>N</div>
          </div>
        </header>

        {/* Content grid */}
        <main className="flex-1 overflow-y-auto p-8" style={{ background: "transparent" }}>
          <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 360px" }}>

            {/* ── LEFT COLUMN ── */}
            <div className="flex flex-col gap-6">

              {/* Connection card */}
              <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {/* Accent top */}
                <div className="h-px" style={{ background: connected ? "linear-gradient(90deg,transparent,#00ffb4 40%,transparent)" : "linear-gradient(90deg,transparent,#5566ff 40%,transparent)", transition:"background 1s" }} />
                <div className="p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="font-semibold text-white mb-1" style={{ fontSize: 16 }}>Tunnel Control</h2>
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                        {connecting ? "Establishing encrypted tunnel…" : connected ? `Connected via ${server.city}` : "Tunnel inactive — you are exposed"}
                      </p>
                    </div>
                    {/* Big toggle */}
                    <button onClick={toggle}
                      className="flex items-center gap-3 px-5 py-2.5 rounded-xl font-semibold transition-all duration-500"
                      style={{
                        background: connecting ? "rgba(255,170,0,0.12)" : connected ? "rgba(0,255,180,0.12)" : "rgba(255,68,102,0.1)",
                        border: `1.5px solid ${connecting ? "#ffaa00" : connected ? "#00ffb4" : "#ff4466"}`,
                        color: connecting ? "#ffaa00" : connected ? "#00ffb4" : "#ff4466",
                        cursor: "pointer", fontSize: 13,
                        boxShadow: connected ? "0 0 20px rgba(0,255,180,0.15)" : "none",
                        transition: "all 0.5s",
                      }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M12 3v5M7.05 7.05a7 7 0 1 0 9.9 0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
                          style={{ animation: connecting ? "spin 1s linear infinite" : "none" }} />
                      </svg>
                      {connecting ? "Connecting…" : connected ? "Disconnect" : "Connect"}
                    </button>
                  </div>

                  {/* Route */}
                  <div className="p-4 rounded-xl mb-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily:"'Space Mono',monospace" }}>TUNNEL ROUTE</span>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily:"'Space Mono',monospace" }}>Double-hop · No-logs</span>
                    </div>
                    <RouteStrip active={connected && !connecting} />
                  </div>

                  {/* Trust badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge label="No Logs"     ok={true}      />
                    <Badge label="Kill Switch"  ok={connected} />
                    <Badge label="No DNS Leak"  ok={connected} />
                    <Badge label="IPv6 Leak"    ok={connected} />
                  </div>
                </div>
              </div>

              {/* Server list panel */}
              <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <h2 className="font-semibold text-white" style={{ fontSize: 15 }}>Exit Servers</h2>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily:"'Space Mono',monospace" }}>{servers.length} available</span>
                </div>
                <div>
                  {servers.map((s, i) => (
                    <button key={i} onClick={() => setSelected(i)}
                      className="w-full flex items-center gap-4 px-6 py-4 transition-all duration-150 text-left"
                      style={{
                        background: i === selected ? "rgba(0,255,180,0.04)" : "transparent",
                        borderBottom: i < servers.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                        borderLeft: `2px solid ${i === selected ? "#00ffb4" : "transparent"}`,
                        cursor: "pointer", transition: "all 0.2s",
                      }}>
                      <span style={{ fontSize: 24, lineHeight: 1 }}>{s.flag}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white" style={{ fontSize: 14 }}>{s.country}</span>
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily:"'Space Mono',monospace" }}>{s.code}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>{s.city} · {s.region}</div>
                      </div>
                      {i === selected && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#00ffb4", boxShadow: "0 0 5px #00ffb4" }} />
                          <span style={{ fontSize: 10, color: "#00ffb4", fontFamily:"'Space Mono',monospace" }}>Selected</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN ── */}
            <div className="flex flex-col gap-6">

              {/* Globe panel */}
              <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <h2 className="font-semibold text-white" style={{ fontSize: 15 }}>Network</h2>
                </div>
                <div className="flex items-center justify-center py-6">
                  <Globe active={connected && !connecting} size={240} />
                </div>
                <div className="px-5 pb-5 text-center">
                  <div className="text-white font-semibold mb-0.5" style={{ fontSize: 14 }}>
                    {connected ? server.country : "—"}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                    {connected ? `${server.city} exit node` : "No exit node selected"}
                  </div>
                </div>
              </div>

              {/* Architecture info */}
              <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <h2 className="font-semibold text-white" style={{ fontSize: 15 }}>Architecture</h2>
                </div>
                <div className="px-5 py-4 space-y-4">
                  {[
                    { label: "Relay Layer",  value: "Vultr",        note: "Entry · Traffic obfuscation" },
                    { label: "Exit Layer",   value: "Hetzner",      note: "Exit · IP masking" },
                    { label: "Protocol",     value: "WireGuard",    note: "Modern VPN protocol" },
                    { label: "Encryption",   value: "AES-256-GCM",  note: "Military-grade cipher" },
                    { label: "Log Policy",   value: "Zero Logs",    note: "Nothing stored, ever" },
                  ].map((row, i) => (
                    <div key={i} className="flex items-start justify-between">
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{row.label}</div>
                      <div className="text-right">
                        <div className="font-semibold text-white" style={{ fontSize: 12, fontFamily:"'Space Mono',monospace" }}>{row.value}</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", marginTop: 1 }}>{row.note}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Backend placeholder */}
              <div className="rounded-2xl px-5 py-4 flex items-center gap-3"
                style={{ background: "rgba(255,170,0,0.05)", border: "1px dashed rgba(255,170,0,0.2)" }}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#ffaa00" }} />
                <p style={{ fontSize: 11, color: "rgba(255,170,0,0.7)", lineHeight: 1.5 }}>
                  Backend integration pending. API hooks ready in <span style={{ fontFamily:"'Space Mono',monospace" }}>toggle()</span>.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
