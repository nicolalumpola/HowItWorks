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
  header.appendChild(title);
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

  panel.appendChild(header);
  panel.appendChild(el('div', 'sep'));
  panel.appendChild(details);
  root.appendChild(panel);

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

  let rafId = 0;
  function startTicker() {
    try {
      if (window.gsap && window.gsap.ticker) {
        window.gsap.ticker.add(update);
        return () => window.gsap.ticker.remove(update);
      }
    } catch (_) {}
    const loop = () => { update(); rafId = requestAnimationFrame(loop); };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }
  let stopTicker = null;

  function update() {
    try {
      const s2 = findS2();
      const st = s2.trigger;
      const tl = s2.tl;
      vScroll.textContent = String(Math.round(window.scrollY || window.pageYOffset || 0)) + ' px';
      vView.textContent = String(window.innerHeight || 0) + ' px';
      const prog = st ? st.progress : 0;
      const isActive = st ? !!st.isActive : false;
      const isPinned = st ? !!st.pin : false;
      vProg.textContent = prog.toFixed(3);
      vActive.textContent = (isActive ? 'true' : 'false') + ' / ' + (isPinned ? 'true' : 'false');
      vLabel.textContent = getLabelAtTime(tl);
      vScreen.textContent = getScreenState();
      vDots.textContent = getDotDirection(tl);
    } catch (_) {}
  }

  // Attach and wire events
  function showInternal() {
    if (!document.body.contains(root)) {
      document.body.appendChild(root);
    }
    root.classList.remove('hidden');
    if (!stopTicker) stopTicker = startTicker();
    try { window.ScrollTrigger && window.ScrollTrigger.addEventListener('refresh', update); } catch (_) {}
    try { window.addEventListener('scroll', update, { passive: true }); } catch (_) {}
    update();
  }
  function hideInternal() {
    root.classList.add('hidden');
    if (stopTicker) { stopTicker(); stopTicker = null; }
    try { window.ScrollTrigger && window.ScrollTrigger.removeEventListener('refresh', update); } catch (_) {}
    try { window.removeEventListener('scroll', update); } catch (_) {}
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
  };
})();

