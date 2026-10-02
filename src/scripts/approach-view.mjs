const clamp = n => Math.min(1, Math.max(0, n));
const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };

/** Scroll changes the reading panel, while the shared particle scene keeps its clock. */
export function initApproach(selectPhase) {
  const section = document.querySelector('[data-approach]');
  if (!section) return () => {};
  const track = section.querySelector('[data-approach-scroll]');
  const stage = section.querySelector('[data-approach-stage]');
  const steps = [...section.querySelectorAll('[data-approach-step]')];
  const links = [...section.querySelectorAll('[data-approach-link]')];
  const figure = section.querySelector('[data-approach-figure]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let selected = -1, pinned = false, distance = 1, top = 24, lastHeight = 0;

  const select = next => {
    steps.forEach((step, i) => {
      const active = i === next;
      step.classList.toggle('is-active', active);
      step.inert = pinned && !active;
      if (pinned && !active) step.setAttribute('aria-hidden', 'true');
      else step.removeAttribute('aria-hidden');
    });
    links.filter(link => link.classList.contains('approach-number')).forEach(link => {
      if (Number(link.dataset.approachLink) === next) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
    if (selected === next) return;
    selected = next;
    section.dataset.phase = String(next);
    selectPhase(next);
  };

  const update = () => {
    if (pinned) {
      // Each phase has a reading interval and a short, non-overlapping dissolve.
      const progress = clamp((top - track.getBoundingClientRect().top) / distance);
      const position = progress * 3;
      const next = Math.min(2, Math.floor(position));
      const local = position - next;
      const opacity = (next ? smooth(local / .13) : 1)
        * (next < 2 ? 1 - smooth((local - .85) / .15) : 1);
      select(next);
      steps[next].style.setProperty('--approach-opacity', opacity.toFixed(3));
      steps[next].style.setProperty('--approach-emphasis', smooth((local - .12) / .48).toFixed(3));
    } else {
      const stacked = innerWidth < 760 && !(innerWidth >= 600 && innerHeight <= 620);
      const probe = stacked ? Math.min(innerHeight * .8, figure.getBoundingClientRect().bottom + 48) : innerHeight * .5;
      let next = 0;
      steps.forEach((step, i) => { if (step.getBoundingClientRect().top <= probe) next = i; });
      select(next);
    }
  };

  const layout = () => {
    // Measure the largest panel in the shared grid, so changing phase cannot shift the scene.
    section.classList.add('approach-enhanced');
    const height = stage.getBoundingClientRect().height;
    top = Math.max(24, Math.min(110, innerHeight * .12, innerHeight - height - 28));
    pinned = !motion.matches && height + top + 24 <= innerHeight;
    section.classList.toggle('approach-enhanced', pinned);
    section.style.setProperty('--approach-pin-top', `${top}px`);
    distance = Math.max(900, innerHeight * 2.15);
    const trackHeight = pinned ? height + distance : 0;
    if (trackHeight !== lastHeight) {
      if (pinned) track.style.height = `${trackHeight}px`;
      else track.style.removeProperty('height');
      lastHeight = trackHeight;
    }
    update();
  };

  const jumpToHash = () => {
    if (!pinned) return;
    const index = steps.findIndex(step => `#${step.id}` === location.hash);
    if (index < 0) return;
    const start = scrollY + track.getBoundingClientRect().top - top;
    scrollTo({ top: start + distance * (index + .18) / 3, behavior: 'instant' });
    update();
  };
  links.forEach(link => link.addEventListener('click', event => {
    if (!pinned || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    history.replaceState(null, '', link.hash);
    jumpToHash();
    const heading = steps[selected].querySelector('h3');
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }));
  addEventListener('hashchange', jumpToHash);
  addEventListener('resize', layout);
  motion.addEventListener('change', layout);
  // Observe content and fonts, rather than the scroll spacer that layout itself changes.
  const observer = new ResizeObserver(layout);
  steps.forEach(step => observer.observe(step.querySelector('.approach-copy')));
  observer.observe(figure.querySelector('.approach-frame'));
  layout();
  jumpToHash();
  return update;
}
