// Updates the vertical progress fill on post pages. No-op on pages without
// the `[data-thought-progress]` element. RAF-throttled. Quiet under
// prefers-reduced-motion (snaps without animating).

export function mountReadingProgress(): void {
  const fill = document.querySelector<HTMLElement>('[data-thought-progress]');
  if (!fill) return;
  const article = document.querySelector<HTMLElement>('article.thought');
  if (!article) return;

  let raf = 0;
  function tick(): void {
    raf = 0;
    const articleTop = article!.offsetTop;
    const scrollable = Math.max(1, article!.scrollHeight - window.innerHeight);
    const progressed = Math.min(
      1,
      Math.max(0, (window.scrollY - articleTop + window.innerHeight * 0.2) / scrollable)
    );
    fill!.style.height = `${progressed * 100}%`;
  }

  window.addEventListener(
    'scroll',
    () => {
      if (raf) return;
      raf = requestAnimationFrame(tick);
    },
    { passive: true }
  );
  tick();
}
