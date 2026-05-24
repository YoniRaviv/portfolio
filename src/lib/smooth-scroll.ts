// Smooth scrolling powered by Lenis (lenis.dev).
//   - Buttery smooth wheel/touch scrolling with lerp-based easing.
//   - anchors: true intercepts <a href="#id"> clicks (nav + logo)
//     and animates the scroll to the target section.
//
// Section snapping is intentionally NOT enabled here — the page reads as a
// normal smooth-scrolling site. Revisit lenis/snap once final content is in
// place and section heights are settled.

import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

export function mountSmoothScroll(): void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const lenis = new Lenis({
    autoRaf: true,
    anchors: { offset: 0, duration: 1.0 },
    smoothWheel: !reduced,
    syncTouch: !reduced,
    syncTouchLerp: 0.1,
    touchInertiaExponent: 1.7,
    lerp: 0.12,
    wheelMultiplier: 1.1,
    touchMultiplier: 1.2,
    autoToggle: true,
    allowNestedScroll: true,
  });

  // Initial hash deep-link: Lenis's `anchors` intercepts clicks, but not the
  // browser's own first-paint scroll. Wait two frames so the hero canvas and
  // fonts settle, then jump.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const hash = location.hash.replace('#', '');
      if (!hash) return;
      const target = document.getElementById(hash);
      if (target) lenis.scrollTo(target, { immediate: true });
    });
  });
}
