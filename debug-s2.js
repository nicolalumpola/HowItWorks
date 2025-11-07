/* S2 HUD — beat retimer with controls
   Shows when URL contains ?debug=1
   Requires window.__S2_HOOK__ = { tl, st } from main.js
*/
(() => {
  const params = new URLSearchParams(location.search);
  if (!params.has("debug")) return;

  // ---------- dom helpers
  const el = (tag, props = {}, kids = []) => {
    const n = document.createElement(tag);
    Object.assign(n, props);
    kids.forEach(k => n.appendChild(k));
    return n;
  };
  const css = (n, o) => Object.assign(n.style, o);

  // ---------- styles
  const root = el("div");
  css(root, {
    position: "fixed",
    left: "12px",
    bottom: "12px",
    zIndex: 99999,
    font: "12px/1.4 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    color: "#eee",
    background: "rgba(0,0,0,.6)",
    border: "1px solid rgba(255,255,255,.15)",
    borderRadius: "10px",
    padding: "10px 12px",
    backdropFilter: "blur(4px)",
    pointerEvents: "auto",
    maxWidth: "640px",
  });

  const title = el("div", { innerHTML: "<b>S2 Retimer</b>" });
  css(title, { marginBottom: "6px", fontSize: "12px", letterSpacing: ".2px" });

  // Controls
  const row = (label, inputEl) => {
    const wrap = el("div");
    css(wrap, { display: "grid", gridTemplateColumns: "120px 1fr 56px", gap: "6px", alignItems: "center", margin: "4px 0" });
    const lab = el("div", { textContent: label });
    css(lab, { color: "#ccc" });
    const out = el("div", { textContent: "" });
    css(out, { textAlign: "right", color: "#aaa" });
    inputEl.__out = out;
    wrap.append(lab, inputEl, out);
    return wrap;
  };

  const introRange = el("input", { type: "range", min: "0.30", max: "1.00", step: "0.01", value: "0.55" });
  const entranceDur = el("input", { type: "number", min: "0.01", step: "0.01", value: "0.12" });
  const gapScale = el("input", { type: "range", min: "0.50", max: "1.50", step: "0.01", value: "1.00" });

  const btns = el("div");
  css(btns, { display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" });
  const applyBtn   = el("button", { textContent: "Apply" });
  const refreshBtn = el("button", { textContent: "Refresh Stats" });
  const presetTight = el("button", { textContent: "Preset: Tight Intro" });
  const presetEven  = el("button", { textContent: "Preset: Even" });
  const snapStateBtn = el("button", { textContent: "Enforce state" });

  [applyBtn, refreshBtn, presetTight, presetEven, snapStateBtn].forEach(b => {
    css(b, {
      background: "#222",
      color: "#eee",
      border: "1px solid #333",
      borderRadius: "8px",
      padding: "6px 10px",
      cursor: "pointer"
    });
    b.onmouseenter = () => b.style.background = "#2b2b2b";
    b.onmouseleave = () => b.style.background = "#222";
  });

  const tableWrap = el("div");
  css(tableWrap, { marginTop: "8px", maxHeight: "160px", overflow: "auto", borderTop: "1px solid rgba(255,255,255,.12)", paddingTop: "8px" });

  // footer
  const foot = el("div", { textContent: "Drag panel by its edge · Shift+D to toggle" });
  css(foot, { marginTop: "6px", color: "#888", fontSize: "11px" });

  root.append(
    title,
    row("Intro lead-in", introRange),
    row("Entrance dur (s)", entranceDur),
    row("Gap scale ×", gapScale),
    btns,
    tableWrap,
    foot
  );
  btns.append(applyBtn, refreshBtn, presetTight, presetEven, snapStateBtn);
  document.body.appendChild(root);

  // Draggable (by outer edges)
  let dragging = false, dx=0, dy=0;
  root.addEventListener("mousedown", (e) => {
    const edge = e.offsetX < 10 || e.offsetX > root.clientWidth-10 || e.offsetY < 10 || e.offsetY > root.clientHeight-10;
    if (!edge) return;
    dragging = true; dx = e.clientX - root.offsetLeft; dy = e.clientY - root.offsetTop; e.preventDefault();
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    css(root, { left: Math.max(6, e.clientX - dx) + "px", bottom: "auto", top: Math.max(6, e.clientY - dy) + "px" });
  });
  window.addEventListener("mouseup", () => dragging = false);

  // Toggle
  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "d" && e.shiftKey) {
      root.style.display = (root.style.display === "none" ? "block" : "none");
    }
  });

  // Display helpers
  const fmt = (x, p=3) => (+x).toFixed(p);
  const setOut = (inp, txt) => inp.__out && (inp.__out.textContent = txt);

  const hook = () => window.__S2_HOOK__;
  const tl = () => hook()?.tl;

  function listStats() {
    const _tl = tl();
    if (!_tl) { tableWrap.innerHTML = "<div style='color:#f66'>No timeline yet</div>"; return; }
    const L = Object.entries(_tl.labels).sort((a,b)=>a[1]-b[1]);
    const total = _tl.duration();
    let html = "<table style='width:100%;border-collapse:collapse'><thead><tr>" +
      "<th style='text-align:left;padding:2px 4px'>idx</th>" +
      "<th style='text-align:left;padding:2px 4px'>label</th>" +
      "<th style='text-align:right;padding:2px 4px'>t</th>" +
      "<th style='text-align:right;padding:2px 4px'>gap</th>" +
      "<th style='text-align:right;padding:2px 4px'>%</th>" +
      "</tr></thead><tbody>";
    for (let i=0;i<L.length;i++){
      const [name,t] = L[i];
      const gap = i? (t-L[i-1][1]) : 0;
      html += `<tr>
        <td style="padding:2px 4px;color:#bbb">${i}</td>
        <td style="padding:2px 4px">${name}</td>
        <td style="padding:2px 4px;text-align:right">${fmt(t)}</td>
        <td style="padding:2px 4px;text-align:right">${fmt(gap)}</td>
        <td style="padding:2px 4px;text-align:right">${fmt(t/total*100,1)}</td>
      </tr>`;
    }
    html += "</tbody></table>";
    tableWrap.innerHTML = html;
  }

  // Live compute outputs
  const updateReadouts = () => {
    setOut(introRange, (introRange.value*1).toFixed(2)+" × gap");
    setOut(entranceDur, entranceDur.value+" s");
    setOut(gapScale,   (gapScale.value*1).toFixed(2)+" ×");
  };
  introRange.oninput = entranceDur.oninput = gapScale.oninput = updateReadouts;
  updateReadouts();

  // Core retime (self-contained; does not rely on code inside main.js)
  function retime(INTRO_FRACTION, ENTRANCE, GAP_SCALE=1) {
    const _tl = tl();
    if (!_tl) return;
    const marks = ["phoneAntennaIn","incomingPhase","connectedPhase","connectedIdle"];
    const D = _tl.duration();
    const N = marks.length;

    // Equal gap baseline (optionally scaled)
    const GAP = (D / (N + 1)) * GAP_SCALE;

    // Positions: shorter first gap, then equal gaps
    const FIRST = GAP * INTRO_FRACTION;
    const targets = [FIRST, FIRST + GAP, FIRST + 2*GAP, FIRST + 3*GAP];

    marks.forEach((m,i)=>_tl.addLabel(m, targets[i]));
    if (_tl.labels.incomingPhaseEnd != null) {
      _tl.addLabel("incomingPhaseEnd", _tl.labels.incomingPhase);
    }

    // Find idle tweens that start at these labels
    const tweenAt = (label) => {
      const t = _tl.labels[label];
      return _tl.getChildren(true,true,true)
        .find(k => Math.abs(k.startTime() - t) < 1e-6 && (k.duration?.()||0) > 0) || null;
    };

    const tPA = _tl.labels.phoneAntennaIn, tIP = _tl.labels.incomingPhase, tCP = _tl.labels.connectedPhase;

    const d1 = Math.max(0.0001, tIP - (tPA + ENTRANCE)); // idleAfterPhone
    const d2 = Math.max(0.0001, tCP -  tIP);             // incomingIdle
    const d3 = Math.max(0.0001, D   -  tCP);             // connectedIdle

    tweenAt("idleAfterPhone")?.duration(d1);
    tweenAt("incomingIdle")?.duration(d2);
    tweenAt("connectedIdle")?.duration(d3);

    // Make ScrollTrigger honor the new timing
    try { window.ScrollTrigger && ScrollTrigger.refresh(); } catch {}

    return { D, GAP, FIRST, d1, d2, d3 };
  }

  // Buttons
  applyBtn.onclick = () => {
    retime(+introRange.value, +entranceDur.value, +gapScale.value);
    listStats();
  };
  refreshBtn.onclick = listStats;
  presetTight.onclick = () => { introRange.value = "0.45"; updateReadouts(); applyBtn.click(); };
  presetEven.onclick  = () => { introRange.value = "1.00"; updateReadouts(); applyBtn.click(); };

  // "Enforce state" like your previous HUD (sets visibility to match current label)
  snapStateBtn.onclick = () => {
    const _tl = tl();
    if (!_tl) return;
    const t = _tl.time();
    _tl.time(t); // re-apply sets at this instant
    try { ScrollTrigger && ScrollTrigger.refresh(); } catch {}
    listStats();
  };

  // Initial draw (wait for main to expose hook)
  const wait = setInterval(() => {
    if (tl()) {
      clearInterval(wait);
      listStats();
    }
  }, 50);
})();
