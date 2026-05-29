// Word-by-word reveal animations + IntersectionObserver-driven section reveals.
// Loaded once from Base.astro.

function splitWords(): void {
  document.querySelectorAll<HTMLElement>('[data-words]').forEach((el) => {
    if (el.dataset.wordsSplit) return;
    el.dataset.wordsSplit = '1';
    const newChildren: Node[] = [];
    let wordIndex = 0;
    [...el.childNodes].forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const parts = (node.textContent ?? '').split(/(\s+)/);
        parts.forEach((p) => {
          if (p === '' || /^\s+$/.test(p)) return;
          const s = document.createElement('span');
          s.className = 'word';
          s.style.setProperty('--i', String(wordIndex++));
          s.textContent = p;
          newChildren.push(s);
        });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const elNode = node as HTMLElement;
        if (elNode.tagName === 'BR') {
          newChildren.push(elNode);
          return;
        }
        if (!elNode.classList.contains('word')) elNode.classList.add('word');
        elNode.style.setProperty('--i', String(wordIndex++));
        newChildren.push(elNode);
      }
    });
    el.innerHTML = '';
    newChildren.forEach((c) => el.appendChild(c));
  });
}

export function scrambleEl(el: HTMLElement, finalText: string, duration = 1400): void {
  const chars = '!<>-_\\/[]{}—=+*^?#01XYZHRVΣ░▒▓';
  const start = performance.now();
  const queue = Array.from(finalText).map((c) => ({
    from: c,
    to: c,
    start: Math.random() * 0.35 * duration,
    end: 0.4 * duration + Math.random() * 0.5 * duration,
  }));
  function tick(now: number): void {
    const t = now - start;
    let done = 0;
    const next = queue
      .map((q) => {
        if (t >= q.end) {
          done++;
          return q.to;
        }
        if (t >= q.start) return chars[Math.floor(Math.random() * chars.length)];
        return ' ';
      })
      .join('');
    el.textContent = next;
    if (done < queue.length) requestAnimationFrame(tick);
    else el.textContent = finalText;
  }
  requestAnimationFrame(tick);
}

export function bindHoverScramble(trigger: Element | null, target: HTMLElement | null, duration = 1400): void {
  if (!trigger || !target) return;
  const finalText = target.textContent ?? '';
  const lockSize = (): void => {
    target.style.width = 'auto';
    const r = target.getBoundingClientRect();
    target.style.display = 'inline-block';
    target.style.width = `${Math.ceil(r.width)}px`;
    target.style.whiteSpace = 'nowrap';
    target.style.textAlign = 'left';
  };
  lockSize();
  // Re-measure once web fonts have loaded. Bebas Neue (the display font used
  // for .company and the hero scramble target) is much narrower than the
  // system fallback; measuring before it swaps in locks a width that's too
  // wide, which on the Where rows pushes the adjacent "● NOW" badge into the
  // middle of the row. document.fonts.ready resolves immediately on cached
  // loads, so this is cheap.
  if ('fonts' in document) {
    document.fonts.ready.then(lockSize);
  }
  window.addEventListener('resize', lockSize);
  let scrambling = false;
  trigger.addEventListener('mouseenter', () => {
    if (scrambling) return;
    scrambling = true;
    scrambleEl(target, finalText, duration);
    setTimeout(() => {
      scrambling = false;
    }, duration + 100);
  });
}

function mountScrambles(): void {
  const heroSwap = document.querySelector<HTMLElement>('.hero h1 .swap');
  if (heroSwap) bindHoverScramble(document.querySelector('.hero h1'), heroSwap, 1400);

  document.querySelectorAll<HTMLElement>('.who .meta-grid .cell').forEach((cell) => {
    const v = cell.querySelector<HTMLElement>('.v');
    bindHoverScramble(cell, v, 900);
  });

  document.querySelectorAll<HTMLElement>('.where .role').forEach((role) => {
    const company = role.querySelector<HTMLElement>('.company');
    if (company && !company.querySelector('.cname')) {
      const textNode = [...company.childNodes].find(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== ''
      );
      if (textNode) {
        const span = document.createElement('span');
        span.className = 'cname';
        span.textContent = (textNode.textContent ?? '').trim();
        company.replaceChild(span, textNode);
      }
    }
    const cname = company?.querySelector<HTMLElement>('.cname');
    bindHoverScramble(role, cname ?? null, 900);
  });
}

function mountQuoteReveal(): void {
  // Track pointer position relative to each [data-quote-reveal] element and
  // expose it as --qx / --qy CSS variables. Used by the Who section's
  // spotlight mask that punches the cream fill out within a circle around the
  // cursor (revealing the mask + accent stroke beneath).
  const stacks = document.querySelectorAll<HTMLElement>('[data-quote-reveal]');
  stacks.forEach((stack) => {
    const reset = (): void => {
      stack.style.setProperty('--qx', '-1000px');
      stack.style.setProperty('--qy', '-1000px');
    };
    reset();
    stack.addEventListener(
      'pointermove',
      (e) => {
        const r = stack.getBoundingClientRect();
        stack.style.setProperty('--qx', `${e.clientX - r.left}px`);
        stack.style.setProperty('--qy', `${e.clientY - r.top}px`);
      },
      { passive: true }
    );
    stack.addEventListener('pointerleave', reset);
  });
}

export function mountReveal(): void {
  splitWords();

  const revealEls = [...document.querySelectorAll<HTMLElement>('.reveal-words, .fade-up, .reveal-chips, .reveal-cells')];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduced) {
    revealEls.forEach((el) => el.classList.add('in'));
  } else {
    const checkReveals = (): void => {
      const triggerLine = window.innerHeight * 0.85;
      revealEls.forEach((el) => {
        if (el.classList.contains('in')) return;
        const r = el.getBoundingClientRect();
        if (r.top < triggerLine && r.bottom > 0) el.classList.add('in');
      });
    };
    requestAnimationFrame(() => requestAnimationFrame(checkReveals));
    window.addEventListener('scroll', checkReveals, { passive: true });
    window.addEventListener('resize', checkReveals);
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('in')),
        { threshold: 0.05, rootMargin: '0px 0px -10% 0px' }
      );
      revealEls.forEach((el) => io.observe(el));
    }
  }

  mountScrambles();
  mountQuoteReveal();
}
