// Scroll-spy: highlights the nav link(s) matching the section currently in
// view. Targets both the desktop bar and the mobile overlay — every nav link
// carries a data-anchor, so a single query covers both.

export function mountActiveNav(): void {
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
