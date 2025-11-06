// Minimal S2 scene (redo)
(function(){
  const COLORS = { topoBase:'#634729', orange:'#F5A145', white:'#FFFFFF' };
  const q = (s, sc=document) => sc.querySelector(s);
  const qa = (s, sc=document) => Array.from(sc.querySelectorAll(s));

  async function fetchInline(url, mount){
    const res = await fetch(url);
    const txt = await res.text();
    const i = txt.search(/<\s*svg\b/i); const j = txt.toLowerCase().lastIndexOf('</svg>');
    const inner = i>=0 && j>i ? txt.slice(i, j+6) : txt;
    mount.innerHTML = inner;
    const svg = mount.querySelector('svg');
    if (svg){ svg.removeAttribute('width'); svg.removeAttribute('height'); svg.style.width='100%'; svg.style.height='100%'; svg.setAttribute('preserveAspectRatio','xMidYMid meet'); }
    return svg;
  }

  // Dots helper
  function buildDots(container, count=24){
    const dots=[]; container.innerHTML='';
    for (let i=0;i<count;i++){
      const d=document.createElement('div'); d.className='dot';
      container.appendChild(d);
      dots.push(d);
    }
    return dots;
  }

  function driftDots(dots, dir){
    gsap.killTweensOf(dots);
    dots.forEach((d,i)=>{
      const y = 20 + Math.random()*60; // vh band
      const dur = 3 + Math.random()*2;
      const sx = dir==='LtoR' ? -10 : 110;
      const ex = dir==='LtoR' ? 110 : -10;
      const delay = Math.random()*1.0;
      gsap.set(d,{ opacity: 0.0, top: `${y}vh`, left: `${sx}vw`});
      gsap.to(d, { opacity: 0.9, duration: 0.6, delay, ease:'power1.out' });
      gsap.to(d, { x: `${ex-sx}vw`, duration: dur, delay, ease:'none', repeat:-1, modifiers:{ x: (v)=>v } });
    });
  }

  function bootDebug(tl, s2, state){
    const params = new URLSearchParams(location.search);
    if (params.get('debug')!=='1') return;
    const box=document.createElement('div'); box.id='s2-debug';
    const rows = [ ['Label','-'], ['Screen','-'], ['Dots','-'], ['FPS','-'] ];
    const map={};
    rows.forEach(([k,v])=>{ const r=document.createElement('div'); r.className='row'; const a=document.createElement('div'); a.className='key'; a.textContent=k; const b=document.createElement('div'); b.className='val'; b.textContent=v; r.append(a,b); box.appendChild(r); map[k]=b; });
    const scrub=document.createElement('div'); scrub.className='scrub'; const ph=document.createElement('div'); ph.className='playhead'; scrub.appendChild(ph); box.appendChild(scrub);
    document.body.appendChild(box);
    function labelAt(){
      let best=''; let t = tl.time(); let bestT=-1; for (const k in tl.labels){ const lt = tl.labels[k]; if (lt<=t && lt>=bestT){ best=k; bestT=lt; } }
      return best;
    }
    // fps
    let last=performance.now(); let ema=0; const A=0.15; gsap.ticker.add(()=>{ const now=performance.now(); const dt=(now-last)/1000; last=now; const fps=dt>0?1/dt:60; ema = ema? (A*fps + (1-A)*ema) : fps; });
    function update(){
      map['Label'].textContent = labelAt();
      map['Screen'].textContent = state.screen;
      map['Dots'].textContent = state.dotsDir;
      map['FPS'].textContent = `${Math.round(ema||0)}`;
      ph.style.left = `${(tl.progress()*100).toFixed(1)}%`;
      requestAnimationFrame(update);
    }
    update();
    // scrub bar
    scrub.addEventListener('pointerdown', (e)=>{
      const rect=scrub.getBoundingClientRect(); const ratio=Math.min(1,Math.max(0,(e.clientX-rect.left)/rect.width)); tl.progress(ratio).pause(); ph.style.left=`${ratio*100}%`;
    });
    // export
    window.__S2__ = { tl, trigger: s2 };
  }

  (async function init(){
    try{
      gsap.registerPlugin(ScrollTrigger);
      const root = q('#anim-root');
      const topoWrap = q('#topo-wrap');
      const phoneWrap = q('#phone-wrap');
      const antennaWrap = q('#antenna-wrap');
      const dotWrap = q('#dot-streams');

      // Inline assets
      await fetchInline('./assets/topography.svg', topoWrap);
      await fetchInline('./assets/phone-v3.svg', phoneWrap);
      await fetchInline('./assets/antenna.svg', antennaWrap);

      // Query screens & accents
      const screenBlank = q('#Blank-Screen', phoneWrap);
      const screenOutgoing = q('#Screen-Outgoing', phoneWrap);
      const screenIncoming = q('#Screen-Incoming', phoneWrap);
      const topoPhone = q('#topo-phone', topoWrap) || q('#topo-phone');
      const topoAntenna = q('#topo-antenna', topoWrap) || q('#topo-antenna');
      const antennaFill = q('#antenna-fill', antennaWrap) || q('#antenna-fill');
      if (!screenBlank || !screenOutgoing || !screenIncoming) console.warn('[S2] missing screen groups');
      if (!topoPhone) console.warn('[S2] missing #topo-phone');
      if (!topoAntenna) console.warn('[S2] missing #topo-antenna');
      if (!antennaFill) console.warn('[S2] missing #antenna-fill');

      // Screens & accents helpers
      const state = { screen:'-', dotsDir:'LtoR' };
      function setScreen(mode){
        if (!screenBlank || !screenOutgoing || !screenIncoming) return;
        const show=(el)=>{ el.style.display='block'; el.style.opacity=1; };
        const hide=(el)=>{ el.style.display='none'; el.style.opacity=0; };
        if (mode==='outgoing'){ hide(screenBlank); show(screenOutgoing); hide(screenIncoming); }
        else if (mode==='incoming'){ hide(screenBlank); hide(screenOutgoing); show(screenIncoming); }
        else { show(screenBlank); hide(screenOutgoing); hide(screenIncoming); }
        state.screen = mode;
      }
      function setTopoUnderPhone(mode){ if (topoPhone) { topoPhone.setAttribute('fill', mode==='orange'?COLORS.orange:COLORS.topoBase); topoPhone.setAttribute('stroke', mode==='orange'?COLORS.orange:COLORS.topoBase);} }
      function setTopoUnderAntenna(mode){ if (topoAntenna) { topoAntenna.setAttribute('fill', mode==='orange'?COLORS.orange:COLORS.topoBase); topoAntenna.setAttribute('stroke', mode==='orange'?COLORS.orange:COLORS.topoBase);} }
      function setAntenna(mode){ if (antennaFill){ antennaFill.setAttribute('fill', mode==='orange'?COLORS.orange:COLORS.white);} }
      function setDotsDirection(dir){ state.dotsDir = dir; driftDots(qa('.dot', dotWrap), dir); }

      // Micro timelines
      const fadeToIncoming = gsap.timeline({ paused:true })
        .to(screenOutgoing||{}, { opacity:0, duration:0.15, overwrite:'auto' }, 0)
        .to(screenIncoming||{}, { opacity:1, duration:0.15, overwrite:'auto' }, 0);
      const accentToIncoming = gsap.timeline({ paused:true })
        .to(topoPhone||{}, { attr:{ fill: COLORS.topoBase }, duration:0.15, ease:'power1.out', overwrite:'auto' }, 0)
        .to(topoAntenna||{}, { attr:{ fill: COLORS.orange }, duration:0.15, ease:'power1.out', overwrite:'auto' }, 0)
        .to(antennaFill||{}, { attr:{ fill: COLORS.orange }, duration:0.15, ease:'power1.out', overwrite:'auto' }, 0);
      const accentToOutgoing = gsap.timeline({ paused:true })
        .to(topoPhone||{}, { attr:{ fill: COLORS.orange }, duration:0.15, ease:'power1.out', overwrite:'auto' }, 0)
        .to(topoAntenna||{}, { attr:{ fill: COLORS.topoBase }, duration:0.15, ease:'power1.out', overwrite:'auto' }, 0)
        .to(antennaFill||{}, { attr:{ fill: COLORS.white }, duration:0.15, ease:'power1.out', overwrite:'auto' }, 0);

      // Dots build
      const dots = buildDots(dotWrap, 24);

      // Master TL + labels
      const tl = gsap.timeline({ defaults:{ ease:'none' } });
      tl.addLabel('satelliteIn'); tl.to({}, { duration:0.2 }, 'satelliteIn');
      tl.addLabel('phoneAntennaIn', 'satelliteIn+=0.4'); tl.to({}, { duration:0.4 }, 'phoneAntennaIn');
      tl.addLabel('idleAfterPhone', 'phoneAntennaIn+=0.05'); tl.to({}, { duration:0.2 }, 'idleAfterPhone');
      tl.addLabel('outgoingPhase', 'idleAfterPhone+=0.05'); tl.to({}, { duration:0.1 }, 'outgoingPhase');
      tl.addLabel('idleAfterOutgoing', 'outgoingPhase+=0.05'); tl.to({}, { duration:0.3 }, 'idleAfterOutgoing');
      tl.addLabel('incomingPhase', 'idleAfterOutgoing+=0.05'); tl.to({}, { duration:0.1 }, 'incomingPhase');
      tl.addLabel('tailIdle', 'incomingPhase+=0.05'); tl.to({}, { duration:0.5 }, 'tailIdle');

      // Entrance: already Outgoing, fade in under-phone topo + dots L→R
      tl.add(()=>{ setScreen('outgoing'); setTopoUnderAntenna('base'); setAntenna('base'); }, 'phoneAntennaIn+=0');
      tl.fromTo(q('#topo-phone'), { opacity:0 }, { opacity:1, duration:0.25, ease:'power1.out', immediateRender:false }, 'phoneAntennaIn');
      tl.fromTo(dotWrap, { opacity:0 }, { opacity:1, duration:0.25, ease:'power1.out' }, 'phoneAntennaIn');
      tl.add(()=>{ setDotsDirection('LtoR'); }, 'phoneAntennaIn+=0');

      // Guard sets (binary) around the beats
      const EPS = 0.0001;
      tl.add(()=>{ setScreen('outgoing'); setTopoUnderPhone('orange'); setTopoUnderAntenna('base'); setAntenna('base'); setDotsDirection('LtoR'); }, `outgoingPhase-=${EPS}`);
      tl.add(()=>{ setScreen('outgoing'); setTopoUnderPhone('orange'); setTopoUnderAntenna('base'); setAntenna('base'); setDotsDirection('LtoR'); }, 'outgoingPhase+=0');

      tl.add(()=>{ setScreen('incoming'); setTopoUnderPhone('base'); setTopoUnderAntenna('orange'); setAntenna('orange'); setDotsDirection('RtoL'); }, 'incomingPhase+=0');
      tl.add(()=>{ setScreen('outgoing'); setTopoUnderPhone('orange'); setTopoUnderAntenna('base'); setAntenna('base'); setDotsDirection('LtoR'); }, `incomingPhase-=${EPS}`);

      // Hooks at label edges (containerAnimation)
      ScrollTrigger.create({
        containerAnimation: tl,
        start: 'incomingPhase', end: 'incomingPhase+=0.001',
        onEnter: ()=>{ fadeToIncoming.play(0); accentToIncoming.play(0); setDotsDirection('RtoL'); },
        onLeaveBack: ()=>{ fadeToIncoming.reverse(); accentToOutgoing.play(0); setDotsDirection('LtoR'); }
      });
      ScrollTrigger.create({
        containerAnimation: tl,
        start: 'outgoingPhase', end: 'outgoingPhase+=0.001',
        onEnter: ()=>{},
        onLeaveBack: ()=>{ setScreen('outgoing'); accentToOutgoing.play(0); setDotsDirection('LtoR'); }
      });

      // Single pinned ScrollTrigger
      const s2 = ScrollTrigger.create({
        trigger: '#anim-root', start:'top top', end:'+=3000', pin:true, scrub:true, animation: tl, anticipatePin: 1
      });

      bootDebug(tl, s2, state);

    }catch(e){
      console.error('[S2] init error:', e);
    }
  })();
})();

