// Blade-sweep page transition. Intercepts clicks on [data-thought-link],
// plays the forward sweep, prefetches the destination, then navigates.
//
// On the destination page, the overlay is already covering the viewport
// (set by the inline FOUC script in Base.astro), and we play the exit
// sweep to reveal the page.
//
// Falls back to normal navigation under prefers-reduced-motion or when
// the click had a modifier / used the middle button.

const ENTER_MS = 620;
const HOLD_FLOOR_MS = 200;
const NAV_MAX_WAIT_MS = 2000;
const EXIT_MS = 700;
const ARRIVE_FLAG = 'tx-arrive';

function isReducedMotion(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function shouldBypass(e: MouseEvent): boolean {
  if (e.button !== 0) return true;                 // middle / right
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return true;
  if (isReducedMotion()) return true;
  return false;
}

function lockScroll(): void {
  document.documentElement.style.overflow = 'hidden';
}
function unlockScroll(): void {
  document.documentElement.style.overflow = '';
}

function prefetch(url: string): Promise<void> {
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    link.as = 'document';
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.appendChild(link);
    // Hard cap so we never hang on a flaky network.
    setTimeout(() => resolve(), NAV_MAX_WAIT_MS);
  });
}

function setState(tx: HTMLElement, state: 'idle' | 'enter' | 'hold' | 'exit'): void {
  tx.dataset.txState = state;
}

async function playForward(href: string): Promise<void> {
  const tx = document.getElementById('tx');
  if (!tx) {
    window.location.href = href;
    return;
  }
  lockScroll();
  setState(tx, 'enter');

  const prefetchPromise = prefetch(href);
  await new Promise((r) => setTimeout(r, ENTER_MS));
  setState(tx, 'hold');

  const holdStart = performance.now();
  await prefetchPromise;
  const heldFor = performance.now() - holdStart;
  if (heldFor < HOLD_FLOOR_MS) {
    await new Promise((r) => setTimeout(r, HOLD_FLOOR_MS - heldFor));
  }

  // Flag the next page to play the exit sweep.
  try { sessionStorage.setItem(ARRIVE_FLAG, '1'); } catch (e) { /* ignore */ }
  window.location.href = href;
}

function playArrival(): void {
  const tx = document.getElementById('tx');
  if (!tx) {
    document.documentElement.classList.remove('tx-arriving');
    try { sessionStorage.removeItem(ARRIVE_FLAG); } catch (e) { /* ignore */ }
    return;
  }
  // The overlay is currently covering the page (via html.tx-arriving CSS).
  // Switch into the explicit `exit` animated state on the next frame, then
  // clean up after the animation finishes.
  requestAnimationFrame(() => {
    setState(tx, 'exit');
    setTimeout(() => {
      setState(tx, 'idle');
      document.documentElement.classList.remove('tx-arriving');
      unlockScroll();
      try { sessionStorage.removeItem(ARRIVE_FLAG); } catch (e) { /* ignore */ }
    }, EXIT_MS);
  });
}

function onClick(e: MouseEvent): void {
  const target = e.target as Element | null;
  if (!target) return;
  const link = target.closest('a[data-thought-link]') as HTMLAnchorElement | null;
  if (!link) return;
  if (shouldBypass(e)) return;

  const href = link.getAttribute('href');
  if (!href) return;
  // Only intercept same-origin navigations.
  try {
    const u = new URL(href, window.location.href);
    if (u.origin !== window.location.origin) return;
  } catch (err) {
    return;
  }

  e.preventDefault();
  playForward(href).catch(() => {
    // If anything blows up, fall back to direct nav.
    window.location.href = href;
  });
}

export function mountThoughtsTransition(): void {
  // Replay arrival animation if we got here via a transition click.
  let shouldArrive = false;
  try { shouldArrive = sessionStorage.getItem(ARRIVE_FLAG) === '1'; } catch (e) { /* ignore */ }
  if (shouldArrive) playArrival();

  document.addEventListener('click', onClick, { capture: true });
}
