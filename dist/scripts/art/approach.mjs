import { createParticleField, resizeParticleField, advanceParticleField, researchBounds, researchTargets } from './research.mjs?v=f0590c49520f';
import { coralStudies } from './coral.mjs?v=f0590c49520f';
import { drawInspectionObject } from './inspection-objects.mjs?v=f0590c49520f';

const TAU = Math.PI * 2;
const clamp = (n, low = 0, high = 1) => Math.max(low, Math.min(high, n));
const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
const random = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const states = new WeakMap();
const FORM_NAMES = ['A shared view of performance', 'Connected data tables', 'A connected workflow', 'Hammer and sickle'];
const INSPECTIONS = [
  { u: .29, v: .30, label: 'People' },
  { u: .70, v: .37, label: 'Processes' },
  { u: .36, v: .66, label: 'Decisions' },
  { u: .68, v: .70, label: 'Records' },
  { u: .50, v: .45, label: 'Relationships' },
];

function approachBounds(width, height) {
  const bounds = researchBounds(width, height);
  bounds.grainSize = Math.max(1, bounds.grainSize * 1.35);
  return bounds;
}

function placeHomes(scene, bounds) {
  scene.homes = scene.locations.map(({ u, v }) => ({
    x: (u - .5) * bounds.halfWidth * 2,
    y: bounds.top + v * (bounds.bottom - bounds.top),
  }));
}

/** One population, with permanent homes shared by the suspended field and coral. */
export function createApproachScene(width, height) {
  const field = createParticleField(approachBounds(width, height));
  const locations = [], anchorMap = new Map();
  const studies = coralStudies.map(study => ({
    study,
    ids: study.nodes.map(([x, y]) => {
      const key = `${x},${y}`;
      if (!anchorMap.has(key)) {
        anchorMap.set(key, locations.length);
        locations.push({ u: .5 + x * .64, v: .20 + y * .64 });
      }
      return anchorMap.get(key);
    }),
  }));
  const inspections = INSPECTIONS.map(item => {
    const id = locations.length;
    locations.push({ u: item.u, v: item.v });
    return { ...item, id };
  });
  while (locations.length < field.particles.length) {
    const i = locations.length;
    locations.push({ u: .06 + random(i + 73) * .88, v: .07 + random(i + 421) * .85 });
  }
  const scene = { field, locations, studies, inspections, width, height, phase: 0, age: 0, elapsed: 0, last: null, grey: 0, opacity: .48, reducedMotion: false };
  placeHomes(scene, field.bounds);
  field.particles.forEach((p, i) => Object.assign(p, scene.homes[i], { vx: 0, vy: 0 }));
  return scene;
}

export function approachPresentation(scene) {
  if (scene.phase === 0) return { caption: '01 / GO & SEE', detail: 'People, processes and relationships' };
  if (scene.phase === 1) {
    const cycle = Math.max(0, scene.age - 3.3);
    const index = scene.reducedMotion ? 0 : Math.floor(cycle / 11) % FORM_NAMES.length;
    return { caption: '02 / BUILD & LEARN', detail: FORM_NAMES[index], form: index, cycle };
  }
  const cycle = Math.max(0, scene.age - 1.8);
  const index = scene.reducedMotion ? 0 : Math.floor(cycle / 11.2) % scene.studies.length;
  const age = cycle % 11.2;
  return {
    caption: '03 / ADAPT & GROW', detail: scene.studies[index].study.name,
    index, growth: scene.reducedMotion ? 1 : clamp(age / 2),
    fade: scene.reducedMotion ? 1 : smooth((scene.age - 1.5) / .3) * (1 - smooth((age - 10) / 1.0)),
  };
}

