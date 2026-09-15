import { drawWave } from './art/wave.mjs';
import { drawCoralTrace } from './art/coral.mjs';
import { updateBuilding } from './art/building.mjs';
import { initTeam } from './team.mjs';
import { initWorkflows } from './workflow-view.mjs';

const motion = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = n => Math.min(1, Math.max(0, n));
const canvasStates = [];
let frame = 0;
let lastTime = 0;
let reefModule;

async function prepareReef(state) {
  reefModule ||= import('./art/reef.mjs');
  const { Reef } = await reefModule;
  state.reef = new Reef();
  state.reef.seedReef(state);
  paint(state);
  schedule();
}

function paint(state, dt = 0) {
  const { ctx, w, h, kind } = state;
  if (!w || !h) return;
  ctx.clearRect(0, 0, w, h);
  if (!motion.matches) state.time += dt;
  if (state.pointer) {
    const blend = 1 - Math.exp(-dt * 9);
    state.pointer.x += (state.pointerTarget.x - state.pointer.x) * blend;
    state.pointer.y += (state.pointerTarget.y - state.pointer.y) * blend;
    state.pointer.strength += (state.pointerTarget.strength - state.pointer.strength) * blend;
  }
  const options = { reducedMotion: motion.matches, pointer: state.pointer, variant: state.variant };
  if (kind === 'wave') drawWave(ctx, w, h, state.time, options);
  if (kind === 'coral') drawCoralTrace(ctx, w, h, state.time + 2, options);
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
}

function tick(now) {
  frame = 0;
  const dt = lastTime ? Math.min(.05, (now - lastTime) / 1000) : 0;
  lastTime = now;
  canvasStates.filter(state => state.visible && !state.paused).forEach(state => paint(state, dt));
  schedule();
}

function schedule() {
  if (!frame && !motion.matches && !document.hidden && canvasStates.some(state => state.visible && !state.paused && (state.kind !== 'reef' || state.reef))) frame = requestAnimationFrame(tick);
}

for (const canvas of document.querySelectorAll('canvas[data-art]')) {
  const ctx = canvas.getContext('2d');
  if (!ctx) continue;
  const state = { ctx, kind: canvas.dataset.art, w: 0, h: 0, t: 0, time: 0, fraction: 0, visible: false };
  if (state.kind === 'reef') {
    const nearby = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      nearby.disconnect();
      prepareReef(state).catch(error => console.error('Unable to load reef artwork:', error));
    }, { rootMargin: '600px' });
    nearby.observe(canvas);
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
    const rect = canvas.parentElement.getBoundingClientRect();
    state.w = rect.width;
    state.h = rect.height;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.reef?.seedReef(state);
    paint(state);
  };
  new ResizeObserver(resize).observe(canvas.parentElement);
  new IntersectionObserver(entries => {
    state.visible = entries[0].isIntersecting;
    lastTime = 0;
    if (state.visible) paint(state);
    schedule();
  }).observe(canvas);
  canvasStates.push(state);
  resize();
}

document.querySelector('[data-reef-pause]')?.addEventListener('click', event => {
  const button = event.currentTarget;
  const paused = button.getAttribute('aria-pressed') !== 'true';
  button.setAttribute('aria-pressed', String(paused));
  button.textContent = paused ? 'Play animation' : 'Pause animation';
  canvasStates.filter(state => state.kind === 'reef').forEach(state => { state.paused = paused; });
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

function renderBuilding() {
  if (!building || !svg) return;
  svg.setAttribute('viewBox', innerWidth < 760 ? '80 -160 540 860' : '0 -160 700 860');
  const rect = building.getBoundingClientRect();
  if (!motion.matches && (rect.top > innerHeight || rect.bottom < 0)) return;
  const progress = motion.matches ? (staticDepth + .6) / 5 : clamp(-rect.top / Math.max(1, rect.height - innerHeight));
  buildingProgress = progress;
  colourDepth(progress);
  const { phase, textOpacity } = updateBuilding(svg, progress, motion.matches);
  panels.forEach((panel, i) => {
    const active = i === phase;
    const opacity = progress < .014 ? 1 : textOpacity;
    panel.style.opacity = active ? String(opacity) : '0';
    panel.style.visibility = active ? 'visible' : 'hidden';
    panel.style.transform = `translateY(${active ? (1 - opacity) * 8 : 8}px)`;
    panel.setAttribute('aria-hidden', String(!active));
  });
  depths.forEach((button, i) => {
    if (i === phase) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
    button.classList.toggle('visited', i < phase);
  });
}

depths.forEach((button, i) => button.addEventListener('click', () => {
  if (motion.matches) {
    staticDepth = i;
    renderBuilding();
    return;
  }
  const rect = building.getBoundingClientRect();
  const top = scrollY + rect.top + (rect.height - innerHeight) * (i + .80) / 5;
  scrollTo({ top, behavior: 'smooth' });
}));

const gauge = document.querySelector('.depth-gauge');
function onScroll() {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0;
    renderBuilding();
    if (!gauge) return;
    const p = clamp(scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight));
    gauge.querySelector('b').style.top = `${p * 104}px`;
    gauge.querySelector('[data-depth-value]').textContent = `−${String(Math.round(p * 120)).padStart(3, '0')} M`;
    const reef = document.querySelector('#reef');
    const inDeepBuilding = building && building.getBoundingClientRect().top < 0 && buildingProgress > .43;
    gauge.style.color = inDeepBuilding || (reef && reef.getBoundingClientRect().top < innerHeight / 2) ? '#F3F0E8' : '#111111';
  });
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);
motion.addEventListener('change', () => {
  cancelAnimationFrame(frame);
  frame = 0;
  lastTime = 0;
  canvasStates.forEach(state => paint(state));
  renderBuilding();
  schedule();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
  else { lastTime = 0; schedule(); }
});
document.querySelectorAll('.site-header nav a').forEach(link => {
  if (new URL(link.href).pathname === location.pathname && !link.hash) link.setAttribute('aria-current', 'page');
});
initWorkflows(variant => {
  const coral = canvasStates.find(state => state.kind === 'coral');
  if (coral) { coral.variant = variant; coral.time = 0; paint(coral); }
});
initTeam();
onScroll();
