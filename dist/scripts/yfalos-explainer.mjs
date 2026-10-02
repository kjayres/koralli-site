// A finite illustration of proposed architecture. This module calls no services.
const root = document.querySelector('[data-yf-explainer]');
if (root) {
  const tabs = [...root.querySelectorAll('[data-yf-tab]')];
  const panels = [...root.querySelectorAll('[data-yf-panel]')];
  const player = root.querySelector('.yf-player');
  const play = root.querySelector('[data-yf-play]');
  const playLabel = root.querySelector('[data-yf-play-label]');
  const status = root.querySelector('.yf-play-status');
  const mobileSummary = root.querySelector('.yf-mobile-summary');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let active = 0;
  let frame = 0;
  let startedAt = null;
  let playing = false;

  function reset() {
    cancelAnimationFrame(frame);
    frame = 0;
    playing = false;
    startedAt = null;
    for (const panel of panels) {
      panel.querySelector('.yf-grains').replaceChildren();
      panel.querySelectorAll('[data-yf-level]').forEach(node => node.classList.remove('is-current', 'is-reached'));
    }
    play.removeAttribute('aria-busy');
  }

  function select(index, focus = false) {
    reset();
    active = index;
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    status.textContent = 'Follow one illustrative flow.';
    mobileSummary.textContent = tabs[index].querySelector('p').textContent;
    playLabel.textContent = 'See the flow';
    if (focus) tabs[index].focus();
  }

  function replay() {
    reset();
    const panel = panels[active];
    const nodes = [...panel.querySelectorAll('[data-yf-level]:not(.yf-node-alternative)')];
    playLabel.textContent = 'Replay';
    if (reducedMotion.matches) {
      nodes.forEach(node => node.classList.add('is-reached'));
      status.textContent = 'All steps shown. Motion is reduced.';
      return;
    }
    const layer = panel.querySelector('.yf-grains');
    const paths = [...panel.querySelectorAll('[data-yf-edge]:not(.yf-edge-quiet):not(.yf-edge-return)')].map(path => {
      const grains = Array.from({length:3}, (_, i) => {
        const grain = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        grain.setAttribute('r', String(3.2 - i * .55));
        grain.setAttribute('opacity', '0');
        layer.append(grain);
        return grain;
      });
      return {path, grains, step:Number(path.dataset.yfEdge), length:path.getTotalLength()};
    });
    const stepDuration = 920;
    const end = (Math.max(...paths.map(item => item.step)) + 1) * stepDuration + 420;
    playing = true;
    status.textContent = 'Illustrating the flow…';
    play.setAttribute('aria-busy', 'true');
    function draw(now) {
      if (!playing) return;
      if (startedAt === null) startedAt = now;
      const elapsed = now - startedAt;
      const step = Math.min(3, Math.floor(elapsed / stepDuration));
      nodes.forEach(node => {
        const level = Number(node.dataset.yfLevel);
        node.classList.toggle('is-current', level === step);
        node.classList.toggle('is-reached', level < step);
      });
      for (const {path, grains, step:edgeStep, length} of paths) {
        grains.forEach((grain, i) => {
          const progress = (elapsed - edgeStep * stepDuration - 100 - i * 75) / 600;
          if (progress < 0 || progress > 1) { grain.setAttribute('opacity', '0'); return; }
          const point = path.getPointAtLength(progress * length);
          grain.setAttribute('cx', String(point.x));
          grain.setAttribute('cy', String(point.y));
          grain.setAttribute('opacity', String((1 - i * .18) * Math.min(1, progress * 10, (1 - progress) * 10)));
        });
      }
      if (elapsed < end) frame = requestAnimationFrame(draw);
      else {
        reset();
        nodes.forEach(node => node.classList.add('is-reached'));
        status.textContent = 'Illustration complete.';
      }
    }
    frame = requestAnimationFrame(draw);
  }

  root.dataset.yfEnhanced = '';
  const selectors = root.querySelector('.yf-selectors');
  selectors.setAttribute('role', 'tablist');
  const compactLayout = matchMedia('(max-width: 759px)');
  const orientTabs = () => selectors.setAttribute('aria-orientation', compactLayout.matches ? 'horizontal' : 'vertical');
  orientTabs();
  compactLayout.addEventListener('change', orientTabs);
  tabs.forEach((tab, index) => {
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panels[index].id);
    panels[index].setAttribute('role', 'tabpanel');
    panels[index].tabIndex = 0;
    tab.addEventListener('click', event => { event.preventDefault(); select(index); });
    tab.addEventListener('keydown', event => {
      if (event.key === ' ') { event.preventDefault(); select(index); return; }
      const next = {ArrowDown:(index + 1) % tabs.length, ArrowRight:(index + 1) % tabs.length, ArrowUp:(index + tabs.length - 1) % tabs.length, ArrowLeft:(index + tabs.length - 1) % tabs.length, Home:0, End:tabs.length - 1}[event.key];
      if (next !== undefined) { event.preventDefault(); select(next, true); }
    });
  });
  player.hidden = false;
  mobileSummary.hidden = false;
  const hashPanel = () => panels.findIndex(panel => '#' + panel.id === location.hash);
  select(Math.max(0, hashPanel()));
  window.addEventListener('hashchange', () => { const index = hashPanel(); if (index >= 0) select(index); });
  play.addEventListener('click', replay);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && playing) { reset(); status.textContent = 'Replay the illustration when ready.'; }
  });
  reducedMotion.addEventListener('change', () => {
    reset(); status.textContent = 'Follow one illustrative flow.';
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting && playing) { reset(); status.textContent = 'Replay the illustration when ready.'; }
    });
    observer.observe(root.querySelector('.yf-panels'));
  }

  // Reuse the website's record geometry in one small, static grouping.
  const recordGrains = root.querySelector('.yf-record-grains');
  import('./art/inspection-objects.mjs?v=93ca869ca071').then(({drawInspectionObject}) => {
    const context = recordGrains.getContext('2d');
    if (!context) { recordGrains.remove(); return; }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    recordGrains.width = Math.round(102 * dpr);
    recordGrains.height = Math.round(18 * dpr);
    context.scale(dpr, dpr);
    for (let i = 0; i < 6; i++) drawInspectionObject(context, 6 + i * 18, 9, 5.5, 'Records', false);
  }).catch(() => recordGrains.remove());
}
