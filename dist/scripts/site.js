const motion = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = n => Math.min(1, Math.max(0, n));
const canvasStates = [];
const coralName = document.querySelector('[data-coral-name]');
let frame = 0;
let lastTime = 0;
let updateApproach = () => {};
const artworkLoaders = {
  wave: () => import('./art/wave.mjs?v=6116993ede5c'),
  research: () => import('./art/research.mjs?v=6116993ede5c'),
  approach: () => import('./art/approach.mjs?v=6116993ede5c'),
  coral: () => import('./art/coral.mjs?v=6116993ede5c'),
  reef: () => import('./art/reef.mjs?v=6116993ede5c'),
  'journal-water': () => import('./art/journal-water.mjs?v=6116993ede5c')
};

function artworkFailed(state, error) {
  if (state.failed) return;
  state.failed = true;
  state.host.classList.remove('art-ready');
  state.host.classList.add('art-failed');
  console.error(`Unable to display ${state.kind} artwork:`, error);
}

async function warmReefArtwork(state) {
  if (state.failed || document.hidden || !state.w || !state.h) return;
  const revision = state.reefRevision = (state.reefRevision || 0) + 1;
  const isCurrent = () => revision === state.reefRevision && !state.failed && !document.hidden;
  state.reefReady = false;
  state.host.classList.remove('art-ready');
  try {
    if (state.reef.prewarmReef) {
      if (!await state.reef.prewarmReef(state, isCurrent)) return;
    } else state.reef.seedReef(state);
    if (!isCurrent()) return;
    state.reefReady = true;
    paint(state);
    schedule();
  } catch (error) { if (isCurrent()) artworkFailed(state, error); }
}

async function prepareArtwork(state) {
  if (state.loading || state.failed) return;
  state.loading = true;
  try {
    state.art = await artworkLoaders[state.kind]();
    if (state.kind === 'reef') {
      state.reef = new state.art.Reef();
    }
    if (state.kind === 'journal-water') {
      const { initJournalLettering } = await import('./art/journal-lettering.mjs?v=6116993ede5c');
      state.updateJournalLettering = initJournalLettering();
    }
    state.loaded = true;
    if (state.kind === 'reef') { await warmReefArtwork(state); return; }
    paint(state);
    schedule();
  } catch (error) { artworkFailed(state, error); }
}

function paint(state, dt = 0) {
  const { ctx, w, h, kind } = state;
  if (!state.loaded || state.failed || !w || !h) return;
  if (kind === 'reef' && !state.reefReady) return;
  try {
    ctx.clearRect(0, 0, w, h);
    if (!motion.matches) state.time += dt;
    if (state.pointer) {
      const blend = 1 - Math.exp(-dt * 9);
      state.pointer.x += (state.pointerTarget.x - state.pointer.x) * blend;
      state.pointer.y += (state.pointerTarget.y - state.pointer.y) * blend;
      state.pointer.strength += (state.pointerTarget.strength - state.pointer.strength) * blend;
    }
    const options = { reducedMotion: motion.matches, pointer: state.pointer, variant: state.variant };
    if (kind === 'wave') state.art.drawWave(ctx, w, h, state.time, options);
    if (kind === 'research') state.art.drawResearch(ctx, w, h, state.time, options);
    if (kind === 'approach') {
      const presentation = state.art.drawApproach(ctx, w, h, state.time, { ...options, phase: state.phase || 0 });
      if (presentation) {
        for (const key of ['caption', 'detail']) {
          const element = state[key];
          if (element && element.textContent !== presentation[key]) element.textContent = presentation[key];
        }
      }
    }
    if (kind === 'journal-water') {
      state.art.drawJournalWater(ctx, w, h, state.time, options);
      state.updateJournalLettering(state.time, options);
    }
    if (kind === 'coral') {
      state.art.drawCoralTrace(ctx, w, h, state.time, { ...options, labels: !coralName });
      const study = state.art.coralTraceState(state.time, options);
      if (coralName && coralName.textContent !== study.name) coralName.textContent = study.name;
    }
    if (kind === 'reef' && state.reef) {
      if (motion.matches || state.paused) state.reef.drawReef(state);
      else {
        state.fraction += dt * 60;
        const steps = Math.floor(state.fraction);
        state.fraction -= steps;
        state.t += steps;
        state.reef.stepReef(state);
      }
    }
    state.host.classList.add('art-ready');
  } catch (error) { artworkFailed(state, error); }
}

