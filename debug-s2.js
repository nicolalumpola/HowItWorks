// debug-s2.js
// S2 HUD (separate file): progress bar + label ticks + current label
// Usage: add ?hud=1 to URL. Expects window.__S2_HOOK__ { tl, st } or 's2:ready' event.

let killHUD = null;

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
  document.body.appendChild(hud);

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

