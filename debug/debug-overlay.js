/* S2 Debug Overlay (self-contained, optional) */
(function () {
  if (window.__S2_DEBUG__) return; // already loaded

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // Resolve S2 timeline and ScrollTrigger
  function findS2() {
    try {
      if (window.__S2__ && window.__S2__.tl && window.__S2__.trigger) {
        return { tl: window.__S2__.tl, trigger: window.__S2__.trigger };
      }
      if (window.ScrollTrigger) {
        const section = document.getElementById('section-s2');
        const all = window.ScrollTrigger.getAll();
        for (const t of all) {
          if (!t) continue;
          // Check pinned trigger whose trigger element is or contains the section
          const trg = t.trigger || t.vars?.trigger;
          if (!trg) continue;
          const el = trg.nodeType ? trg : document.querySelector(trg);
          if (!el) continue;
          if (el === section || (section && section.contains(el))) {
            // Prefer the scrubbed pin (has animation or scrub)
            if (t.vars && (t.vars.pin || t.vars.scrub || t.animation)) {
              return { tl: t.animation || null, trigger: t };
            }
          }
        }
      }
    } catch (_) {}
    return { tl: null, trigger: null };
  }

  function getLabelAtTime(tl) {
    if (!tl) return '—';
    const labels = tl.labels || {};
    let active = '—';
    let bestTime = -Infinity;
    const now = typeof tl.time === 'function' ? tl.time() : 0;
    for (const name in labels) {
      const t = labels[name];
      if (t <= now && t >= bestTime) {
        bestTime = t;
        active = name;
      }
    }
    return active;
  }

  function getScreenState() {
    try {
      const root = document.querySelector('#phoneMount svg');
      if (!root) return 'Unknown';
      const sel = (arr) => {
        for (const s of arr) {
          const n = root.querySelector(s);
          if (n) return n;
        }
        return null;
      };
      const black = sel(['#Blank-Screen', "#blank-screen", '#Blank', "[id='Blank-Screen']"]);
      const out = sel(['#Outgoing-Screen', '#Screen-Outgoing', "[id='Outgoing-Screen']"]);
      const inc = sel(['#Incoming-Screen', '#Screen-Incoming', "[id='Incoming-Screen']"]);
      const getOp = (n) => (n ? parseFloat(getComputedStyle(n).opacity || '0') : 0);
      const ob = getOp(black), oo = getOp(out), oi = getOp(inc);
      const max = Math.max(ob, oo, oi);
      if (max <= 0.01) return 'Unknown';
      if (max === oo) return 'Outgoing';
      if (max === oi) return 'Incoming';
      return 'Blank';
    } catch (_) {
      return 'Unknown';
    }
  }

  function getDotDirection(tl) {
    if (!tl) return 'idle';
    const L = tl.labels || {};
    const now = typeof tl.time === 'function' ? tl.time() : 0;
    const outT = L.outgoingPhase ?? Infinity;
    const inT = L.incomingPhase ?? Infinity;
    if (isFinite(inT) && now >= inT) return 'R→L';
    if (isFinite(outT) && now >= outT) return 'L→R';
    return 'idle';
  }

  // UI
  const root = el('div');
  root.id = 's2-debug-overlay';
  root.className = 'collapsed hidden';

  const panel = el('div', 'panel');
  const header = el('div', 'header');
  const title = el('div', 'title', 'S2 Debug');
  const gear = el('div', 'gear', '⚙︎');
  const fpsBadge = el('div', 'fps-badge', '— fps');
  const scrubToggle = el('div', 'toggle', 'Scrub');
  header.appendChild(title);
  header.appendChild(fpsBadge);
  header.appendChild(scrubToggle);
  header.appendChild(gear);

  const details = el('div', 'details');
  function row(key, ref) {
    const r = el('div', 'row');
    r.appendChild(el('div', 'key', key));
    const v = el('div', 'val', '—');
    r.appendChild(v);
    details.appendChild(r);
    return v;
  }

  const vScroll = row('Scroll Y', null);
  const vView = row('Viewport H', null);
  const vProg = row('S2 progress', null);
  const vActive = row('isActive / isPinned', null);
  const vLabel = row('Label', null);
  const vScreen = row('Phone screen', null);
  const vDots = row('Dot direction', null);
  const vFps = row('FPS (inst / avg)', null);

  panel.appendChild(header);
  panel.appendChild(el('div', 'sep'));
  panel.appendChild(details);
  root.appendChild(panel);

  // Scrub UI
  const scrubWrap = el('div', 'scrub hidden');
  const track = el('div', 'scrub-track');
  const playhead = el('div', 'scrub-playhead');
  const hint = el('div', 'scrub-hint');
  hint.style.display = 'none';
  track.appendChild(playhead);
  track.appendChild(hint);
  scrubWrap.appendChild(track);
  panel.appendChild(scrubWrap);

  function setCollapsed(collapsed) {
    if (collapsed) root.classList.add('collapsed');
    else root.classList.remove('collapsed');
  }

  // Toggle collapsed via gear
  gear.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    root.classList.toggle('collapsed');
  });

  // Scrub toggle UI + shortcut
  function setScrubVisible(on) {
    if (on) { scrubWrap.classList.remove('hidden'); scrubToggle.classList.add('on'); }
    else { scrubWrap.classList.add('hidden'); scrubToggle.classList.remove('on'); }
  }
  scrubToggle.addEventListener('click', function (e) {
    e.preventDefault(); e.stopPropagation();
    const on = scrubWrap.classList.contains('hidden');
    setScrubVisible(on);
  });

  // FPS tracking
  let rafId = 0;
  let lastNow = performance.now();
  let fpsEMA = 0; // smoothed fps
  const alpha = 0.15;
  let lastRender = 0;
  const minRenderMs = 85; // ~12 fps DOM updates

  function startTicker() {
    try {
      if (window.gsap && window.gsap.ticker) {
        const onTick = () => {
          const now = performance.now();
          const dt = (now - lastNow) / 1000;
          lastNow = now;
          const instFps = dt > 0 ? 1 / dt : 60;
          fpsEMA = fpsEMA ? (alpha * instFps + (1 - alpha) * fpsEMA) : instFps;
          loopUpdate(now, instFps, fpsEMA);
        };
        window.gsap.ticker.add(onTick);
        return () => window.gsap.ticker.remove(onTick);
      }
    } catch (_) {}
    const loop = () => {
      const now = performance.now();
      const dt = (now - lastNow) / 1000;
      lastNow = now;
      const instFps = dt > 0 ? 1 / dt : 60;
      fpsEMA = fpsEMA ? (alpha * instFps + (1 - alpha) * fpsEMA) : instFps;
      loopUpdate(now, instFps, fpsEMA);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }
  let stopTicker = null;

  function loopUpdate(now, instFps, avgFps) {
    try {
      const s2 = findS2();
      const st = s2.trigger;
      const tl = s2.tl;
      // Always keep FPS badge fresh (throttled)
      if (now - lastRender >= minRenderMs || root.classList.contains('hidden')) {
        fpsBadge.textContent = `${Math.round(instFps)} fps`;
      }

      const isHidden = root.classList.contains('hidden');
      const isCollapsed = root.classList.contains('collapsed');

      // Skip heavy updates when hidden; when collapsed, only FPS badge
      if (isHidden) return;
      if (isCollapsed) return;

      if (now - lastRender < minRenderMs) {
        return; // throttle full renders
      }
      lastRender = now;

      // Basic info
      vScroll.textContent = String(Math.round(window.scrollY || window.pageYOffset || 0)) + ' px';
      vView.textContent = String(window.innerHeight || 0) + ' px';
      const prog = st ? st.progress : (tl && typeof tl.progress === 'function' ? tl.progress() : 0);
      const isActive = st ? !!st.isActive : false;
      const isPinned = st ? !!st.pin : false;
      vProg.textContent = prog.toFixed(3);
      vActive.textContent = (isActive ? 'true' : 'false') + ' / ' + (isPinned ? 'true' : 'false');
      vLabel.textContent = getLabelAtTime(tl);
      vScreen.textContent = getScreenState();
      vDots.textContent = getDotDirection(tl);
      vFps.textContent = `${Math.round(instFps)} / ${Math.round(avgFps)}`;

      // Scrub visuals
      if (!scrubWrap.classList.contains('hidden')) {
        updatePlayhead(prog);
        highlightNearestLabel(tl);
      }
    } catch (_) {}
  }

  // Attach and wire events
  function showInternal() {
    if (!document.body.contains(root)) {
      document.body.appendChild(root);
    }
    root.classList.remove('hidden');
    if (!stopTicker) stopTicker = startTicker();
    try { window.ScrollTrigger && window.ScrollTrigger.addEventListener('refresh', rebuildScrub); } catch (_) {}
    try { window.addEventListener('resize', rebuildScrub, { passive: true }); } catch (_) {}
    rebuildScrub();
  }
  function hideInternal() {
    root.classList.add('hidden');
    if (stopTicker) { stopTicker(); stopTicker = null; }
    try { window.ScrollTrigger && window.ScrollTrigger.removeEventListener('refresh', rebuildScrub); } catch (_) {}
    try { window.removeEventListener('resize', rebuildScrub); } catch (_) {}
  }

  // Public API
  window.__S2_DEBUG__ = {
    show: function () {
      try { window.localStorage.setItem('DEBUG_S2', '1'); } catch (_) {}
      setCollapsed(true); // default collapsed
      showInternal();
    },
    hide: function () {
      try { window.localStorage.removeItem('DEBUG_S2'); } catch (_) {}
      hideInternal();
    },
    toggle: function () {
      if (root.classList.contains('hidden')) this.show();
      else this.hide();
    },
    toggleScrub: function () {
      const on = scrubWrap.classList.contains('hidden');
      setScrubVisible(on);
    },
  };

  // Shift+S toggles scrub visibility
  try {
    window.addEventListener('keydown', function (e) {
      if (e.key === 'S' && e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        window.__S2_DEBUG__ && window.__S2_DEBUG__.toggleScrub();
      }
    }, { passive: false });
  } catch (_) {}

  // Scrub helpers
  function rebuildScrub() {
    // Clear existing markers
    const exist = track.querySelectorAll('.scrub-marker');
    exist.forEach((n) => n.remove());
    const s2 = findS2();
    const tl = s2.tl;
    if (!tl || typeof tl.duration !== 'function') return;
    const dur = tl.duration();
    if (!(dur > 0)) return;
    // Build markers from labels
    const labels = tl.labels || {};
    const pairs = Object.keys(labels).map((name) => ({ name, t: labels[name] })).sort((a, b) => a.t - b.t);
    for (const p of pairs) {
      const ratio = Math.max(0, Math.min(1, p.t / dur));
      const m = el('div', 'scrub-marker');
      m.title = p.name;
      m.style.left = `calc(${(ratio * 100).toFixed(3)}% - 1px)`;
      track.appendChild(m);
    }
  }

  function highlightNearestLabel(tl) {
    const markers = track.querySelectorAll('.scrub-marker');
    markers.forEach((m) => m.classList.remove('active'));
    if (!tl) return;
    const labels = tl.labels || {};
    const now = typeof tl.time === 'function' ? tl.time() : 0;
    let best = null;
    for (const name in labels) {
      const t = labels[name];
      if (t <= now && (!best || t >= best.t)) best = { name, t };
    }
    if (!best) return;
    for (const m of markers) {
      if (m.title === best.name) { m.classList.add('active'); break; }
    }
  }

  function updatePlayhead(progress) {
    const x = Math.max(0, Math.min(1, progress || 0));
    playhead.style.left = `calc(${(x * 100).toFixed(3)}% - 1px)`;
  }

  // Drag to scrub
  (function enableScrubDrag() {
    let dragging = false;
    function ratioFromEvent(evt) {
      const rect = track.getBoundingClientRect();
      const x = Math.max(rect.left, Math.min(rect.right, evt.clientX));
      const r = (x - rect.left) / Math.max(1, rect.width);
      return Math.max(0, Math.min(1, r));
    }
    function nearestLabelAtRatio(ratio) {
      const s2 = findS2();
      const tl = s2.tl;
      if (!tl) return null;
      const dur = tl.duration ? tl.duration() : 0;
      const targetT = ratio * dur;
      const labels = tl.labels || {};
      let best = null;
      for (const name in labels) {
        const t = labels[name];
        if (t <= targetT && (!best || t >= best.t)) best = { name, t };
      }
      return best ? best.name : null;
    }
    function scrollToRatio(ratio) {
      const s2 = findS2();
      const st = s2.trigger;
      if (!st) return;
      const start = st.start;
      const end = st.end;
      const target = start + ratio * (end - start);
      const scroller = st.scroller || window;
      if (scroller === window || scroller === document || scroller === document.documentElement || scroller === document.body) {
        window.scrollTo({ top: target, left: 0, behavior: 'auto' });
      } else {
        try { scroller.scrollTop = target; } catch (_) {}
      }
    }
    function onDown(e) {
      dragging = true;
      track.setPointerCapture && track.setPointerCapture(e.pointerId || 0);
      onMove(e);
      e.preventDefault(); e.stopPropagation();
    }
    function onMove(e) {
      if (!dragging) return;
      const r = ratioFromEvent(e);
      scrollToRatio(r);
      const name = nearestLabelAtRatio(r) || '';
      hint.textContent = name;
      hint.style.display = name ? 'block' : 'none';
      hint.style.left = `calc(${(r * 100).toFixed(3)}% - 0px)`;
      // Immediate visual feedback
      updatePlayhead(r);
    }
    function onUp(e) {
      dragging = false;
      hint.style.display = 'none';
      e.preventDefault(); e.stopPropagation();
    }
    try {
      track.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      // Click (non-pointer) fallback
      track.addEventListener('mousedown', (e) => { onDown(e); });
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    } catch (_) {}
  })();
})();