function tick(now) {
  frame = 0;
  const dt = lastTime ? Math.min(.05, (now - lastTime) / 1000) : 0;
  lastTime = now;
  canvasStates.filter(state => state.visible && !state.paused).forEach(state => paint(state, dt));
  schedule();
}

function schedule() {
  if (!frame && !motion.matches && !document.hidden && canvasStates.some(state => state.visible && !state.paused && state.loaded && !state.failed && (state.kind !== 'reef' || state.reefReady))) frame = requestAnimationFrame(tick);
}

for (const canvas of document.querySelectorAll('canvas[data-art]')) {
  const state = { canvas, host: canvas.parentElement, kind: canvas.dataset.art, w: 0, h: 0, t: 0, time: 0, fraction: 0, visible: false };
  // Reuse the existing no-script description while artwork loads or if it fails.
  const fallback = state.host.querySelector('noscript');
  if (fallback) {
    const template = document.createElement('template');
    template.innerHTML = fallback.textContent;
    state.host.insertBefore(template.content, canvas);
  }
  let ctx;
  try { ctx = canvas.getContext('2d'); } catch (error) { artworkFailed(state, error); continue; }
  if (!ctx) { artworkFailed(state, new Error('Canvas is unavailable.')); continue; }
  state.ctx = ctx;
  canvas.addEventListener('contextlost', () => artworkFailed(state, new Error('Canvas context was lost.')));
  if (state.kind === 'approach') {
    const figure = canvas.closest('[data-approach-figure]');
    state.caption = figure.querySelector('[data-approach-caption]');
    state.detail = figure.querySelector('[data-approach-detail]');
  }
  if (state.kind === 'wave') {
    state.pointer = { x: 0, y: 0, strength: 0 };
    state.pointerTarget = { x: 0, y: 0, strength: 0 };
    const hero = canvas.parentElement;
    hero.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch' || motion.matches) return;
      const rect = hero.getBoundingClientRect();
      state.pointerTarget = { x: event.clientX - rect.left, y: event.clientY - rect.top, strength: 1 };
      if (state.pointer.strength < .01) Object.assign(state.pointer, { x: state.pointerTarget.x, y: state.pointerTarget.y });
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { state.pointerTarget.strength = 0; });
  }
  const resize = () => {
    if (state.failed) return;
    try {
      const rect = state.kind === 'approach'
        ? { width: canvas.parentElement.clientWidth, height: canvas.parentElement.clientHeight }
        : canvas.parentElement.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, state.kind === 'journal-water' ? 1.5 : 2);
      if (state.w === rect.width && state.h === rect.height && state.dpr === dpr) return;
      state.w = rect.width;
      state.h = rect.height;
      state.dpr = dpr;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (state.kind === 'reef' && state.loaded) warmReefArtwork(state);
      else paint(state);
    } catch (error) { artworkFailed(state, error); }
  };
  new ResizeObserver(resize).observe(canvas.parentElement);
  new IntersectionObserver(entries => {
    state.visible = entries[0].isIntersecting;
    lastTime = 0;
    if (state.visible && state.kind !== 'reef') paint(state);
    schedule();
  }).observe(canvas);
  canvasStates.push(state);
  resize();
  if (state.kind === 'wave' || state.kind === 'journal-water') prepareArtwork(state);
  else {
    const nearby = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      nearby.disconnect();
      if (state.kind === 'reef') {
        const still = state.host.querySelector('.reef-still img');
        if (still) { still.loading = 'eager'; still.decode?.().catch(() => {}); }
      }
      prepareArtwork(state);
    }, { rootMargin: state.kind === 'reef' ? '1800px' : '600px' });
    nearby.observe(canvas);
  }
}

if (document.querySelector('[data-approach]')) import('./approach-view.mjs?v=6116993ede5c').then(({ initApproach }) => {
  updateApproach = initApproach(phase => {
    const state = canvasStates.find(item => item.kind === 'approach');
    if (!state) return;
    state.phase = phase;
    paint(state);
    schedule();
  });
}).catch(error => {
  const state = canvasStates.find(item => item.kind === 'approach');
  if (state) artworkFailed(state, error);
});