/** Scroll changes forces, never particle identity or position. Time advances only in view. */
export function updateApproachScene(scene, width, height, seconds, { phase = 0, reducedMotion = false } = {}) {
  const time = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const dt = scene.last === null ? 0 : clamp(time - scene.last, 0, .1);
  scene.last = time;
  if (scene.width !== width || scene.height !== height) {
    const bounds = approachBounds(width, height);
    resizeParticleField(scene.field, bounds);
    placeHomes(scene, bounds);
    scene.width = width;
    scene.height = height;
  }
  const next = clamp(Math.round(phase), 0, 2);
  if (next !== scene.phase) { scene.phase = next; scene.age = 0; }
  if (!reducedMotion) {
    let nextAge = scene.age + dt;
    if (scene.phase === 1 && !scene.field.resting) {
      const boundary = scene.age < 3.3 ? 3.3 : 3.3 + (Math.floor((scene.age - 3.3) / 11) + 1) * 11;
      // A deeper pile gets the extra contact time it needs before the next lift.
      if (nextAge >= boundary) nextAge = boundary - .000001;
    }
    scene.age = nextAge;
    scene.elapsed += dt;
  }
  scene.reducedMotion = reducedMotion;
  if (reducedMotion) {
    const points = scene.phase === 1 ? researchTargets(0) : scene.homes;
    scene.field.particles.forEach((p, i) => Object.assign(p, points[i], { vx: 0, vy: 0, asleep: false, sleepTime: 0 }));
    scene.field.resting = false;
    scene.grey = scene.phase === 2 ? 1 : 0;
    scene.opacity = scene.phase === 1 ? 1 : scene.phase === 2 ? .30 : .48;
    return scene;
  }
  const blend = 1 - Math.exp(-dt * 3);
  scene.grey += ((scene.phase === 2 ? 1 : 0) - scene.grey) * blend;
  scene.opacity += ((scene.phase === 1 ? 1 : scene.phase === 2 ? .30 : .48) - scene.opacity) * blend;
  if (scene.phase === 1) {
    const { form, cycle } = approachPresentation(scene);
    const age = cycle % 11;
    advanceParticleField(scene.field, dt, {
      targets: researchTargets(form),
      attraction: p => scene.age < 3.3 ? 0 : smooth((age - p.delay) / 1.5) * (1 - smooth((age - 6.6 - p.delay * .4) / .55)),
    });
  } else {
    advanceParticleField(scene.field, dt, { targets: scene.homes, attraction: 1, gravity: 0, damping: 8, curl: 0 });
  }
  return scene;
}

