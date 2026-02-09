import { useEffect, useMemo, useRef, useState } from "react";
import CubeSatView from "./CubeSatView.jsx";
import OrbitView from "./OrbitView.jsx";



/** --- helpers --- */
function isoToMs(iso) {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

function niceTimeLabel(ms) {
  // compact-ish UTC label
  const d = new Date(ms);
  // e.g. 12:34:56.789Z
  return d.toISOString().slice(11);
}

function severityToRadius(sev) {
  switch ((sev || "").toUpperCase()) {
    case "ERROR": return 5;
    case "WARN":
    case "WARNING": return 4;
    default: return 3;
  }
}

function severityColor(sev) {
  switch (String(sev || "").toUpperCase()) {
    case "ERROR": return "#ff3b30";   // red
    case "WARN":
    case "WARNING": return "#ffcc00"; // yellow
    case "INFO": return "#34c759";    // green
    case "DEBUG": return "#5ac8fa";   // cyan
    default: return "#9e9e9e";        // gray
  }
}


/** --- Timeline component --- */
// function Timeline({
//   events,
//   selectedId,
//   onSelect,
// }) {
//   // Viewport state: center time and window width (ms)
//   const [windowMs, setWindowMs] = useState(5 * 60 * 1000); // 5 minutes
//   const [centerMs, setCenterMs] = useState(() => Date.now());

//   const svgRef = useRef(null);
//   const dragRef = useRef({ dragging: false, startX: 0, startCenter: 0 });

//   // Keep view centered on latest data (gentle follow)
//   useEffect(() => {
//     if (events.length === 0) return;
//     const newest = isoToMs(events[0]?.t_utc);
//     if (!newest) return;
//     // If user is roughly at the newest edge, auto-follow
//     const half = windowMs / 2;
//     const left = centerMs - half;
//     const right = centerMs + half;
//     const nearRightEdge = newest > right - 0.15 * windowMs;
//     if (nearRightEdge) setCenterMs(newest);
//   }, [events, windowMs]); // intentionally not depending on centerMs (avoid loops)

//   const { leftMs, rightMs } = useMemo(() => {
//     const half = windowMs / 2;
//     return { leftMs: centerMs - half, rightMs: centerMs + half };
//   }, [centerMs, windowMs]);

//   const points = useMemo(() => {
//     // Precompute ms and keep only points in a modest bound around view
//     const pad = windowMs * 0.25;
//     const lo = leftMs - pad;
//     const hi = rightMs + pad;

//     const out = [];
//     for (const e of events) {
//       const ms = isoToMs(e.t_utc);
//       if (!ms) continue;
//       if (ms < lo || ms > hi) continue;
//       out.push({ e, ms });
//     }
//     return out;
//   }, [events, leftMs, rightMs, windowMs]);

//   function xFromMs(ms, width) {
//     return ((ms - leftMs) / (rightMs - leftMs)) * width;
//   }
//   function msFromX(x, width) {
//     return leftMs + (x / width) * (rightMs - leftMs);
//   }

//   // Tick marks (simple: 6 segments)
//   const ticks = useMemo(() => {
//     const N = 6;
//     const step = (rightMs - leftMs) / N;
//     return Array.from({ length: N + 1 }, (_, i) => leftMs + i * step);
//   }, [leftMs, rightMs]);

//   const onWheel = (evt) => {
//     evt.preventDefault();
//     const svg = svgRef.current;
//     if (!svg) return;
//     const rect = svg.getBoundingClientRect();
//     const x = evt.clientX - rect.left;
//     const width = rect.width;

//     const anchorMs = msFromX(x, width);

//     // wheel up = zoom in, down = zoom out
//     const zoomFactor = evt.deltaY < 0 ? 0.85 : 1.15;
//     const nextWindow = clamp(windowMs * zoomFactor, 10_000, 60 * 60 * 1000); // 10s .. 1h

//     // Keep anchor time under cursor while zooming
//     const nextHalf = nextWindow / 2;
//     const t = (anchorMs - leftMs) / (rightMs - leftMs); // 0..1
//     const nextCenter = anchorMs - (t - 0.5) * nextWindow;

//     setWindowMs(nextWindow);
//     setCenterMs(nextCenter);
//   };

//   const onMouseDown = (evt) => {
//     const svg = svgRef.current;
//     if (!svg) return;
//     dragRef.current.dragging = true;
//     dragRef.current.startX = evt.clientX;
//     dragRef.current.startCenter = centerMs;
//   };

//   const onMouseMove = (evt) => {
//     const svg = svgRef.current;
//     if (!svg) return;
//     if (!dragRef.current.dragging) return;

//     const rect = svg.getBoundingClientRect();
//     const dx = evt.clientX - dragRef.current.startX;
//     const width = rect.width;

//     // Convert pixels to ms
//     const msPerPx = (rightMs - leftMs) / width;
//     const deltaMs = dx * msPerPx;

//     setCenterMs(dragRef.current.startCenter - deltaMs);
//   };

//   const onMouseUp = () => {
//     dragRef.current.dragging = false;
//   };

//   const [hover, setHover] = useState(null);

//   return (
//     <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
//       <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
//         <div>
//           <b>Timeline</b>{" "}
//           <span style={{ opacity: 0.75 }}>
//             ({Math.round(windowMs / 1000)}s window, wheel to zoom, drag to pan)
//           </span>
//         </div>
//         <div style={{ fontFamily: "monospace", opacity: 0.85 }}>
//           {new Date(leftMs).toISOString()} — {new Date(rightMs).toISOString()}
//         </div>
//       </div>

//       <svg
//         ref={svgRef}
//         width="100%"
//         height="110"
//         style={{ marginTop: 10, background: "#fafafa", borderRadius: 8, cursor: "grab" }}
//         onWheel={onWheel}
//         onMouseDown={onMouseDown}
//         onMouseMove={onMouseMove}
//         onMouseUp={onMouseUp}
//         onMouseLeave={onMouseUp}
//       >
//         {/* axis line */}
//         <line x1="12" y1="60" x2="988" y2="60" stroke="#bbb" strokeWidth="2" />

//         {/* ticks */}
//         {ticks.map((tMs, i) => {
//           const x = 12 + (i / ticks.length) * (988 - 12) * (ticks.length / (ticks.length - 1));
//           return (
//             <g key={tMs}>
//               <line x1={x} y1="50" x2={x} y2="70" stroke="#ccc" />
//               <text x={x} y="90" fontSize="10" textAnchor="middle" fill="#666">
//                 {niceTimeLabel(tMs)}
//               </text>
//             </g>
//           );
//         })}

//         {/* now marker */}
//         {(() => {
//           const now = Date.now();
//           if (now < leftMs || now > rightMs) return null;
//           const rect = svgRef.current?.getBoundingClientRect();
//           const width = rect?.width ?? 1000;
//           const plotW = width - 24;
//           const x = 12 + xFromMs(now, plotW);
//           return (
//             <g>
//               <line x1={x} y1="20" x2={x} y2="100" stroke="#999" strokeDasharray="4,4" />
//               <text x={x} y="18" fontSize="10" textAnchor="middle" fill="#666">now</text>
//             </g>
//           );
//         })()}

//         {/* event dots */}
//         {(() => {
//           const rect = svgRef.current?.getBoundingClientRect();
//           const width = rect?.width ?? 1000;
//           const plotW = width - 24;

//           return points.map(({ e, ms }) => {
//             const x = 12 + xFromMs(ms, plotW);
//             const r = severityToRadius(e.severity);
//             const isSel = e.id === selectedId;

//             // Stack dots slightly by subsystem hash so they don't fully overlap
//             const y = 60 + ((hashString(e.subsystem || "") % 5) - 2) * 6;

//             return (
//               <circle
//                 key={e.id}
//                 cx={x}
//                 cy={y}
//                 r={isSel ? r + 2 : r}
//                 fill={isSel ? "#111" : "#555"}
//                 opacity={0.9}
//                 style={{ cursor: "pointer" }}
//                 onMouseEnter={() => setHover({ e, ms })}
//                 onMouseLeave={() => setHover(null)}
//                 onClick={() => onSelect(e)}
//               />
//             );
//           });
//         })()}

//         {/* hover tooltip (simple) */}
//         {hover && (() => {
//           const rect = svgRef.current?.getBoundingClientRect();
//           const width = rect?.width ?? 1000;
//           const plotW = width - 24;
//           const x = 12 + xFromMs(hover.ms, plotW);

//           // Keep tooltip within bounds roughly
//           const tx = clamp(x, 80, width - 80);

//           return (
//             <g>
//               <rect x={tx - 140} y={24} width={280} height={28} rx={6} fill="#fff" stroke="#ddd" />
//               <text x={tx} y={42} fontSize="11" textAnchor="middle" fill="#222">
//                 {niceTimeLabel(hover.ms)} — {hover.e.subsystem} — {hover.e.type} — {hover.e.severity}
//               </text>
//             </g>
//           );
//         })()}
//       </svg>
//     </div>
//   );
// }

function VerticalMETTimelineLanes({ events, selectedId, onSelect }) {
  // MET window (seconds)
  const [windowS, setWindowS] = useState(600); // 10 minutes
  const [centerS, setCenterS] = useState(0);

  const svgRef = useRef(null);
  const dragRef = useRef({ dragging: false, startY: 0, startCenter: 0 });

  // Build lane list from buffered events (stable ordering)
  const lanes = useMemo(() => {
    const set = new Set();
    for (const e of events) if (e?.subsystem) set.add(String(e.subsystem));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [events]);

  const laneIndex = useMemo(() => {
    const m = new Map();
    lanes.forEach((s, i) => m.set(s, i));
    return m;
  }, [lanes]);

  // Follow latest MET gently
  useEffect(() => {
    if (events.length === 0) return;
    const newest = events[0]?.mission_time_s;
    if (typeof newest !== "number") return;

    const half = windowS / 2;
    if (newest > centerS + half * 0.8) setCenterS(newest);
  }, [events, windowS]); // intentionally not depending on centerS (avoid chasing)

  const topS = centerS + windowS / 2;
  const bottomS = centerS - windowS / 2;

  function yFromMET(met, height) {
    return ((topS - met) / (topS - bottomS)) * height;
  }
  function metFromY(y, height) {
    return topS - (y / height) * (topS - bottomS);
  }

  const onWheel = (e) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const h = rect.height;
    const anchorMET = metFromY(y, h);

    const zoom = e.deltaY < 0 ? 0.8 : 1.25;
    const nextWindow = Math.min(Math.max(windowS * zoom, 10), 6 * 3600); // 10s .. 6h

    const t = (anchorMET - bottomS) / (topS - bottomS); // 0..1
    const nextCenter = anchorMET + (0.5 - t) * nextWindow;

    setWindowS(nextWindow);
    setCenterS(nextCenter);
  };

  const onMouseDown = (e) => {
    dragRef.current = { dragging: true, startY: e.clientY, startCenter: centerS };
  };
  const onMouseMove = (e) => {
    if (!dragRef.current.dragging) return;
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const dy = e.clientY - dragRef.current.startY;
    const metPerPx = (topS - bottomS) / rect.height;
    setCenterS(dragRef.current.startCenter + dy * metPerPx);
  };
  const onMouseUp = () => (dragRef.current.dragging = false);

  const height = 460;
  const leftPad = 110; // for MET tick labels
  const rightPad = 12;

  return (
    <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12, background: "#000" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ color: "#fff" }}>
          <b>MET Timeline (lanes)</b>{" "}
          <span style={{ opacity: 0.75 }}>
            (wheel=zoom, drag=pan)
          </span>
        </div>
        <div style={{ fontFamily: "monospace", color: "#bbb" }}>
          {Math.round(bottomS)}s → {Math.round(topS)}s • lanes: {lanes.length}
        </div>
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height={height}
        style={{
          marginTop: 10,
          background: "#000",
          borderRadius: 10,
          cursor: "grab",
          border: "1px solid #222",
        }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* Compute lane geometry based on actual rendered width */}
        {(() => {
          const rect = svgRef.current?.getBoundingClientRect();
          const width = rect?.width ?? 900;
          const plotW = Math.max(200, width - leftPad - rightPad);
          const laneCount = Math.max(1, lanes.length);
          const laneW = plotW / laneCount;

          const xLaneCenter = (laneName) => {
            const idx = laneIndex.get(laneName) ?? 0;
            return leftPad + laneW * (idx + 0.5);
          };

          // Ticks (6)
          const ticks = Array.from({ length: 7 }, (_, i) => bottomS + (i / 6) * (topS - bottomS));

          return (
            <g>
              {/* Lane separators + headers */}
              {lanes.map((lane, i) => {
                const x0 = leftPad + i * laneW;
                const x1 = x0 + laneW;
                return (
                  <g key={lane}>
                    {/* lane band outline */}
                    <rect x={x0} y={0} width={laneW} height={height} fill="none" stroke="#1f1f1f" />
                    {/* header */}
                    <text
                      x={(x0 + x1) / 2}
                      y={16}
                      fontSize="11"
                      textAnchor="middle"
                      fill="#bbb"
                      style={{ userSelect: "none" }}
                    >
                      {lane}
                    </text>
                    {/* subtle divider line at header bottom */}
                    <line x1={x0} y1={24} x2={x1} y2={24} stroke="#222" />
                  </g>
                );
              })}

              {/* MET tick marks and horizontal grid lines */}
              {ticks.map((t, i) => {
                const y = yFromMET(t, height);
                return (
                  <g key={i}>
                    <line x1={leftPad} y1={y} x2={leftPad + plotW} y2={y} stroke="#111" />
                    <text
                      x={leftPad - 10}
                      y={y + 4}
                      fontSize="10"
                      textAnchor="end"
                      fill="#aaa"
                      fontFamily="monospace"
                      style={{ userSelect: "none" }}
                    >
                      {Math.round(t)}s
                    </text>
                    <line x1={leftPad - 6} y1={y} x2={leftPad} y2={y} stroke="#333" />
                  </g>
                );
              })}

{/* Events as colored bars */}
{events.map((e) => {
  if (typeof e?.mission_time_s !== "number") return null;
  const met = e.mission_time_s;
  if (met < bottomS || met > topS) return null;

  const lane = String(e.subsystem || "UNKNOWN");
  if (!laneIndex.has(lane)) return null;

  const y = yFromMET(met, height);
  const idx = laneIndex.get(lane) ?? 0;

  // Lane geometry
  const x0 = leftPad + idx * laneW;
  const x1 = x0 + laneW;

  // Bar geometry
  const barPadX = 6;                 // left/right padding inside lane
  const barW = Math.max(6, (x1 - x0) - 2 * barPadX);
  const barH = 6;                    // thickness of event bar
  const barX = x0 + barPadX;
  const barY = y - barH / 2;

  const isSel = e.id === selectedId;
  const fill = severityColor(e.severity);

  return (
    <g key={e.id} style={{ cursor: "pointer" }} onClick={() => onSelect(e)}>
      <rect
        x={barX}
        y={barY}
        width={barW}
        height={barH}
        rx={2}
        fill={fill}
        opacity={isSel ? 1 : 0.75}
      />
      {/* Selection outline */}
      {isSel && (
        <rect
          x={barX - 2}
          y={barY - 2}
          width={barW + 4}
          height={barH + 4}
          rx={3}
          fill="none"
          stroke="#ffffff"
          strokeWidth={1}
          opacity={0.95}
        />
      )}
    </g>
  );
})}

            </g>
          );
        })()}
      </svg>

      <div style={{ marginTop: 8, color: "#999", fontSize: 12 }}>
        Tip: wheel to zoom time window; drag to scroll MET; click a dot to select.
      </div>
    </div>
  );
}