document.querySelector('[data-coral-next]')?.addEventListener('click', () => {
  const state = canvasStates.find(item => item.kind === 'coral');
  if (!state?.loaded || state.failed) return;
  const { index } = state.art.coralTraceState(state.time, { variant: state.variant, reducedMotion: motion.matches });
  state.variant = motion.matches ? (index + 1) % 5 : undefined;
  state.time = (index + 1) * state.art.CORAL_TRACE_CYCLE_SECONDS + (state.paused ? 2.5 : 0);
  paint(state);
  lastTime = 0;
  schedule();
});

const building = document.querySelector('.building-section');
const svg = building?.querySelector('.company-building');
const panels = [...document.querySelectorAll('[data-depth-panel]')];
const depths = [...document.querySelectorAll('[data-depth]')];
const chamber = building?.querySelector('.building-sticky');
let staticDepth = 0;
let scrollFrame = 0;
let buildingProgress = 0;
let updateBuilding;
const buildingOriginal = svg ? { content: svg.innerHTML, viewBox: svg.getAttribute('viewBox') } : null;
const mixColour = (a, b, t) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;

function colourDepth(progress) {
  const p = clamp(progress);
  const stops = [[0,[243,240,232]],[.25,[202,213,231]],[.48,[65,91,142]],[.75,[24,44,82]],[1,[12,22,48]]];
  const upper = stops.findIndex(([at]) => at >= p);
  const [a,from] = stops[Math.max(0,upper-1)], [b,to] = stops[upper];
  const t = b===a ? 0 : (p-a)/(b-a);
  const background = from.map((v,i) => Math.round(v+(to[i]-v)*t));
  const linear = background.map(v => v/255 <= .04045 ? v/255/12.92 : ((v/255+.055)/1.055)**2.4);
  const luminance = linear.reduce((sum,v,i) => sum+v*[.2126,.7152,.0722][i],0);
  // Choose the readable side of the palette as the water darkens.
  const text = luminance < .19 ? 1 : 0;
  chamber.style.backgroundColor = `rgb(${background.join(',')})`;
  chamber.style.color = mixColour([17,17,17], [243,240,232], text);
  chamber.style.setProperty('--depth-muted', mixColour([95,95,96], [177,187,209], text));
  chamber.style.setProperty('--depth-accent', mixColour([36,78,255], [183,198,255], text));
  const colours = {
    paper:[[243,240,232],[23,36,71]],
    line:[[36,78,255],[183,198,255]],
    shade:[[229,232,237],[32,48,82]],
    glass:[[215,223,239],[41,61,105]]
  };
  for (const [name, [start,end]] of Object.entries(colours)) chamber.style.setProperty(`--building-${name}`, mixColour(start,end,text));
}

function preserveReadingPosition(change) {
  // Enhancing the building changes its height. Keep downstream reading/hash targets in place.
  const following = building.getBoundingClientRect().bottom <= 0 ? building.nextElementSibling : null;
  const before = following?.getBoundingClientRect().top;
  try { return change(); }
  finally {
    if (following) {
      // Measuring again accounts for any scroll anchoring the browser has already applied.
      const delta = following.getBoundingClientRect().top - before;
      if (Math.abs(delta) > .5) scrollTo({ top: scrollY + delta, behavior: 'instant' });
    }
  }
}

function buildingFailed(error) {
  preserveReadingPosition(() => {
    updateBuilding = undefined;
    building.classList.remove('building-enhanced');
    chamber.removeAttribute('style');
    svg.innerHTML = buildingOriginal.content;
    svg.setAttribute('viewBox', buildingOriginal.viewBox);
    panels.forEach(panel => {
      for (const name of ['opacity', 'visibility', 'transform']) panel.style.removeProperty(name);
      panel.removeAttribute('aria-hidden');
    });
    depths.forEach(button => { button.removeAttribute('aria-current'); button.classList.remove('visited'); });
  });
  console.error('Unable to initialise the building artwork:', error);
}

