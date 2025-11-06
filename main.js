/* Scene S2 – phone-v2 screens + solid topo + symmetric idles and tail hold
   — Pre-pin clamps scroll at start until assets are ready (no jump ahead)
   — Temporary input suppression (wheel/touch/space/page) during preload
   — Final scrubbed trigger attaches once timeline exists
*/
(() => {
  // -------- teardown for hot reloads
  try {
    if (window.__s2_cleanup__) window.__s2_cleanup__();
  } catch {}
  let __teardowns = [];
  window.__s2_cleanup__ = () => {
    try {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    } catch {}
    try {
      gsap.globalTimeline.clear();
    } catch {}
    __teardowns.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
    __teardowns = [];
  };

  // -------- constants
  const COLORS = { topoBase: "#634729", orange: "#F5A145", white: "#FFFFFF" };

  // timing beats
  const IDLE_BETWEEN_PHONE_AND_OUTGOING = 0.44;
  const IDLE_BETWEEN_OUTGOING_AND_INCOMING = IDLE_BETWEEN_PHONE_AND_OUTGOING;
  const TAIL_IDLE_AFTER_ALL = 0.7;

  const DESIGN = {
    width: 1280,
    topoH: 184,
    satellite: { w: 400, gap: 200, rise: 120, aspFallback: 0.5 },
    phone: { w: 120, x: 278, bottomInset: 85, aspFallback: 2.1 },
    antenna: { w: 215, x: 840, bottomInset: 110, aspFallback: 0.75 },
    dotsPhone: { w: 620, x: 120, top: 160 },
    dotsAnt: { w: 620, x: 480, top: 170 },
  };
  const pinLenPx = () => Math.round(window.innerHeight * 3.8);

  // -------- DOM
  const section = document.getElementById("section-s2");
  const topoMount = document.getElementById("topoMount");
  const satMount = document.getElementById("satMount");
  const phoneMount = Object.assign(document.createElement("div"), {
    id: "phoneMount",
  });
  const antennaMount = Object.assign(document.createElement("div"), {
    id: "antennaMount",
  });
  const dotsLMount = Object.assign(document.createElement("div"), {
    id: "dotsPhoneMount",
  });
  const dotsRMount = Object.assign(document.createElement("div"), {
    id: "dotsAntennaMount",
  });

  [
    topoMount,
    satMount,
    phoneMount,
    antennaMount,
    dotsLMount,
    dotsRMount,
  ].forEach((el) => {
    el.style.position = "absolute";
    el.style.pointerEvents = "none";
    el.style.opacity = "0";
  });
  topoMount.style.opacity = "1"; // topo visible on load

  // -------- GSAP
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.defaults({ invalidateOnRefresh: true, anticipatePin: 1 });

  // -------- assets
  const topoURL = "./assets/topography.svg";
  const satURL = "./assets/satellite.svg";
  const antennaURL = "./assets/antenna.svg";
  const dotsPhoneURL = "./assets/dots-path-phone.svg";
  const dotsAntURL = "./assets/dots-path-antenna.svg";
  const phoneLocal = "./assets/phone-v2.svg";
  // allow caching for faster subsequent visits
  const phoneGH =
    "https://raw.githubusercontent.com/nicolalumpola/HowItWorks/main/assets/phone-v2.svg";

  // -------- helpers
  const isSVG = (t) => /<\s*svg[\s>]/i.test(t);
  const clipToSVG = (t) => {
    const s = t.search(/<\s*svg\b/i),
      e = t.toLowerCase().lastIndexOf("</svg>");
    return s >= 0 && e > s ? t.slice(s, e + 6) : t;
  };

  // (no "no-store" so the browser can cache)
  async function inlineSVGMaybe(urls, mount) {
    let lastErr;
    for (const url of urls) {
      try {
        const res = await fetch(url);
        const txt = await res.text();
        if (!res.ok || !isSVG(txt)) throw new Error(`Not SVG: ${url}`);
        mount.innerHTML = clipToSVG(txt);
        const svg = mount.querySelector("svg");
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.style.width = "100%";
        svg.style.height = "100%";
        return svg;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("SVG fetch failed");
  }
  const inlineSVG = (url, mount) => inlineSVGMaybe([url], mount);
  const getAsp = (svg, fb) => {
    const vb = svg?.getAttribute("viewBox");
    if (!vb) return fb;
    const [, , w, h] = vb.split(/\s+/).map(Number);
    return w > 0 && h > 0 ? h / w : fb;
  };

  function ensureSceneWrapper() {
    let scene = document.getElementById("sceneS2");
    if (!scene) {
      scene = document.createElement("div");
      scene.id = "sceneS2";
      scene.style.position = "absolute";
      scene.style.left = "50%";
      scene.style.bottom = "0";
      scene.style.transformOrigin = "center bottom";
      scene.style.visibility = "hidden";
      section.appendChild(scene);
      scene.appendChild(topoMount);
      scene.appendChild(satMount);
      scene.appendChild(phoneMount);
      scene.appendChild(antennaMount);
      scene.appendChild(dotsLMount);
      scene.appendChild(dotsRMount);
    }
    return scene;
  }

  function layoutScene(scene, satAsp, phoneAsp, antAsp) {
    const satW = DESIGN.satellite.w,
      satH = Math.round(satW * satAsp);
    const sceneH = DESIGN.topoH + DESIGN.satellite.gap + satH;
    scene.style.width = DESIGN.width + "px";
    scene.style.height = sceneH + "px";

    Object.assign(topoMount.style, {
      left: "0px",
      bottom: "0px",
      width: DESIGN.width + "px",
      height: DESIGN.topoH + "px",
    });

    Object.assign(satMount.style, {
      left: Math.round((DESIGN.width - satW) / 2) + "px",
      top:
        Math.round(sceneH - DESIGN.topoH - DESIGN.satellite.gap - satH) + "px",
      width: satW + "px",
      height: satH + "px",
      transformOrigin: "50% 100%",
    });

    const phoneW = DESIGN.phone.w,
      phoneH = Math.round(phoneW * phoneAsp);
    Object.assign(phoneMount.style, {
      left: DESIGN.phone.x + "px",
      top: Math.round(sceneH - DESIGN.phone.bottomInset - phoneH) + "px",
      width: phoneW + "px",
      height: phoneH + "px",
      transformOrigin: "50% 100%",
    });

    const antW = DESIGN.antenna.w,
      antH = Math.round(antW * antAsp);
    Object.assign(antennaMount.style, {
      left: DESIGN.antenna.x + "px",
      top: Math.round(sceneH - DESIGN.antenna.bottomInset - antH) + "px",
      width: antW + "px",
      height: antH + "px",
      transformOrigin: "50% 100%",
    });

    const arcH = Math.round(DESIGN.dotsPhone.w * (148 / 534));
    Object.assign(dotsLMount.style, {
      left: DESIGN.dotsPhone.x + "px",
      top: DESIGN.dotsPhone.top + "px",
      width: DESIGN.dotsPhone.w + "px",
      height: arcH + "px",
    });
    Object.assign(dotsRMount.style, {
      left: DESIGN.dotsAnt.x + "px",
      top: DESIGN.dotsAnt.top + "px",
      width: DESIGN.dotsAnt.w + "px",
      height: arcH + "px",
    });

    const vw = window.innerWidth,
      vh = window.innerHeight;
    const scale = Math.min(vw / DESIGN.width, vh / sceneH);
    scene.style.transform = `translateX(-50%) scale(${scale})`;
  }

  function paintTopoBase(svg) {
    const groups = svg.querySelectorAll(
      "#topo-main, #topo-phone, #topo-antenna"
    );
    groups.forEach((g) => {
      g.querySelectorAll("*").forEach((n) => {
        if (n.hasAttribute("stroke")) n.setAttribute("stroke", COLORS.topoBase);
        if (n.hasAttribute("fill") && n.getAttribute("fill") !== "none")
          n.setAttribute("fill", COLORS.topoBase);
        n.style.strokeOpacity = "";
        n.style.fillOpacity = "";
        n.removeAttribute("stroke-opacity");
        n.removeAttribute("fill-opacity");
        n.removeAttribute("opacity");
      });
    });
  }

  function ensureDotGradient(svg) {
    const ns = svg.namespaceURI;
    let defs = svg.querySelector("defs");
    if (!defs)
      defs = svg.insertBefore(
        document.createElementNS(ns, "defs"),
        svg.firstChild
      );
    if (!svg.querySelector("#dotGlow")) {
      const g = document.createElementNS(ns, "radialGradient");
      g.setAttribute("id", "dotGlow");
      g.setAttribute("cx", "50%");
      g.setAttribute("cy", "50%");
      g.setAttribute("r", "50%");
      const s1 = document.createElementNS(ns, "stop");
      s1.setAttribute("offset", "0%");
      s1.setAttribute("stop-color", COLORS.orange);
      s1.setAttribute("stop-opacity", "1");
      const s2 = document.createElementNS(ns, "stop");
      s2.setAttribute("offset", "90%");
      s2.setAttribute("stop-color", COLORS.orange);
      s2.setAttribute("stop-opacity", "0");
      g.appendChild(s1);
      g.appendChild(s2);
      defs.appendChild(g);
    }
  }

  function createPathStream(svg, path, opts) {
    ensureDotGradient(svg);
    path ||= svg.querySelector("path");
    if (!path) return null;
    path.style.opacity = "0";
    const ns = svg.namespaceURI,
      g = document.createElementNS(ns, "g");
    svg.appendChild(g);
    const len =
      typeof path.getTotalLength === "function" ? path.getTotalLength() : 100;
    const dots = [];
    for (let i = 0; i < (opts.count || 1); i++) {
      const c = document.createElementNS(ns, "circle");
      c.setAttribute("fill", "url(#dotGlow)");
      g.appendChild(c);
      dots.push({
        node: c,
        s:
          (i / (opts.count || 1) + (Math.random() * 0.35) / (opts.count || 1)) %
          1,
        baseR: Math.max(
          1,
          (opts.size || 4) + (Math.random() * 2 - 1) * (opts.sizeJitter || 0)
        ),
        spMul: 1 + (Math.random() * 2 - 1) * (opts.speedJitter || 0),
        off:
          (Math.random() < 0.5 ? -1 : 1) *
          (opts.spread || 0) *
          Math.random() ** Math.max(0.0001, opts.centerBias || 1),
        z:
          (opts.zMin || 1) +
          Math.random() * ((opts.zMax || 1) - (opts.zMin || 1)),
      });
    }
    let dir = (opts.direction || 1) >= 0 ? 1 : -1,
      speed = opts.speed || 0.2,
      fadeEdge = Math.max(0, Math.min(0.49, opts.fadeEdge ?? 0.3));
    let last = performance.now();
    function tick(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      for (const p of dots) {
        p.s += dir * speed * p.spMul * dt;
        if (p.s > 1) p.s -= 1;
        if (p.s < 0) p.s += 1;
        const d = p.s * len,
          P0 = path.getPointAtLength(Math.max(0, Math.min(len, d - 0.5))),
          P1 = path.getPointAtLength(Math.max(0, Math.min(len, d + 0.5))),
          M = path.getPointAtLength(d);
        let tx = P1.x - P0.x,
          ty = P1.y - P0.y,
          m = Math.hypot(tx, ty) || 1;
        tx /= m;
        ty /= m;
        const nx = -ty,
          ny = tx,
          x = M.x + nx * p.off,
          y = M.y + ny * p.off;
        let fade = 1;
        if (p.s < fadeEdge) fade = p.s / fadeEdge;
        else if (p.s > 1 - fadeEdge) fade = (1 - p.s) / fadeEdge;
        p.node.setAttribute("cx", x.toFixed(2));
        p.node.setAttribute("cy", y.toFixed(2));
        p.node.setAttribute("r", (p.baseR * p.z).toFixed(2));
        p.node.setAttribute(
          "opacity",
          (0.9 * fade * Math.min(1, p.z)).toFixed(3)
        );
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    return {
      setDirection(d) {
        dir = d >= 0 ? 1 : -1;
      },
      mountGroup: g,
    };
  }

  const forceShow = (el) => {
    if (!el) return;
    el.removeAttribute("display");
    el.style.display = "block";
    el.style.visibility = "visible";
  };
  const show = (el) => {
    if (!el) return;
    el.style.opacity = "1";
    el.setAttribute("opacity", "1");
    el.style.display = "block";
  };
  const hide = (el) => {
    if (!el) return;
    el.style.opacity = "0";
    el.setAttribute("opacity", "0");
    el.style.display = "none";
  };

  // -------- input suppression (during preload only)
  let assetsReady = false;
  let inputLocked = false;
  const lockKeys = new Set([
    " ",
    "Spacebar",
    "PageDown",
    "PageUp",
    "ArrowDown",
    "ArrowUp",
    "End",
    "Home",
  ]);
  function preventWhileLocked(e) {
    if (!inputLocked) return;
    // allow tab for accessibility; block common scroll inputs
    if (e.type === "keydown" && !lockKeys.has(e.key)) return;
    e.preventDefault();
    e.stopPropagation();
  }
  function enableInputLock() {
    if (inputLocked) return;
    inputLocked = true;
    window.addEventListener("wheel", preventWhileLocked, { passive: false });
    window.addEventListener("touchmove", preventWhileLocked, {
      passive: false,
    });
    window.addEventListener("keydown", preventWhileLocked, { passive: false });
  }
  function disableInputLock() {
    if (!inputLocked) return;
    inputLocked = false;
    window.removeEventListener("wheel", preventWhileLocked);
    window.removeEventListener("touchmove", preventWhileLocked);
    window.removeEventListener("keydown", preventWhileLocked);
  }
  __teardowns.push(disableInputLock);

  // -------- boot
  (async () => {
    try {
      const scene = ensureSceneWrapper();
      // Layout early (fallback aspect ratios) so pin size is correct
      layoutScene(
        scene,
        DESIGN.satellite.aspFallback,
        DESIGN.phone.aspFallback,
        DESIGN.antenna.aspFallback
      );
      scene.style.visibility = "visible";

      // --- pre-pin immediately and clamp progress at start until assetsReady
      enableInputLock(); // lock inputs during preload (short)
      const prePin = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: () => "+=" + pinLenPx(),
        pin: true,
        anticipatePin: 1,
        onUpdate(self) {
          if (!assetsReady) {
            // hard-clamp to the start of the section while loading
            if (self.scroll() !== self.start) self.scroll(self.start);
          }
        },
      });
      __teardowns.push(() => prePin.kill());

      // topo first
      const topoSVG = await inlineSVG(topoURL, topoMount);
      paintTopoBase(topoSVG);

      // rest in parallel
      const [satSVG, phoneSVG, antennaSVG, dotsLSVG, dotsRSVG] =
        await Promise.all([
          inlineSVG(satURL, satMount),
          inlineSVGMaybe([phoneLocal, phoneGH], phoneMount),
          inlineSVG(antennaURL, antennaMount),
          inlineSVG(dotsPhoneURL, dotsLMount),
          inlineSVG(dotsAntURL, dotsRMount),
        ]);

      // Relayout with real aspects
      const relayout = () =>
        layoutScene(
          scene,
          getAsp(satSVG, DESIGN.satellite.aspFallback),
          getAsp(phoneSVG, DESIGN.phone.aspFallback),
          getAsp(antennaSVG, DESIGN.antenna.aspFallback)
        );
      relayout();
      const onResize = () => {
        relayout();
        ScrollTrigger.refresh();
      };
      window.addEventListener("resize", onResize, { passive: true });
      __teardowns.push(() => window.removeEventListener("resize", onResize));

      // ---- resilient phone screen resolution + safe base state
      function pickIn(root, cands) {
        for (const s of cands) {
          try {
            const el = root.querySelector(s);
            if (el) return el;
          } catch {}
        }
        return null;
      }
      function resolveScreensIn(root) {
        // exact IDs first
        let blank = pickIn(root, ["#Blank-Screen", "#Blank", "#Screen-Blank", "#blank-screen"]);
        let outgoing = pickIn(root, ["#Outgoing-Screen", "#Outgoing", "#Screen-Outgoing"]);
        let incoming = pickIn(root, ["#Incoming-Screen", "#Incoming", "#Screen-Incoming"]);
        // fuzzy fallbacks if missing
        if (!blank) blank = pickIn(root, ['[id*="blank" i][id*="screen" i]']);
        if (!outgoing) outgoing = pickIn(root, ['[id*="outgoing" i][id*="screen" i]']);
        if (!incoming) incoming = pickIn(root, ['[id*="incoming" i][id*="screen" i]']);
        return { blank, outgoing, incoming };
      }
      const screens = resolveScreensIn(phoneSVG);
      // Always enforce safe base (whatever is present)
      if (screens.blank) gsap.set(screens.blank, { opacity: 1, display: "block" });
      if (screens.outgoing) gsap.set(screens.outgoing, { opacity: 0, display: "none" });
      if (screens.incoming) gsap.set(screens.incoming, { opacity: 0, display: "none" });
      const hasAllScreens = !!(screens.blank && screens.outgoing && screens.incoming);
      if (!hasAllScreens) {
        console.warn("S2: Missing screen groups — holding on Blank only.");
      }

      // antenna fill baseline
      antennaSVG
        .querySelectorAll("#antenna-fill, #antenna-fill *")
        .forEach((n) => n.setAttribute("fill", COLORS.white));

      // particles
      const leftStream = createPathStream(
        dotsLSVG,
        dotsLSVG.querySelector("#dots-path-phone"),
        {
          count: 35,
          size: 5,
          sizeJitter: 3,
          speed: 0.22,
          speedJitter: 0.22,
          spread: 35,
          centerBias: 3,
          fadeEdge: 0.3,
          direction: 1,
          zMin: 0.9,
          zMax: 1.1,
        }
      );
      const rightStream = createPathStream(
        dotsRSVG,
        dotsRSVG.querySelector("#dots-path-antenna"),
        {
          count: 25,
          size: 5,
          sizeJitter: 3,
          speed: 0.22,
          speedJitter: 0.25,
          spread: 35,
          centerBias: 3,
          fadeEdge: 0.3,
          direction: 1,
          zMin: 0.9,
          zMax: 1.1,
        }
      );
      gsap.set([dotsLMount, dotsRMount], { opacity: 0 });

      // baselines
      gsap.set(satMount, {
        opacity: 0,
        y: DESIGN.satellite.rise,
        transformOrigin: "50% 100%",
      });
      gsap.set([phoneMount, antennaMount], {
        opacity: 0,
        scale: 0.5,
        transformOrigin: "50% 100%",
      });

      // timeline (relative sequencing + labels)
      const tl = gsap.timeline({ defaults: { ease: "none" } });

      tl.addLabel("satelliteIn").to(
        satMount,
        { opacity: 1, y: 0, duration: 0.18 },
        "satelliteIn"
      );

      tl.addLabel("phoneAntennaIn", "+=0.22").to(
        [phoneMount, antennaMount],
        { opacity: 1, scale: 1, duration: 0.22, stagger: 0.03 },
        "phoneAntennaIn"
      );
      // helper: epsilon to guard both label edges
      const EPS = 0.0001;
      // helper: setScreen binary state
      const setScreen = (mode) => {
        if (!screens) return;
        if (mode === "blank") {
          gsap.set(screens.blank, { opacity: 1, display: "block" });
          gsap.set(screens.outgoing, { opacity: 0, display: "none" });
          gsap.set(screens.incoming, { opacity: 0, display: "none" });
        } else if (mode === "outgoing") {
          gsap.set(screens.blank, { opacity: 0, display: "none" });
          gsap.set(screens.outgoing, { opacity: 1, display: "block" });
          gsap.set(screens.incoming, { opacity: 0, display: "none" });
        } else if (mode === "incoming") {
          gsap.set(screens.blank, { opacity: 0, display: "none" });
          gsap.set(screens.outgoing, { opacity: 0, display: "none" });
          gsap.set(screens.incoming, { opacity: 1, display: "block" });
        }
      };
      // lock phone screen state at end of phoneAntennaIn (binary)
      if (hasAllScreens) {
        tl.add(() => setScreen("blank"), "phoneAntennaIn+=0");
      }

      tl.addLabel("idleAfterPhone", "+=0.08")
        .to(
          [dotsLMount, dotsRMount],
          { opacity: 0, duration: 0.1 },
          "idleAfterPhone"
        )
        .to(
          {},
          { duration: IDLE_BETWEEN_PHONE_AND_OUTGOING },
          "idleAfterPhone"
        );

      // Accent helpers (topo + antenna colors)
      const phoneTopoNodes = topoSVG.querySelectorAll("#topo-phone *");
      const antennaFillNodes = antennaSVG.querySelectorAll("#antenna-fill, #antenna-fill *");
      const setAccentFor = (mode) => {
        if (mode === "blank") {
          // base state
          gsap.set(phoneTopoNodes, { attr: { stroke: COLORS.topoBase, fill: COLORS.topoBase } });
          gsap.set(antennaFillNodes, { attr: { fill: COLORS.white } });
        } else if (mode === "outgoing") {
          gsap.set(phoneTopoNodes, { attr: { stroke: COLORS.orange, fill: COLORS.orange } });
          gsap.set(antennaFillNodes, { attr: { fill: COLORS.white } });
        } else if (mode === "incoming") {
          gsap.set(phoneTopoNodes, { attr: { stroke: COLORS.topoBase, fill: COLORS.topoBase } });
          gsap.set(antennaFillNodes, { attr: { fill: COLORS.orange } });
        }
      };

      tl.addLabel("outgoingPhase", "+=0.02")
        .to(
          [dotsLMount, dotsRMount],
          { opacity: 1, duration: 0.18 },
          "outgoingPhase"
        )
        // instant swaps at label edges to prevent blends while scrubbing
        .add(() => { if (hasAllScreens) setScreen("blank"); }, `outgoingPhase-=${EPS}`)
        .add(() => { if (hasAllScreens) setScreen("outgoing"); setAccentFor("outgoing"); }, "outgoingPhase+=0");

      tl.addLabel("idleAfterOutgoing", "+=0.00").to(
        {},
        { duration: IDLE_BETWEEN_OUTGOING_AND_INCOMING },
        "idleAfterOutgoing"
      );

      tl.addLabel("incomingPhase", "+=0.02")
        // instant swaps at label edges to prevent blends while scrubbing
        .add(() => { if (hasAllScreens) setScreen("outgoing"); }, `incomingPhase-=${EPS}`)
        .add(() => { if (hasAllScreens) setScreen("incoming"); setAccentFor("incoming"); }, "incomingPhase+=0");

      tl.addLabel("tailIdle", "+=0.00").to(
        {},
        { duration: TAIL_IDLE_AFTER_ALL },
        "tailIdle"
      );

      const totalDur = tl.duration();

      // --- micro crossfade timelines (paused) that play/reverse when crossing labels
      let fadeToOutgoing, fadeToIncoming;
      if (hasAllScreens) {
        fadeToOutgoing = gsap
          .timeline({ paused: true })
          .fromTo(
            screens.blank,
            { opacity: 1 },
            { opacity: 0, duration: 0.15, ease: "power1.out", overwrite: "auto" },
            0
          )
          .fromTo(
            screens.outgoing,
            { opacity: 0 },
            { opacity: 1, duration: 0.15, ease: "power1.out", overwrite: "auto" },
            0
          );

        fadeToIncoming = gsap
          .timeline({ paused: true })
          .fromTo(
            screens.outgoing,
            { opacity: 1 },
            { opacity: 0, duration: 0.15, ease: "power1.out", overwrite: "auto" },
            0
          )
          .fromTo(
            screens.incoming,
            { opacity: 0 },
            { opacity: 1, duration: 0.15, ease: "power1.out", overwrite: "auto" },
            0
          );
      }

      // Accent micro timelines (topo + antenna) to sync with screen fades
      const accentToOutgoing = gsap
        .timeline({ paused: true })
        .to(phoneTopoNodes, { duration: 0.15, ease: "power1.out", overwrite: "auto", attr: { stroke: COLORS.orange, fill: COLORS.orange } }, 0)
        .to(antennaFillNodes, { duration: 0.15, ease: "none", overwrite: "auto", attr: { fill: COLORS.white } }, 0);
      const accentToIncoming = gsap
        .timeline({ paused: true })
        .to(phoneTopoNodes, { duration: 0.15, ease: "power1.out", overwrite: "auto", attr: { stroke: COLORS.topoBase, fill: COLORS.topoBase } }, 0)
        .to(antennaFillNodes, { duration: 0.15, ease: "power1.out", overwrite: "auto", attr: { fill: COLORS.orange } }, 0);

      // --- replace pre-pin with the final scrubbed trigger now that tl exists
      const st = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: () => "+=" + pinLenPx(),
        pin: true,
        scrub: 1,
        animation: tl,
        anticipatePin: 1,
        onUpdate(self) {
          // reverse particle direction between phases
          const p = self.progress;
          const outStart = (tl.labels.outgoingPhase ?? 0.96) / totalDur;
          const inStart = (tl.labels.incomingPhase ?? 1.54) / totalDur;
          if (p >= inStart) {
            leftStream?.setDirection(-1);
            rightStream?.setDirection(-1);
          } else if (p >= outStart) {
            leftStream?.setDirection(1);
            rightStream?.setDirection(1);
          } else {
            leftStream?.setDirection(1);
            rightStream?.setDirection(1);
          }
        },
      });
      __teardowns.push(() => st.kill());

      // ScrollTriggers tied to timeline labels to play/reverse micro crossfades
      // Label-edge micro triggers (correct edges)
      // OUTGOING boundary
      const stOutXF = ScrollTrigger.create({
        containerAnimation: tl,
        start: "outgoingPhase",
        end: "outgoingPhase+=0.001",
        onEnter: () => { if (hasAllScreens) fadeToOutgoing?.play(0); accentToOutgoing.play(0); },
        onLeaveBack: () => { if (hasAllScreens) fadeToOutgoing?.reverse(); accentToOutgoing.reverse(); },
      });
      // INCOMING boundary
      const stInXF = ScrollTrigger.create({
        containerAnimation: tl,
        start: "incomingPhase",
        end: "incomingPhase+=0.001",
        onEnter: () => { if (hasAllScreens) fadeToIncoming?.play(0); accentToIncoming.play(0); },
        onLeaveBack: () => { if (hasAllScreens) fadeToIncoming?.reverse(); accentToIncoming.reverse(); },
      });
      __teardowns.push(() => stOutXF.kill());
      __teardowns.push(() => stInXF.kill());

      // Surface S2 references for optional debug overlay (non-invasive)
      try {
        if (typeof window !== "undefined" && !window.__S2__) {
          window.__S2__ = { tl, trigger: st };
        }
      } catch {}

      // mark ready → release inputs, keep scroll at section start
      assetsReady = true;
      disableInputLock();
      prePin.scroll(prePin.start); // ensure we're still at frame 0
      prePin.kill();
      ScrollTrigger.refresh();
    } catch (err) {
      console.error("[S2] init error:", err);
      // release lock on error so page is still usable
      assetsReady = true;
      disableInputLock();
    }
  })();
})();
