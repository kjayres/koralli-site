/** Normal document scrolling selects the phase; animation keeps its own clock. */
export function initApproach(selectPhase) {
  const section = document.querySelector('[data-approach]');
  if (!section) return () => {};
  const steps = [...section.querySelectorAll('[data-approach-step]')];
  const links = [...section.querySelectorAll('[data-approach-link]')];
  const figure = section.querySelector('[data-approach-figure]');
  const frame = figure.querySelector('.approach-frame');
  const copies = steps.map(step => step.querySelector('.approach-copy'));
  const isStacked = () => innerWidth < 760 && !(innerWidth >= 600 && innerHeight <= 620);
  let selected = -1;
  const align = () => {
    const height = frame.getBoundingClientRect().height;
    const offsets = copies.map(copy => isStacked() ? 0 : Math.max(0, (height - copy.getBoundingClientRect().height) / 2));
    steps.forEach((step, i) => {
      step.style.setProperty('--approach-copy-offset', `${offsets[i]}px`);
      step.style.setProperty('--approach-next-offset', `${offsets[i + 1] || 0}px`);
    });
    // At the entrance the heading sits 40% down the square; sticky clearance is separate.
    const heading = copies[0].querySelector('h3').getBoundingClientRect();
    const headingCentre = heading.top + heading.height / 2 - copies[0].getBoundingClientRect().top;
    const lift = innerWidth >= 760 ? Math.max(0, height * .4 - offsets[0] - headingCentre) : 0;
    section.style.setProperty('--approach-entry-lift', `${lift}px`);
  };
  const update = () => {
    const mobile = isStacked();
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
  const layout = new ResizeObserver(() => { align(); update(); });
  [frame, ...copies].forEach(element => layout.observe(element));
  align();
  update();
  return update;
}
