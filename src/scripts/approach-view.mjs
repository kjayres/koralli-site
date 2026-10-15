const clamp = n => Math.min(1, Math.max(0, n));
const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
const fadeSpan = .28;

/** Scroll changes the reading panel, while the shared particle scene keeps its clock. */
export function initApproach(selectPhase) {
  const section = document.querySelector('[data-approach]');
  if (!section) return () => {};
  const stage = section.querySelector('[data-approach-stage]');
  const shell = document.querySelector('[data-approach-shell]');
  const page = document.querySelector('[data-approach-page]');
  const steps = [...section.querySelectorAll('[data-approach-step]')];
  const links = [...section.querySelectorAll('[data-approach-link]')];
  const figure = section.querySelector('[data-approach-figure]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let selected = -1, pinned = false, distance = 1, top = 24;
  let pinStart = 0, pageStart = 0, stageOffset = 0, stageHeight = 0;
  let measuredViewportHeight = innerHeight, measuredViewportWidth = innerWidth;
  let readingFlow = false;

  const flowProbe = () => {
    const stacked = innerWidth < 760 && !(innerWidth >= 600 && innerHeight <= 620);
    return stacked ? Math.min(innerHeight * .8, figure.getBoundingClientRect().bottom + 48) : innerHeight * .5;
  };

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
    // CSS can reflow before the resize handler runs. Preserve the last reading
    // position until layout has measured the new viewport and restored it.
    if (innerHeight !== measuredViewportHeight || innerWidth !== measuredViewportWidth) return;
    if (pinned) {
      // The copy dissolves through the paper, leaving one readable panel at a time.
      const progress = clamp((scrollY - pinStart) / distance);
      const position = progress * 3;
      const next = Math.min(2, Math.floor(position));
      const local = position - next;
      const opacity = (next ? smooth(local / fadeSpan) : 1)
        * (next < 2 ? 1 - smooth((local - (1 - fadeSpan)) / fadeSpan) : 1);
      select(next);
      steps[next].style.setProperty('--approach-opacity', opacity.toFixed(3));
      steps[next].style.setProperty('--approach-emphasis', smooth((local - .12) / .48).toFixed(3));
    } else {
      const probe = flowProbe();
      let next = 0;
      steps.forEach((step, i) => { if (step.getBoundingClientRect().top <= probe) next = i; });
      select(next);
      const bounds = steps[next].getBoundingClientRect();
      readingFlow = bounds.top < innerHeight && bounds.bottom > 0;
    }
  };

  const layout = () => {
    const previousProgress = (scrollY - pinStart) / distance;
    const wasPinned = pinned;
    const wasHeld = pinned && previousProgress >= 0 && previousProgress <= 1;
    const previousStart = pinStart, previousDistance = distance;
    const previousStep = selected >= 0 ? steps[selected].getBoundingClientRect() : null;
    const wasReadingFlow = !pinned && readingFlow;
    const minimumInset = innerWidth < 760 ? 16 : 24;
    section.classList.add('approach-enhanced');
    stageHeight = stage.getBoundingClientRect().height;
    pinned = Boolean(shell && page) && !motion.matches && stageHeight + minimumInset * 2 <= innerHeight + 1;
    section.classList.toggle('approach-enhanced', pinned);
    top = Math.max(minimumInset, (innerHeight - stageHeight) / 2);
    section.style.setProperty('--approach-pin-top', `${top}px`);
    distance = Math.max(1200, innerHeight * 2.85);
    if (pinned) {
      // The main's real neighbours travel with the scene. Its outer shell,
      // rather than the approach section, supplies the original scroll runway.
      const pageRect = page.getBoundingClientRect();
      pageStart = scrollY + shell.getBoundingClientRect().top;
      stageOffset = stage.getBoundingClientRect().top - pageRect.top;
      pinStart = pageStart + stageOffset - top;
      shell.style.height = `${pageRect.height + distance}px`;
      shell.style.setProperty('--approach-page-top', `${top - stageOffset}px`);
    } else if (shell) {
      shell.style.removeProperty('height');
      shell.style.removeProperty('--approach-page-top');
    }
    shell?.classList.toggle('approach-page-pinned', pinned);
    if (wasHeld && pinned && (Math.abs(previousStart - pinStart) > .5 || previousDistance !== distance)) {
      scrollTo({ top: pinStart + previousProgress * distance, behavior: 'instant' });
    } else if (wasHeld && !pinned) {
      // Keep the same phase in view when a small screen or reduced motion
      // exposes the ordinary, stacked reading layout.
      const desiredTop = Math.max(minimumInset, Math.min(previousStep.top, flowProbe() - 1));
      scrollTo({ top: scrollY + steps[selected].getBoundingClientRect().top - desiredTop, behavior: 'instant' });
    } else if (!wasPinned && pinned && wasReadingFlow) {
      scrollTo({ top: pinStart + distance * (selected + fadeSpan + .08) / 3, behavior: 'instant' });
    }
    measuredViewportHeight = innerHeight;
    measuredViewportWidth = innerWidth;
    update();
  };

  const hashTarget = hash => {
    try { return document.getElementById(decodeURIComponent(hash.slice(1))); }
    catch { return null; }
  };
  const targetPosition = target => {
    const offset = target.getBoundingClientRect().top - page.getBoundingClientRect().top;
    const margin = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    return pageStart + offset + (offset >= stageOffset + stageHeight ? distance : 0) - margin;
  };
  const jumpToHash = () => {
    if (!pinned) return;
    const index = steps.findIndex(step => `#${step.id}` === location.hash);
    const target = hashTarget(location.hash);
    if (index < 0 && (!target || !page.contains(target))) return;
    const destination = index >= 0 ? pinStart + distance * (index + fadeSpan + .08) / 3
      : stage.contains(target) ? pinStart : targetPosition(target);
    scrollTo({ top: destination, behavior: 'instant' });
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
  // Native anchors cannot account for a sticky ancestor's held scroll interval.
  // Resolve the real target, without duplicating content or intercepting wheels.
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    if (links.includes(link)) return;
    link.addEventListener('click', event => {
      const target = hashTarget(link.hash);
      if (!pinned || !target || !page.contains(target) || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      history.pushState(null, '', link.hash);
      jumpToHash();
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });
  page?.addEventListener('focusin', event => {
    if (!pinned || stage.contains(event.target)) return;
    const bounds = event.target.getBoundingClientRect();
    if (bounds.top < 0 || bounds.bottom > innerHeight) {
      scrollTo({ top: targetPosition(event.target), behavior: 'instant' });
      update();
    }
  });
  addEventListener('hashchange', jumpToHash);
  addEventListener('popstate', jumpToHash);
  addEventListener('resize', layout);
  motion.addEventListener('change', layout);
  // Observe content and fonts, rather than the scroll spacer that layout itself changes.
  const observer = new ResizeObserver(layout);
  steps.forEach(step => observer.observe(step.querySelector('.approach-copy')));
  observer.observe(figure.querySelector('.approach-frame'));
  observer.observe(section.querySelector('.approach-heading'));
  observer.observe(section.querySelector('.approach-continuation'));
  if (page) observer.observe(page);
  layout();
  jumpToHash();
  const initialHash = location.hash, initialScroll = scrollY;
  document.fonts?.ready.then(() => {
    const untouched = location.hash === initialHash && Math.abs(scrollY - initialScroll) < 2;
    layout();
    if (untouched) jumpToHash();
  });
  return update;
}
