// Scroll-spy: highlights the nav link matching the section currently in view.

export function mountActiveNav(): void {
  const navLinks = [...document.querySelectorAll<HTMLAnchorElement>('nav.top ul a[data-anchor]')];
  const sectionIds = navLinks.map((a) => a.dataset.anchor!);
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
