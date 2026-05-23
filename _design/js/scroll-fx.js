// scroll-fx.js — word splitting, scroll-based reveals (more reliable than IO
// in some iframe environments), parallax, active nav, cursor glow.

(function(){
  // ── 1. Split words on [data-words] elements ─────────────
  function splitWords(){
    document.querySelectorAll('[data-words]').forEach(el=>{
      if(el.dataset.wordsSplit) return;
      el.dataset.wordsSplit = '1';
      const newChildren = [];
      let wordIndex = 0;
      [...el.childNodes].forEach(node=>{
        if(node.nodeType === Node.TEXT_NODE){
          const parts = node.textContent.split(/(\s+)/);
          parts.forEach(p=>{
            if(p === '') return;
            if(/^\s+$/.test(p)){
              // collapsed whitespace handled via word's margin-right
              return;
            }
            const s = document.createElement('span');
            s.className = 'word';
            s.style.setProperty('--i', wordIndex++);
            s.textContent = p;
            newChildren.push(s);
          });
        } else if(node.nodeType === Node.ELEMENT_NODE){
          if(node.tagName === 'BR'){
            newChildren.push(node);
            return;
          }
          if(!node.classList.contains('word')){
            node.classList.add('word');
          }
          node.style.setProperty('--i', wordIndex++);
          newChildren.push(node);
        }
      });
      el.innerHTML = '';
      newChildren.forEach(c=> el.appendChild(c));
    });
  }
  splitWords();

  // ── 2. Reveal on scroll (manual; IO not reliable everywhere) ──
  const revealEls = [...document.querySelectorAll('.reveal-words, .fade-up')];
  function checkReveals(){
    const vh = window.innerHeight;
    const triggerLine = vh * 0.85; // element top must be above this to reveal
    revealEls.forEach(el=>{
      if(el.classList.contains('in')) return;
      const r = el.getBoundingClientRect();
      if(r.top < triggerLine && r.bottom > 0){
        el.classList.add('in');
      }
    });
  }
  // Run initial check after layout settles
  requestAnimationFrame(()=>{ requestAnimationFrame(checkReveals); });
  window.addEventListener('scroll', checkReveals, {passive:true});
  window.addEventListener('resize', checkReveals);
  // Belt and suspenders — also try IO if it works
  if('IntersectionObserver' in window){
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('in'); });
    }, { threshold: 0.05, rootMargin: '0px 0px -10% 0px' });
    revealEls.forEach(el=> io.observe(el));
  }

  // ── 3. Active nav ───────────────────────────────────────
  const navLinks = [...document.querySelectorAll('nav.top ul a[data-anchor]')];
  const sectionIds = navLinks.map(a => a.dataset.anchor);
  const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);
  function updateActive(){
    const y = window.scrollY + window.innerHeight * 0.35;
    let activeId = sections[0]?.id;
    sections.forEach(s=>{
      if(s.offsetTop <= y) activeId = s.id;
    });
    navLinks.forEach(a=> a.classList.toggle('active', a.dataset.anchor === activeId));
  }
  window.addEventListener('scroll', updateActive, {passive:true});
  updateActive();

  // ── 4. Hero name scramble on hover ──────────────────────
  function scrambleEl(el, finalText, duration = 1400){
    const chars = '!<>-_\\/[]{}—=+*^?#01XYZHRVΣ░▒▓';
    const start = performance.now();
    const queue = Array.from(finalText).map((c) => ({
      from: c, to: c,
      start: Math.random() * 0.35 * duration,
      end:   0.4 * duration + Math.random() * 0.5 * duration,
    }));
    function tick(now){
      const t = now - start;
      let done = 0;
      const next = queue.map((q) => {
        if(t >= q.end){ done++; return q.to; }
        if(t >= q.start) return chars[Math.floor(Math.random() * chars.length)];
        return ' ';
      }).join('');
      el.textContent = next;
      if(done < queue.length) requestAnimationFrame(tick);
      else el.textContent = finalText;
    }
    requestAnimationFrame(tick);
  }

  // helper: bind hover scramble to an element (or its inner text node target)
  function bindHoverScramble(triggerEl, targetEl, duration = 1400){
    if(!triggerEl || !targetEl) return;
    const finalText = targetEl.textContent;
    // lock width so scrambling can't reflow surrounding layout
    const lockWidth = ()=>{
      const w = targetEl.getBoundingClientRect().width;
      targetEl.style.minWidth = Math.ceil(w) + 'px';
    };
    lockWidth();
    window.addEventListener('resize', lockWidth);
    let scrambling = false;
    triggerEl.addEventListener('mouseenter', ()=>{
      if(scrambling) return;
      scrambling = true;
      scrambleEl(targetEl, finalText, duration);
      setTimeout(()=> scrambling = false, duration + 100);
    });
  }

  // hero name
  const heroSwap = document.querySelector('.hero h1 .swap');
  if(heroSwap){
    bindHoverScramble(document.querySelector('.hero h1'), heroSwap, 1400);
  }

  // WHO meta-grid cells — scramble all four (Years, Education, Discipline, Now) on hover
  document.querySelectorAll('.who .meta-grid .cell').forEach(cell=>{
    const v = cell.querySelector('.v');
    bindHoverScramble(cell, v, 900);
  });

  // WHERE company names — scramble company text on role hover
  document.querySelectorAll('.where .role').forEach(role=>{
    const company = role.querySelector('.company');
    // company contains the name text node + a possible <span class="current"> badge
    // we only want to scramble the name itself, not the "NOW" badge — wrap name in a span
    if(company && !company.querySelector('.cname')){
      const textNode = [...company.childNodes].find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
      if(textNode){
        const span = document.createElement('span');
        span.className = 'cname';
        span.textContent = textNode.textContent.trim();
        company.replaceChild(span, textNode);
      }
    }
    const cname = company?.querySelector('.cname');
    bindHoverScramble(role, cname, 900);
  });

  // ── 5. CRT flicker pulse — rare, brief ──────────────────
  // (handled by CSS already; nothing here)

  // legacy cursor-glow disabled — element is display:none now
  const glow = document.getElementById('cursorGlow');
  if(glow){
    window.addEventListener('pointermove', e=>{
      glow.style.transform = `translate3d(${e.clientX - 300}px, ${e.clientY - 300}px, 0)`;
    });
  }

  // ── 6. Custom cursor: dot + trailing ring ───────────────
  const curDot  = document.getElementById('curDot');
  const curRing = document.getElementById('curRing');
  if(curDot && curRing && matchMedia('(hover:hover) and (pointer:fine)').matches){
    let mx = window.innerWidth/2, my = window.innerHeight/2;
    let rx = mx, ry = my;
    window.addEventListener('pointermove', e=>{
      mx = e.clientX; my = e.clientY;
      curDot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
    });
    function tickCursor(){
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      curRing.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      requestAnimationFrame(tickCursor);
    }
    tickCursor();

    // hover-grow on interactive elements
    const HOVER_SEL = 'a, button, .proj, .chip, [data-cursor=hover], .what .proj .name, .where .role .company, .who .meta-grid .cell, .hero h1';
    document.addEventListener('mouseover', (e)=>{
      if(e.target.closest(HOVER_SEL)){
        curRing.classList.add('hover');
        curDot.classList.add('hover');
      }
    });
    document.addEventListener('mouseout', (e)=>{
      if(e.target.closest(HOVER_SEL)){
        curRing.classList.remove('hover');
        curDot.classList.remove('hover');
      }
    });
  }

  // ── 5. Parallax for elements with [data-parallax] ──────
  const parallaxEls = [...document.querySelectorAll('[data-parallax]')];
  function applyParallax(){
    const y = window.scrollY;
    parallaxEls.forEach(el=>{
      const speed = parseFloat(el.dataset.parallax) || 0.2;
      el.style.transform = `translateY(${-y * speed}px)`;
    });
  }
  window.addEventListener('scroll', applyParallax, {passive:true});
  applyParallax();
})();
