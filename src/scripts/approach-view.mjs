/** Normal document scrolling selects the phase; animation keeps its own clock. */
export function initApproach(selectPhase) {
  const section = document.querySelector('[data-approach]');
  if (!section) return () => {};
  const steps = [...section.querySelectorAll('[data-approach-step]')];
  const links = [...section.querySelectorAll('[data-approach-link]')];
  const figure = section.querySelector('[data-approach-figure]');
  let selected = -1;
  const update = () => {
    const mobile = innerWidth < 760 && !(innerWidth >= 600 && innerHeight <= 620);
    const probe = mobile ? Math.min(innerHeight * .8, figure.getBoundingClientRect().bottom + 48) : innerHeight * .50;
    let next = 0;
    steps.forEach((step, i) => { if (step.getBoundingClientRect().top <= probe) next = i; });
    // A small buffer stops trackpad movements at a boundary restarting a phase.
    if (selected >= 0 && next > selected && steps[next].getBoundingClientRect().top > probe - 22) next = selected;
    if (selected >= 0 && next < selected && steps[selected].getBoundingClientRect().top < probe + 22) next = selected;
    if (next === selected) return;
    selected = next;
    section.dataset.phase = String(next);
    steps.forEach((step, i) => step.classList.toggle('is-active', i === next));
    links.forEach(link => {
      if (Number(link.dataset.approachLink) === next) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
    selectPhase(next);
  };
  new ResizeObserver(update).observe(section);
  update();
  return update;
}
