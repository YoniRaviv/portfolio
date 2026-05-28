// Scroll-spy on the home page; static highlight on non-home routes.
//
// On `/`, walks `data-anchor` links + matching sections to highlight the
// section currently in view. On any non-home route, marks the link whose
// href matches `location.pathname` as `.active` and skips the scroll spy.

export function mountActiveNav(): void {
  const isHome =
    window.location.pathname === '/' || window.location.pathname === '/index.html';

  if (!isHome) {
    // Static highlight for top-level routes (e.g. /thoughts/*).
    const links = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')];
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    links.forEach((a) => {
      const href = a.getAttribute('href') ?? '';
      // Only consider absolute-path links to top-level routes.
      if (!href.startsWith('/')) return;
      const trimmed = href.replace(/\/+$/, '') || '/';
      if (path === trimmed || path.startsWith(trimmed + '/')) {
        a.classList.add('active');
      }
    });
    return;
  }

  // Home-page scroll spy.
  const navLinks = [...document.querySelectorAll<HTMLAnchorElement>('a[data-anchor]')];
  if (navLinks.length === 0) return;

  const sectionIds = [...new Set(navLinks.map((a) => a.dataset.anchor!))];
  const sections = sectionIds
    .map((id) => document.getElementById(id))
    .filter((s): s is HTMLElement => s !== null);

  function updateActive(): void {
    const y = window.scrollY + window.innerHeight * 0.35;
    let activeId: string | undefined = sections[0]?.id;
    sections.forEach((s) => {
      if (s.offsetTop <= y) activeId = s.id;
    });
    navLinks.forEach((a) => a.classList.toggle('active', a.dataset.anchor === activeId));
  }

  window.addEventListener('scroll', updateActive, { passive: true });
  updateActive();
}
