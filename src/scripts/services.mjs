import { serviceSceneMarkup } from './art/service-scenes.mjs';

const clamp = n => Math.max(0, Math.min(1, n));
export function serviceReveal(progress, index) {
  if (index === 0) return 1;
  const t = clamp((progress - [.015, .28, .55][index]) / .17);
  return t * t * (3 - 2 * t);
}

export function initServices() {
  const section = document.querySelector('[data-services]');
  if (!section) return;
  const stage = section.querySelector('[data-services-stage]');
  const shell = document.querySelector('[data-services-shell]');
  const page = document.querySelector('[data-services-page]');
  const cards = [...section.querySelectorAll('.service')];
  const svgs = cards.map(card => card.querySelector('[data-service-scene]'));
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let pinned = false, pinTop = 24, distance = 1, frame = 0, last = 0, near = false;
  const times = [0, 0, 0], lastSteps = [-1, -1, -1], visible = [false, false, false];
  let progress = 0, rawProgress = -1, pinStart = 0, pageStart = 0, stageOffset = 0, stageHeight = 0;
  let initialAnchor = location.hash === '#services' || location.hash === '#contact';
  for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown', 'focusin']) {
    addEventListener(event, () => { initialAnchor = false; }, { passive: true, once: true });
  }

  function update() {
    rawProgress = (scrollY - pinStart) / distance;
    progress = clamp(rawProgress);
    cards.forEach((card, i) => {
      const opacity = pinned ? serviceReveal(progress, i) : 1;
      card.style.setProperty('--service-opacity', opacity.toFixed(3));
      card.style.setProperty('--service-rise', `${((1 - opacity) * 12).toFixed(2)}px`);
      // Copy stays accessible throughout. These are articles, not interactive panels.
      const bounds = card.getBoundingClientRect();
      visible[i] = opacity > .02 && bounds.bottom > 0 && bounds.top < innerHeight;
    });
    schedule();
  }
  function layout() {
    const wasPinned = pinned, oldProgress = progress;
    const wasHeld = wasPinned && rawProgress >= 0 && rawProgress <= 1;
    stageHeight = stage.getBoundingClientRect().height;
    pinned = Boolean(shell && page) && innerWidth > 850 && !motion.matches && stageHeight + 48 <= innerHeight;
    pinTop = 24;
    distance = Math.max(900, innerHeight * 1.5);
    section.classList.toggle('services-pinned', pinned);
    if (pinned) {
      const bounds = page.getBoundingClientRect();
      pageStart = scrollY + shell.getBoundingClientRect().top;
      stageOffset = stage.getBoundingClientRect().top - bounds.top;
      pinStart = pageStart + stageOffset - pinTop;
      shell.style.height = `${bounds.height + distance}px`;
      shell.style.setProperty('--services-page-top', `${pinTop - stageOffset}px`);
    } else if (shell) {
      shell.style.removeProperty('height');
      shell.style.removeProperty('--services-page-top');
    }
    shell?.classList.toggle('services-page-pinned', pinned);
    if (wasHeld && pinned) {
      scrollTo({ top: pinStart + oldProgress * distance, behavior: 'instant' });
    } else if (wasHeld) {
      const card = cards[Math.min(2, Math.floor(oldProgress / .28))];
      scrollTo({ top: scrollY + card.getBoundingClientRect().top - 24, behavior: 'instant' });
    }
    if (motion.matches) {
      svgs.forEach((svg, i) => { svg.innerHTML = serviceSceneMarkup(i, .2); });
      lastSteps.fill(-1);
      cancelAnimationFrame(frame); frame = 0; last = 0;
    }
    update();
    if (initialAnchor) jumpToHash();
  }
  function schedule() {
    if (!frame && near && !motion.matches && !document.hidden && visible.some(Boolean)) frame = requestAnimationFrame(tick);
  }
  function tick(now) {
    frame = 0;
    if (!near || motion.matches || document.hidden || !visible.some(Boolean)) { last = 0; return; }
    // Fixed 16fps artwork clock. Hidden cards do no drawing, and the elapsed time
    // is capped so returning to a tab never jumps a person or a carried object.
    if (!last || now - last >= 62.5) {
      const dt = last ? Math.min(.12, (now - last) / 1000) : 0;
      last = now;
      svgs.forEach((svg, i) => {
        if (!visible[i]) return;
        times[i] += dt;
        const length = [224, 256, 384][i];
        const step = Math.floor(times[i] * 16) % length;
        if (step !== lastSteps[i]) {
          svg.innerHTML = serviceSceneMarkup(i, step / length);
          lastSteps[i] = step;
        }
      });
    }
    schedule();
  }
  new IntersectionObserver(entries => {
    near = entries.some(entry => entry.isIntersecting);
    if (!near) { cancelAnimationFrame(frame); frame = 0; last = 0; }
    update();
  }).observe(stage);
  new ResizeObserver(layout).observe(stage);
  // Hold the actual document, including the case study above and the footer
  // below. The outer shell supplies scroll travel without inserting a blank
  // full-screen section around the cards.
  if (page) new ResizeObserver(layout).observe(page);
  function jumpToHash() {
    if (!pinned) return;
    let target;
    try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch { return; }
    if (!target || !page.contains(target) || (!section.contains(target) && target.closest('[data-approach-shell]'))) return;
    if (target === page || target.id === 'main') return;
    const offset = target.getBoundingClientRect().top - page.getBoundingClientRect().top;
    const after = offset >= stageOffset + stageHeight;
    scrollTo({ top: section.contains(target) ? pinStart : pageStart + offset + (after ? distance : 0), behavior: 'instant' });
    update();
  }
  document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', event => {
    if (!pinned || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.hash !== '#services' && link.hash !== '#contact') return;
    event.preventDefault();
    history.pushState(null, '', link.hash);
    jumpToHash();
  }));
  addEventListener('hashchange', jumpToHash);
  addEventListener('popstate', jumpToHash);
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', layout);
  motion.addEventListener('change', layout);
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(frame); frame = 0; last = 0;
    schedule();
  });
  layout();
  jumpToHash();
  const initialScroll = scrollY, initialHash = location.hash;
  document.fonts?.ready.then(() => {
    const untouched = location.hash === initialHash && Math.abs(scrollY - initialScroll) < 2;
    layout();
    if (untouched) jumpToHash();
  });
}

if (typeof document !== 'undefined') initServices();
