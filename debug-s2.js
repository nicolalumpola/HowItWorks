// debug-s2.js
// S2 HUD (separate file): progress bar + label ticks + current label
// Usage: add ?hud=1 to URL. Expects window.__S2_HOOK__ { tl, st } or 's2:ready' event.

let killHUD = null;

const COLORS = { topoBase: "#634729", orange: "#F5A145", white: "#FFFFFF" };

function buildHUD(tl, st) {
  const total = tl.duration();
  const labels = Object.entries(tl.labels)
    .map(([name, t]) => ({ name, t, x: (t / total) * 100 }))
    .sort((a, b) => a.t - b.t);

  const hud = document.createElement("div");
  hud.id = "s2-debug-hud";
  hud.style.cssText = [
    "position:fixed",
    "left:12px",
    "right:12px",
    "bottom:12px",
    "z-index:99999",
    "pointer-events:none",
    "font:12px/1.2 ui-monospace, Menlo, Consolas, monospace",
    "color:#fff",
    "opacity:0.9",
  ].join(";");

  const card = document.createElement("div");
  card.style.cssText = [
    "background:rgba(0,0,0,0.4)",
    "backdrop-filter:saturate(140%) blur(6px)",
    "border:1px solid rgba(255,255,255,0.15)",
    "border-radius:10px",
    "padding:8px 10px",
    "box-shadow:0 6px 14px rgba(0,0,0,0.35)",
  ].join(";");

  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.justifyContent = "space-between";
  row.style.gap = "10px";

  const labelEl = document.createElement("span");
  const progEl = document.createElement("span");
  labelEl.textContent = "label: —";
  progEl.textContent = "progress: 0.000";
  row.append(labelEl, progEl);

  const barWrap = document.createElement("div");
  barWrap.style.cssText = [
    "position:relative",
    "margin-top:6px",
    "height:8px",
    "border-radius:999px",
    "background:rgba(255,255,255,0.12)",
    "overflow:hidden",
  ].join(";");

  const bar = document.createElement("div");
  bar.style.cssText = [
    "position:absolute",
    "left:0; top:0; bottom:0",
    "width:0%",
    "background:linear-gradient(90deg,#f5a145,#fff)",
  ].join(";");
  barWrap.appendChild(bar);

  // label ticks + tags
  for (const L of labels) {
    const tick = document.createElement("div");
    tick.title = `${L.name} @ ${L.t.toFixed(2)}s`;
    tick.style.cssText = [
      "position:absolute",
      `left:${L.x.toFixed(3)}%`,
      "top:-3px",
      "bottom:-3px",
      "width:2px",
      "background:#f5a145",
      "opacity:0.9",
    ].join(";");
    barWrap.appendChild(tick);

    const tag = document.createElement("div");
    tag.textContent = L.name;
    tag.style.cssText = [
      "position:absolute",
      `left:calc(${L.x.toFixed(3)}% + 4px)`,
      "top:-18px",
      "white-space:nowrap",
      "font-size:10px",
      "text-shadow:0 1px 2px rgba(0,0,0,0.6)",
    ].join(";");
    barWrap.appendChild(tag);
  }

  card.append(row, barWrap);
  hud.appendChild(card);

  // --- Inspector + Enforcer panel (interactive)
  const panel = document.createElement("div");
  panel.style.cssText = [
    "margin-top:8px",
    "background:rgba(0,0,0,0.4)",
    "backdrop-filter:saturate(140%) blur(6px)",
    "border:1px solid rgba(255,255,255,0.15)",
    "border-radius:10px",
    "padding:8px 10px",
    "box-shadow:0 6px 14px rgba(0,0,0,0.35)",
    "pointer-events:auto",
  ].join(";");

  const line = (label) => {
    const row = document.createElement("div");
    row.style.cssText = "display:flex; align-items:center; gap:8px; margin:4px 0;";
    const k = document.createElement("span");
    k.style.cssText = "opacity:0.8; min-width:110px;";
    k.textContent = label;
    const v = document.createElement("span");
    v.style.cssText = "font-weight:600";
    row.append(k, v);
    panel.appendChild(row);
    return v;
  };

  const curLabelEl = line("Current Label");
  const screensEl = line("Screens (O/I/C)");
  const dotsEl = line("Dot Direction");

  const swatchRow = document.createElement("div");
  swatchRow.style.cssText = "display:flex; gap:10px; align-items:center; margin:4px 0;";
  const makeSwatch = (name) => {
    const wrap = document.createElement("div");
    const k = document.createElement("span");
    k.textContent = name;
    k.style.cssText = "opacity:0.8; min-width:110px;";
    const box = document.createElement("span");
    box.style.cssText = "display:inline-block; width:18px; height:12px; border-radius:3px; border:1px solid rgba(255,255,255,0.35); vertical-align:middle;";
    const val = document.createElement("span");
    val.style.cssText = "margin-left:6px;";
    wrap.style.cssText = "display:flex; align-items:center; gap:8px;";
    wrap.append(k, box, val);
    panel.appendChild(wrap);
    return { box, val };
  };
  const phoneSw = makeSwatch("Topo Phone");
  const antSw = makeSwatch("Topo Antenna");
  const antFillSw = makeSwatch("Antenna Fill");

  const enforceWrap = document.createElement("label");
  enforceWrap.style.cssText = "display:flex; align-items:center; gap:8px; margin-top:6px; user-select:none;";
  const enforceCb = document.createElement("input");
  enforceCb.type = "checkbox";
  const enforceText = document.createElement("span");
  enforceText.textContent = "Enforce state at labels";
  enforceWrap.append(enforceCb, enforceText);
  panel.appendChild(enforceWrap);

  hud.appendChild(panel);
  document.body.appendChild(hud);

  // --- Targets and helpers
  const phoneSVG = document.querySelector("#phoneMount svg");
  const topoSVG = document.querySelector("#topoMount svg");
  const antennaSVG = document.querySelector("#antennaMount svg");
  const q = (root, arr) => {
    for (const s of arr) {
      const n = root?.querySelector(s);
      if (n) return n;
    }
    return null;
  };
  const screenOut = q(phoneSVG, [
    "#Outgoing-Screen",
    "#Screen-Outgoing",
    "[id='Outgoing-Screen']",
  ]);
  const screenIn = q(phoneSVG, [
    "#Incoming-Screen",
    "#Screen-Incoming",
    "[id='Incoming-Screen']",
  ]);
  const screenConn = q(phoneSVG, [
    "#Connected-Screen",
    "#Screen-Connected",
    "[id='Connected-Screen']",
  ]);
  const phoneTopo = topoSVG?.querySelectorAll("#topo-phone *");
  const antTopo = topoSVG?.querySelectorAll("#topo-antenna *");
  const antFill = antennaSVG?.querySelectorAll("#antenna-fill, #antenna-fill *");

  const getPhase = () => {
    const t = tl.time();
    const tIncoming = tl.labels?.incomingPhase ?? Number.POSITIVE_INFINITY;
    const tConnected = tl.labels?.connectedPhase ?? Number.POSITIVE_INFINITY;
    if (t < tIncoming) return "OUTGOING";
    if (t < tConnected) return "INCOMING";
    return "CONNECTED";
  };

  let dotDir = 1;
  const setDotDir = (d) => {
    dotDir = d >= 0 ? 1 : -1;
    try {
      // best-effort: if streams are global (unlikely), update them
      (window.leftStream?.setDirection && window.leftStream.setDirection(dotDir));
      (window.rightStream?.setDirection && window.rightStream.setDirection(dotDir));
    } catch {}
  };

  function enforce() {
    const phase = getPhase();
    if (phase === "OUTGOING") {
      screenOut && gsap.set(screenOut, { opacity: 1 });
      gsap.set([screenIn, screenConn].filter(Boolean), { opacity: 0 });
      setDotDir(1);
      phoneTopo?.forEach((n) => {
        n.setAttribute("stroke", COLORS.orange);
        n.setAttribute("fill", COLORS.orange);
      });
      antTopo?.forEach((n) => {
        n.setAttribute("stroke", COLORS.topoBase);
        n.setAttribute("fill", COLORS.topoBase);
      });
      antFill?.forEach((n) => n.setAttribute("fill", COLORS.white));
    } else if (phase === "INCOMING") {
      screenIn && gsap.set(screenIn, { opacity: 1 });
      gsap.set([screenOut, screenConn].filter(Boolean), { opacity: 0 });
      setDotDir(-1);
      phoneTopo?.forEach((n) => {
        n.setAttribute("stroke", COLORS.topoBase);
        n.setAttribute("fill", COLORS.topoBase);
      });
      antTopo?.forEach((n) => {
        n.setAttribute("stroke", COLORS.orange);
        n.setAttribute("fill", COLORS.orange);
      });
      antFill?.forEach((n) => n.setAttribute("fill", COLORS.orange));
    } else {
      // CONNECTED
      screenConn && gsap.set(screenConn, { opacity: 1 });
      gsap.set([screenOut, screenIn].filter(Boolean), { opacity: 0 });
      setDotDir(-1);
      // colors same as INCOMING
      phoneTopo?.forEach((n) => {
        n.setAttribute("stroke", COLORS.topoBase);
        n.setAttribute("fill", COLORS.topoBase);
      });
      antTopo?.forEach((n) => {
        n.setAttribute("stroke", COLORS.orange);
        n.setAttribute("fill", COLORS.orange);
      });
      antFill?.forEach((n) => n.setAttribute("fill", COLORS.orange));
    }
  }

  function currentLabelName(time) {
    let best = null;
    for (const L of labels) if (L.t <= time) best = L;
    return best ? best.name : "—";
  }

  function render() {
    const p = st?.progress ?? 0;
    const t = tl.time();
    bar.style.width = (p * 100).toFixed(3) + "%";
    progEl.textContent = `progress: ${p.toFixed(3)}  (t=${t.toFixed(2)} / ${total.toFixed(2)}s)`;
    labelEl.textContent = `label: ${currentLabelName(t)}`;

    // inspector values
    curLabelEl.textContent = currentLabelName(t);
    const getOpacity = (el) => {
      if (!el) return "—";
      const styleOp = (el.style?.opacity ?? "");
      const a = el.getAttribute && el.getAttribute("opacity");
      const v = styleOp || a || "";
      return v === "" ? (getComputedStyle(el).opacity ?? "?") : v;
    };
    screensEl.textContent = `${getOpacity(screenOut)} / ${getOpacity(screenIn)} / ${getOpacity(screenConn)}`;
    dotsEl.textContent = dotDir >= 0 ? "→" : "←";
    // sample first nodes for color labels
    const sample = (nodes) => {
      const n = nodes && nodes[0];
      if (!n) return { stroke: "?", fill: "?" };
      return { stroke: n.getAttribute("stroke") || "?", fill: n.getAttribute("fill") || "?" };
    };
    const pS = sample(phoneTopo);
    const aS = sample(antTopo);
    const aF = sample(antFill);
    phoneSw.box.style.background = pS.fill;
    phoneSw.val.textContent = pS.fill?.toUpperCase() || "?";
    antSw.box.style.background = aS.fill;
    antSw.val.textContent = aS.fill?.toUpperCase() || "?";
    antFillSw.box.style.background = aF.fill;
    antFillSw.val.textContent = aF.fill?.toUpperCase() || "?";

    if (enforceCb.checked) enforce();
  }

  // updates
  st?.animation?.eventCallback("onUpdate", render);
  gsap?.ticker?.add(render);
  render();

  // hotkey: Shift+D
  const onKey = (e) => {
    if (e.shiftKey && (e.key === "D" || e.key === "d")) {
      hud.style.display = hud.style.display === "none" ? "block" : "none";
    }
  };
  window.addEventListener("keydown", onKey);

  return () => {
    try { gsap?.ticker?.remove(render); } catch {}
    window.removeEventListener("keydown", onKey);
    hud.remove();
  };
}

function tryInit() {
  const hook = window.__S2_HOOK__;
  if (hook?.tl && hook?.st) {
    if (killHUD) { killHUD(); killHUD = null; }
    killHUD = buildHUD(hook.tl, hook.st);
    return true;
  }
  return false;
}

// public entry
export function installHUD() {
  // try immediately (in case S2 is already ready)
  if (tryInit()) return;

  // otherwise wait for S2 to announce readiness
  const onReady = () => {
    tryInit();
  };
  window.addEventListener("s2:ready", onReady, { once: true });

  // cleanup on reload/hot-replace
  window.addEventListener("beforeunload", () => {
    if (killHUD) { killHUD(); killHUD = null; }
  });
}
