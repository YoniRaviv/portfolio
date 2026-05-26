// Custom dot + trailing ring cursor for hover/fine pointer devices.

const HOVER_SEL =
  'a, button, .proj, .chip, [data-cursor=hover], .what .proj .name, .where .role .company, .who .meta-grid .cell, .hero h1';

export function mountCursor(): void {
  const dot = document.getElementById('curDot');
  const ring = document.getElementById('curRing');
  if (!dot || !ring) return;
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  window.addEventListener(
    'pointermove',
    (e) => {
      const t = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      dot.style.transform = t;
      ring.style.transform = t;
    },
    { passive: true }
  );

  document.addEventListener('mouseover', (e) => {
    const target = e.target as Element;
    if (target.closest('[data-cursor="reveal"]')) {
      ring.classList.add('reveal');
      dot.classList.add('hover');
      return;
    }
    if (target.closest(HOVER_SEL)) {
      ring.classList.add('hover');
      dot.classList.add('hover');
    }
  });
  document.addEventListener('mouseout', (e) => {
    const target = e.target as Element;
    if (target.closest('[data-cursor="reveal"]')) {
      ring.classList.remove('reveal');
      dot.classList.remove('hover');
      return;
    }
    if (target.closest(HOVER_SEL)) {
      ring.classList.remove('hover');
      dot.classList.remove('hover');
    }
  });
}