function dot(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
function project(scene, point) { return { x: scene.width / 2 + point.x * scene.field.bounds.scale, y: scene.height / 2 + point.y * scene.field.bounds.scale }; }

function lensPosition(scene) {
  const elapsed = scene.reducedMotion ? 2 : Math.max(0, scene.age - 1.3);
  const cycle = Math.floor(elapsed / 4), local = elapsed % 4;
  const current = scene.inspections[cycle % scene.inspections.length];
  const previous = scene.inspections[(cycle + scene.inspections.length - 1) % scene.inspections.length];
  const b = project(scene, scene.field.particles[current.id]);
  const a = cycle === 0 ? { x: scene.width * .12, y: scene.height * .17 } : project(scene, scene.field.particles[previous.id]);
  const progress = scene.reducedMotion ? 1 : smooth(local / 1.4);
  const reveal = scene.reducedMotion ? 1 : smooth((local - 1.4) / .28) * (1 - smooth((local - 3.7) / .3));
  return { x: a.x + (b.x - a.x) * progress, y: a.y + (b.y - a.y) * progress, current, reveal, settled: local >= 1.4 || scene.reducedMotion };
}

function lensHandle(ctx, x, y, radius, depth = 0) {
  const d = Math.SQRT1_2, half = Math.max(2.5, radius * .085);
  const a = { x: x + (radius + half) * d + depth * .6, y: y + (radius + half) * d + depth };
  const b = { x: x + radius * 1.70 * d + depth * .6, y: y + radius * 1.70 * d + depth };
  const nx = -d * half, ny = d * half;
  ctx.beginPath(); ctx.moveTo(a.x + nx, a.y + ny); ctx.lineTo(b.x + nx, b.y + ny);
  ctx.arc(b.x, b.y, half, Math.PI * .75, -Math.PI * .25, true);
  ctx.lineTo(a.x - nx, a.y - ny);
  ctx.arc(a.x, a.y, half, -Math.PI * .25, Math.PI * .75, true);
  ctx.closePath(); ctx.fill(); ctx.stroke();
}

function drawLens(ctx, scene) {
  const opacity = scene.reducedMotion ? 1 : smooth((scene.age - .9) / .4);
  if (!opacity) return;
  const lens = lensPosition(scene);
  const radius = clamp(scene.width * .102, 24, 43);
  const rim = Math.max(1.5, radius * .05), depth = Math.max(.7, radius * .025);
  ctx.save(); ctx.globalAlpha = opacity;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#244eff'; ctx.lineWidth = .65;
  ctx.fillStyle = '#e8eaf0';
  lensHandle(ctx, lens.x, lens.y, radius, depth);
  // Two offset faces give the rim a shallow cylindrical edge.
  ctx.beginPath(); ctx.arc(lens.x + depth * .6, lens.y + depth, radius, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#f3f0e8';
  ctx.beginPath(); ctx.arc(lens.x, lens.y, radius, 0, TAU); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.arc(lens.x, lens.y, radius - rim, 0, TAU); ctx.clip();
  const aperture = radius - rim;
  for (const p of scene.field.particles) {
    const point = project(scene, p);
    const dx = point.x - lens.x, dy = point.y - lens.y;
    const distance = Math.hypot(dx, dy);
    if (distance > aperture) continue;
    // A convex field: strongest at the centre, smoothly meeting the unmagnified rim.
    // Its radial mapping stays increasing, so grains never cross through one another.
    const magnification = 1 + 1.65 * (1 - distance / aperture) ** 2;
    // The field stays magnified throughout. Only the inspected grain becomes an object.
    const alpha = scene.opacity * (p.id === lens.current.id ? 1 - lens.reveal : 1);
    ctx.fillStyle = `rgba(36,78,255,${alpha})`;
    dot(ctx, lens.x + dx * magnification, lens.y + dy * magnification, p.radius * scene.field.bounds.grainSize * magnification);
  }
  if (lens.reveal > 0) {
    ctx.globalAlpha = opacity * lens.reveal;
    drawInspectionObject(ctx, lens.x, lens.y, (radius - rim) * (.2 + .8 * lens.reveal), lens.current.label);
  }
  ctx.restore();
  ctx.lineWidth = .85;
  ctx.beginPath(); ctx.arc(lens.x, lens.y, radius, 0, TAU); ctx.stroke();
  ctx.lineWidth = .5;
  ctx.beginPath(); ctx.arc(lens.x, lens.y, radius - rim, 0, TAU); ctx.stroke();
  // Sparse cross-edges describe the thickness without turning the lens into a symbol.
  ctx.lineWidth = .5;
  for (const angle of [0, Math.PI / 4, Math.PI / 2]) {
    const x = lens.x + Math.cos(angle) * radius, y = lens.y + Math.sin(angle) * radius;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + depth * .6, y + depth); ctx.stroke();
  }
  ctx.lineWidth = .75; ctx.fillStyle = '#f3f0e8';
  lensHandle(ctx, lens.x, lens.y, radius);
  if (lens.settled) {
    ctx.globalAlpha = opacity * lens.reveal;
    ctx.font = '400 9px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const labelX = clamp(lens.x, 48, scene.width - 48), labelY = lens.y + radius + depth + 13;
    const labelWidth = ctx.measureText(lens.current.label).width + 12;
    ctx.fillStyle = '#f3f0e8'; ctx.fillRect(labelX - labelWidth / 2, labelY - 3, labelWidth, 15);
    ctx.fillStyle = '#244eff'; ctx.fillText(lens.current.label, labelX, labelY);
  }
  ctx.restore();
}

function drawGrowth(ctx, scene) {
  const { index, growth, fade } = approachPresentation(scene);
  const { study, ids } = scene.studies[index];
  const points = ids.map(id => project(scene, scene.field.particles[id]));
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 1; i < ids.length; i++) {
    const parent = study.nodes[i][2];
    const progress = clamp((growth - study.arrivals[parent]) / (study.arrivals[i] - study.arrivals[parent]));
    const ready = [i, parent].every(n => {
      const p = scene.field.particles[ids[n]], home = scene.homes[ids[n]];
      return Math.hypot(p.x - home.x, p.y - home.y) < .018;
    });
    if (!progress || !ready) continue;
    const a = points[parent], b = points[i];
    ctx.strokeStyle = `rgba(17,17,17,${.62 * fade})`; ctx.lineWidth = .85;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + (b.x - a.x) * progress, a.y + (b.y - a.y) * progress); ctx.stroke();
    if (progress < 1) {
      ctx.fillStyle = `rgba(36,78,255,${fade})`;
      dot(ctx, a.x + (b.x - a.x) * progress, a.y + (b.y - a.y) * progress, 1.8);
    }
  }
  points.forEach((p, i) => {
    if (growth < study.arrivals[i]) return;
    const source = scene.field.particles[ids[i]], home = scene.homes[ids[i]];
    if (Math.hypot(source.x - home.x, source.y - home.y) >= .018) return;
    ctx.fillStyle = study.operators.includes(i) ? `rgba(255,102,85,${fade})` : `rgba(36,78,255,${fade})`;
    dot(ctx, p.x, p.y, study.children[i] > 1 ? 2.6 : 2.05);
  });
  ctx.restore();
}

/** The caller owns the canvas clear, DPR and visible animation clock. */
export function drawApproach(ctx, width, height, seconds, options = {}) {
  if (!(width > 0 && height > 0)) return;
  let scene = states.get(ctx);
  if (!scene) { scene = createApproachScene(width, height); states.set(ctx, scene); }
  updateApproachScene(scene, width, height, seconds, options);
  const rgb = [36, 78, 255].map((v, i) => Math.round(v + ([112, 119, 131][i] - v) * scene.grey));
  ctx.save(); ctx.fillStyle = `rgb(${rgb.join(',')})`;
  for (const p of scene.field.particles) {
    const appeared = scene.reducedMotion ? 1 : smooth((scene.elapsed - random(p.id + 19) * 1.1) / .4);
    ctx.globalAlpha = scene.opacity * appeared;
    const point = project(scene, p);
    dot(ctx, point.x, point.y, p.radius * scene.field.bounds.grainSize);
  }
  ctx.restore();
  if (scene.phase === 0) drawLens(ctx, scene);
  if (scene.phase === 2) drawGrowth(ctx, scene);
  return approachPresentation(scene);
}