function renderBuilding(force = false) {
  if (!updateBuilding || !building?.classList.contains('building-enhanced')) return;
  try {
    const rect = building.getBoundingClientRect();
    if (!force && !motion.matches && (rect.top > innerHeight || rect.bottom < 0)) return;
    const progress = motion.matches ? (staticDepth + .6) / panels.length : clamp(-rect.top / Math.max(1, rect.height - innerHeight));
    const focus = clamp((progress - .25) / .75);
    svg.setAttribute('viewBox', innerWidth < 760 ? `130 ${-160 + 320 * focus} 440 ${800 - 440 * focus}` : '0 -160 700 860');
    buildingProgress = progress;
    colourDepth(progress);
    const { phase } = updateBuilding(svg, progress, motion.matches);
    const layer = phase;
    panels.forEach((panel, i) => {
      const active = i === layer;
      const opacity = 1;
      panel.style.opacity = active ? String(opacity) : '0';
      panel.style.visibility = active ? 'visible' : 'hidden';
      panel.style.transform = `translateY(${active ? (1 - opacity) * 8 : 8}px)`;
      panel.setAttribute('aria-hidden', String(!active));
    });
    depths.forEach((button, i) => {
      if (i === layer) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
      button.classList.toggle('visited', i < layer);
    });
  } catch (error) { buildingFailed(error); }
}

depths.forEach((button, i) => button.addEventListener('click', () => {
  if (!updateBuilding) return;
  if (motion.matches) {
    staticDepth = Number(button.dataset.depth);
    renderBuilding();
    return;
  }
  const rect = building.getBoundingClientRect();
  const top = scrollY + rect.top + (rect.height - innerHeight) * (Number(button.dataset.depth) + .96) / panels.length;
  scrollTo({ top, behavior: 'smooth' });
}));

if (building && svg) import('./art/building.mjs?v=6116993ede5c').then(module => {
  preserveReadingPosition(() => {
    // First prove the renderer works while the complete static copy is still present.
    module.updateBuilding(svg, 0, motion.matches);
    updateBuilding = module.updateBuilding;
    building.classList.add('building-enhanced');
    renderBuilding(true);
  });
}).catch(buildingFailed);

const gauge = document.querySelector('.depth-gauge');
function onScroll() {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0;
    renderBuilding();
    updateApproach();
    if (!gauge) return;
    const rect = building?.getBoundingClientRect();
    gauge.hidden = !building?.classList.contains('building-enhanced') || !rect || rect.top > 0;
    const p = clamp(scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight));
    gauge.querySelector('b').style.top = `${p * 104}px`;
    gauge.querySelector('[data-depth-value]').textContent = `−${String(Math.round(p * 120)).padStart(3, '0')} M`;
    gauge.style.color = rect && (rect.bottom < innerHeight || buildingProgress > .43) ? '#F3F0E8' : '#111111';
  });
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);
motion.addEventListener('change', () => {
  cancelAnimationFrame(frame);
  frame = 0;
  lastTime = 0;
  if (!motion.matches) canvasStates.filter(state => state.kind === 'coral' && state.loaded && Number.isInteger(state.variant)).forEach(state => {
    state.time = state.variant * state.art.CORAL_TRACE_CYCLE_SECONDS + 2.5;
    state.variant = undefined;
  });
  canvasStates.forEach(state => paint(state));
  renderBuilding();
  schedule();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelAnimationFrame(frame); frame = 0;
    canvasStates.filter(state => state.kind === 'reef' && !state.reefReady).forEach(state => state.reefRevision = (state.reefRevision || 0) + 1);
  } else {
    lastTime = 0;
    canvasStates.filter(state => state.kind === 'reef' && state.loaded && !state.reefReady).forEach(warmReefArtwork);
    schedule();
  }
});
document.querySelectorAll('.site-header nav a').forEach(link => {
  if (new URL(link.href).pathname === location.pathname && !link.hash) link.setAttribute('aria-current', 'page');
});
if (document.querySelector('[data-workbench]')) import('./workflow-view.mjs?v=6116993ede5c')
  .then(({ initWorkflows }) => initWorkflows())
  .catch(error => console.error('Unable to initialise the workflow examples:', error));
if (document.querySelector('#team-question')) import('./team.mjs?v=6116993ede5c')
  .then(({ initTeam }) => initTeam())
  .catch(error => console.error('Unable to initialise the team examples:', error));
onScroll();