// tiny deterministic hash for stacking
function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** --- App --- */
export default function App() {
  const [status, setStatus] = useState("disconnected");
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState(null);

  const wsRef = useRef(null);

  useEffect(() => {
    setStatus("connecting");
    const ws = new WebSocket("ws://localhost:12345/ws");
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      ws.send(JSON.stringify({ op: "hello", data: { client: "web", version: "1.0" } }));
    };

    ws.onclose = () => setStatus("disconnected");
    ws.onerror = () => setStatus("error");

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.op === "event") {
        setEvents((prev) => {
          const next = [msg.data, ...prev].slice(0, 2000);
          // Auto-select the newest if nothing selected yet
          if (!selected) setSelected(msg.data);
          return next;
        });
      }
    };

    return () => ws.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedId = selected?.id ?? null;

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ marginTop: 0 }}>Mission Events Display</h2>
      <div style={{ marginBottom: 12 }}>
        Status: <b>{status}</b> • Events buffered: <b>{events.length}</b>
      </div>

<VerticalMETTimelineLanes
  events={events}
  selectedId={selected?.id ?? null}
  onSelect={setSelected}
/>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Event Stream</h3>
          <div style={{ maxHeight: 480, overflow: "auto" }}>
            {events.slice(0, 200).map((e) => (
              <div
                key={e.id}
                onClick={() => setSelected(e)}
                style={{
                  padding: "8px 0",
                  borderBottom: "1px solid #eee",
                  cursor: "pointer",
                  background: e.id === selectedId ? "#f1f1f1" : "transparent",
                }}
              >
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "monospace" }}><b>{e.t_utc}</b></span>
                  <span>{e.subsystem}</span>
                  <span>{e.type}</span>
                  <span>{e.severity}</span>
                </div>
                <div><b>{e.title}</b> — {e.message}</div>
              </div>
            ))}
            {events.length === 0 && <div>No events yet…</div>}
          </div>
        </div>
        
          <div style={{ background: "#000", borderRadius: 10 }}>
            <CubeSatView background="#000" />
          </div>

            <OrbitView
    metS={selected?.mission_time_s ?? 0}
    semiMajorKm={6771}       // ~400 km LEO
    eccentricity={0.001}
    inclinationDeg={51.6}   // ISS-like
  />

        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Selected Event (JSON)</h3>
          <pre style={{ background: "#fafafa", padding: 12, borderRadius: 8, maxHeight: 480, overflow: "auto" }}>
            {selected ? JSON.stringify(selected, null, 2) : "—"}
          </pre>
        </div>

      </div>
    </div>
  );
}
