// Mobile "terminal boot" overlay menu + desktop nav-link hover scramble.
// Mounted once from Base.astro. The overlay markup lives in Nav.astro.

import { scrambleEl, bindHoverScramble } from '@/lib/reveal';
import { lockScroll, unlockScroll, scrollToAnchor } from '@/lib/smooth-scroll';

export function mountNavMenu(): void {
  const toggle = document.querySelector<HTMLButtonElement>('.nav-toggle');
  const overlay = document.getElementById('nav-overlay');
  if (!toggle || !overlay) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Desktop: glitch-scramble the bar's labels on hover (skip under reduced motion).
  if (!reduced) {
    document
      .querySelectorAll<HTMLAnchorElement>('nav.top ul a:not(.blog)')
      .forEach((a) => bindHoverScramble(a, a, 500));
  }

  const overlayLinks = [...overlay.querySelectorAll<HTMLAnchorElement>('.ov-link')];
  const overlayLabels = [...overlay.querySelectorAll<HTMLElement>('.ov-link .ov-label')];

  const focusables = (): HTMLElement[] =>
    [...overlay.querySelectorAll<HTMLElement>('a[href]')];

  let open = false;
  let lastFocus: HTMLElement | null = null;

  function openMenu(): void {
    if (open) return;
    open = true;
    lastFocus = document.activeElement as HTMLElement | null;
    overlay!.classList.add('is-open');
    overlay!.removeAttribute('aria-hidden');
    toggle!.setAttribute('aria-expanded', 'true');
    toggle!.setAttribute('aria-label', 'Close menu');
    lockScroll();
    // Defer one frame: the overlay isn't focusable until its visibility flips
    // on the next style flush, so a synchronous focus() would be a no-op.
    requestAnimationFrame(() => (focusables()[0] ?? overlay!).focus());
    if (!reduced) {
      overlayLabels.forEach((label, i) => {
        const text = label.textContent ?? '';
        window.setTimeout(() => scrambleEl(label, text, 600), i * 45);
      });
    }
  }

  function closeMenu(returnFocus = true): void {
    if (!open) return;
    open = false;
    overlay!.classList.remove('is-open');
    overlay!.setAttribute('aria-hidden', 'true');
    toggle!.setAttribute('aria-expanded', 'false');
    toggle!.setAttribute('aria-label', 'Open menu');
    unlockScroll();
    if (returnFocus) (lastFocus ?? toggle!).focus();
  }

  toggle.addEventListener('click', () => (open ? closeMenu() : openMenu()));

  // Selecting a destination: close the menu (which unlocks scroll), then scroll
  // to the section. scrollToAnchor waits for Lenis to actually resume (its
  // autoToggle clears `isStopped` asynchronously) before scrolling, so this is
  // deterministic. External links (no data-anchor, e.g. Blog) navigate normally.
  // On home, intercept anchor clicks to smooth-scroll. On non-home routes,
  // close the menu and let the browser navigate to /#anchor — the initial-hash
  // scroll handler in smooth-scroll.ts will jump to the section after load.
  const isHome =
    window.location.pathname === '/' || window.location.pathname === '/index.html';
  overlayLinks.forEach((a) =>
    a.addEventListener('click', (e) => {
      const anchor = a.dataset.anchor;
      closeMenu(false);
      if (isHome && anchor) {
        e.preventDefault();
        scrollToAnchor(anchor);
      }
    })
  );

  document.addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
      return;
    }
    if (e.key === 'Tab') {
      const f = focusables();
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Close if the viewport grows back to desktop while the menu is open.
  window.matchMedia('(min-width: 721px)').addEventListener('change', (e) => {
    if (e.matches && open) closeMenu(false);
  });

  // Start closed: hide from the accessibility tree until opened.
  overlay.setAttribute('aria-hidden', 'true');
}
