import { serviceSceneMarkup } from './art/service-scenes.mjs?v=e5f138a7668b';

const clamp = n => Math.max(0, Math.min(1, n));
export function serviceReveal(progress, index) {
  const t = clamp((progress - [.015, .28, .55][index]) / .17);
  return t * t * (3 - 2 * t);
}

export function initServices() {
  const section = document.querySelector('[data-services]');
  if (!section) return;
  const stage = section.querySelector('[data-services-stage]');
  const cards = [...section.querySelectorAll('.service')];
  const svgs = cards.map(card => card.querySelector('[data-service-scene]'));
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let pinned = false, pinTop = 24, distance = 1, frame = 0, last = 0, near = false;
  const times = [0, 0, 0], lastSteps = [-1, -1, -1], visible = [false, false, false];
  let progress = 0;

  function update() {
    const rect = section.getBoundingClientRect();
    const padding = parseFloat(getComputedStyle(section).paddingTop) || 0;
    progress = clamp((pinTop - rect.top - padding) / distance);
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
    const wasHeld = wasPinned && oldProgress > 0 && oldProgress < 1;
    const height = stage.getBoundingClientRect().height;
    pinned = innerWidth > 850 && !motion.matches && height + 48 <= innerHeight;
    pinTop = Math.max(24, (innerHeight - height) / 2);
    distance = Math.max(1100, innerHeight * 1.8);
    section.classList.toggle('services-pinned', pinned);
    section.style.setProperty('--services-top', `${pinTop}px`);
    section.style.height = pinned ? `${height + distance + 150}px` : '';
    if (wasHeld && pinned) {
      const padding = parseFloat(getComputedStyle(section).paddingTop) || 0;
      scrollTo({ top: scrollY + section.getBoundingClientRect().top + padding - pinTop + oldProgress * distance, behavior: 'instant' });
    }
    if (motion.matches) {
      svgs.forEach((svg, i) => { svg.innerHTML = serviceSceneMarkup(i, .2); });
      lastSteps.fill(-1);
      cancelAnimationFrame(frame); frame = 0; last = 0;
    }
    update();
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
        const step = Math.floor(times[i] * 16) % 192;
        if (step !== lastSteps[i]) {
          svg.innerHTML = serviceSceneMarkup(i, step / 192);
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
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', layout);
  motion.addEventListener('change', layout);
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(frame); frame = 0; last = 0;
    schedule();
  });
  document.fonts?.ready.then(layout);
  layout();
}

if (typeof document !== 'undefined') initServices();
