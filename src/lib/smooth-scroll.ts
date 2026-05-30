// Smooth scrolling powered by Lenis (lenis.dev).
//   - Smooth wheel scrolling on desktop via lerp-based easing.
//   - Touch scrolling is left to the native OS: syncTouch is intentionally
//     OFF so iOS keeps its real momentum + rubber-band. Turning syncTouch
//     on hijacks touchmove with a JS lerp, which iOS Safari throttles and
//     never matches native inertia — it's the standard cause of "weird"
//     mobile scrolling with Lenis. window.scrollY still updates natively,
//     so the HeroScene scroll probe and active-nav scroll-spy keep working.
//   - anchors: true intercepts <a href="#id"> clicks (nav + logo) and
//     animates the scroll to the target section (click handler, not
//     touch — works regardless of syncTouch).
//
// Section snapping is intentionally NOT enabled here — the page reads as a
// normal smooth-scrolling site. Revisit lenis/snap once final content is in
// place and section heights are settled.

import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

let lenis: Lenis | null = null;

export function mountSmoothScroll(): void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  lenis = new Lenis({
    autoRaf: true,
    anchors: { offset: 0, duration: 1.0 },
    smoothWheel: !reduced,
    syncTouch: false,
    lerp: 0.12,
    wheelMultiplier: 1.1,
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
      if (target) lenis!.scrollTo(target, { immediate: true });
    });
  });
}

// Lock/unlock used by the mobile nav overlay. `.stop()` adds the
// `lenis-stopped` class (overflow: clip), which blocks both smooth and native
// scrolling behind the full-screen menu.
export function lockScroll(): void {
  lenis?.stop();
}

export function unlockScroll(): void {
  lenis?.start();
}

// Programmatic smooth-scroll to a section id, used by the overlay's link
// clicks. With autoToggle, unlockScroll() (lenis.start) only removes the
// overflow lock and clears `isStopped` asynchronously on a transitionend — so
// scrolling in the same tick is silently dropped. We poll `lenis.isStopped`
// and scroll the moment Lenis actually resumes (capped so we never loop
// forever; `force` covers the final call regardless).
export function scrollToAnchor(id: string): void {
  const target = document.getElementById(id);
  if (!target) return;
  if (!lenis) {
    target.scrollIntoView();
    return;
  }
  let frames = 0;
  const run = (): void => {
    if (lenis!.isStopped && frames++ < 30) {
      requestAnimationFrame(run);
      return;
    }
    lenis!.scrollTo(target, { force: true });
  };
  run();
}
