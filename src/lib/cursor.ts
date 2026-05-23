// Custom dot + trailing ring cursor for hover/fine pointer devices.

const HOVER_SEL =
  'a, button, .proj, .chip, [data-cursor=hover], .what .proj .name, .where .role .company, .who .meta-grid .cell, .hero h1';

export function mountCursor(): void {
  const dot = document.getElementById('curDot');
  const ring = document.getElementById('curRing');
  if (!dot || !ring) return;
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let rx = mx;
  let ry = my;

  window.addEventListener(
    'pointermove',
    (e) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
    },
    { passive: true }
  );

  const ringEl = ring;
  function tick(): void {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    ringEl.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    requestAnimationFrame(tick);
  }
  tick();

  document.addEventListener('mouseover', (e) => {
    if ((e.target as Element).closest(HOVER_SEL)) {
      ring.classList.add('hover');
      dot.classList.add('hover');
    }
  });
  document.addEventListener('mouseout', (e) => {
    if ((e.target as Element).closest(HOVER_SEL)) {
      ring.classList.remove('hover');
      dot.classList.remove('hover');
    }
  });
}
