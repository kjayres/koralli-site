import { createParticleField, resizeParticleField, advanceParticleField, researchBounds, researchTargets } from './research.mjs?v=34d51cbcb8d7';
import { coralStudies } from './coral.mjs?v=34d51cbcb8d7';
import { drawInspectionObject } from './inspection-objects.mjs?v=34d51cbcb8d7';

const TAU = Math.PI * 2;
const clamp = (n, low = 0, high = 1) => Math.max(low, Math.min(high, n));
const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
const random = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const states = new WeakMap();
const FORM_NAMES = ['A shared view of performance', 'Connected data tables', 'A connected workflow'];
const INSPECTIONS = [
  { u: .29, v: .30, label: 'People' },
  { u: .70, v: .37, label: 'Processes' },
  { u: .36, v: .66, label: 'Decisions' },
  { u: .68, v: .70, label: 'Records' },
  { u: .50, v: .45, label: 'Relationships' },
];
// Each plan is one tree: [offset across, offset down, parent index], rooted at 0.
const INSPECTION_TREES = {
  People: [
    [.105, 0, 0], [.21, -.12, 1], [.22, 0, 1], [.21, .12, 1],
    [.32, -.18, 2], [.34, -.09, 2], [.35, -.025, 3], [.35, .05, 3], [.32, .12, 4], [.31, .21, 4],
    [.42, -.19, 5], [.43, -.10, 6], [.45, .005, 7], [.44, .085, 8], [.42, .15, 9], [.41, .24, 10],
  ],
  Processes: [
    [-.105, 0, 0], [-.21, 0, 1], [-.315, .015, 2], [-.42, .015, 3], [-.52, -.01, 4],
    [-.11, -.10, 1], [-.19, -.17, 6], [-.055, -.18, 6],
    [-.215, .11, 2], [-.29, .19, 9], [-.15, .20, 9],
    [-.325, -.095, 3], [-.40, -.18, 12], [-.27, -.18, 12], [-.43, .12, 4], [-.52, .20, 15],
  ],
  Decisions: [
    [0, -.10, 0], [-.14, -.20, 1], [.14, -.20, 1],
    [-.21, -.30, 2], [-.07, -.30, 2], [.07, -.30, 3], [.21, -.30, 3],
    [-.25, -.40, 4], [-.18, -.40, 4], [-.105, -.40, 5], [-.035, -.40, 5],
    [.035, -.40, 6], [.105, -.40, 6], [.18, -.40, 7], [.25, -.40, 7],
  ],
  Records: [
    [-.105, 0, 0], [-.105, -.11, 1], [-.105, -.22, 2], [-.105, -.33, 3],
    [-.23, 0, 1], [-.23, -.11, 2], [-.23, -.22, 3], [-.23, -.33, 4],
    [-.34, -.035, 5], [-.34, .035, 5], [-.34, -.145, 6], [-.34, -.075, 6],
    [-.34, -.255, 7], [-.34, -.185, 7], [-.34, -.365, 8], [-.34, -.295, 8],
  ],
  Relationships: [
    [0, .105, 0], [-.14, .18, 1], [.14, .18, 1],
    [-.25, .10, 2], [-.23, .28, 2], [.27, .10, 3], [.23, .29, 3],
    [-.33, .02, 4], [-.34, .16, 4], [-.34, .32, 5], [-.13, .37, 5],
    [.34, -.005, 6], [.35, .16, 6], [.34, .36, 7], [.15, .39, 7], [.075, .28, 3],
  ],
};

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

function inspectionNetwork(locations, { id: root, label }) {
  const origin = locations[root], ids = [root], arrivals = [0], edges = [];
  for (const [du, dv, parent] of INSPECTION_TREES[label]) {
    let nearest = -1, nearestDistance = Infinity;
    locations.forEach((point, id) => {
      if (point.kind && point.kind !== label) return;
      const distance = Math.hypot(point.u - origin.u - du, point.v - origin.v - dv);
      if (!ids.includes(id) && distance < nearestDistance) { nearest = id; nearestDistance = distance; }
    });
    const from = ids[parent], a = locations[from], b = locations[nearest];
    const arrival = arrivals[parent] + Math.hypot(b.u - a.u, b.v - a.v);
    b.kind = label;
    edges.push({ from, to: nearest, start: arrivals[parent], end: arrival });
    ids.push(nearest); arrivals.push(arrival);
  }
  const longest = Math.max(...arrivals);
  return edges.map(edge => ({ ...edge, start: edge.start / longest, end: edge.end / longest }));
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
    locations.push({ u: item.u, v: item.v, kind: item.label });
    return { ...item, id };
  });
  while (locations.length < field.particles.length) {
    const i = locations.length;
    locations.push({ u: .06 + random(i + 73) * .88, v: .07 + random(i + 421) * .85 });
  }
  inspections.forEach(inspection => { inspection.edges = inspectionNetwork(locations, inspection); });
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

function markRadius(scene) { return clamp(scene.width * .006, 1.8, 2.6); }

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
  const networkProgress = scene.reducedMotion ? 1 : clamp((local - 1.68) / 1.1);
  const networkFade = scene.reducedMotion ? 1 : 1 - smooth((local - 3.45) / .4);
  return { x: a.x + (b.x - a.x) * progress, y: a.y + (b.y - a.y) * progress, current, reveal, networkProgress, networkFade, settled: local >= 1.4 || scene.reducedMotion };
}

function magnify(point, lens, aperture) {
  const dx = point.x - lens.x, dy = point.y - lens.y;
  const magnification = 1 + 1.65 * (1 - clamp(Math.hypot(dx, dy) / aperture)) ** 2;
  return { x: lens.x + dx * magnification, y: lens.y + dy * magnification, magnification };
}

function drawInspectionNetwork(ctx, scene, lens, aperture = 0) {
  if (!lens.networkProgress || !lens.networkFade) return;
  ctx.save(); ctx.lineWidth = .45; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#707783'; ctx.fillStyle = '#707783';
  for (const { from, to, start, end } of lens.current.edges) {
    const growth = clamp((lens.networkProgress - start) / (end - start));
    if (!growth || [from, to].some(id => Math.hypot(scene.field.particles[id].x - scene.homes[id].x, scene.field.particles[id].y - scene.homes[id].y) >= .018)) continue;
    const a = project(scene, scene.field.particles[from]), b = project(scene, scene.field.particles[to]);
    const tip = { x: a.x + (b.x - a.x) * growth, y: a.y + (b.y - a.y) * growth };
    if (aperture) {
      const dx = tip.x - a.x, dy = tip.y - a.y;
      const closest = clamp(((lens.x - a.x) * dx + (lens.y - a.y) * dy) / (dx * dx + dy * dy));
      if (Math.hypot(a.x + dx * closest - lens.x, a.y + dy * closest - lens.y) >= aperture) continue;
    }
    ctx.globalAlpha = .52 * lens.networkFade;
    ctx.beginPath();
    if (aperture) {
      // Sample the same convex mapping as the grains; the line meets itself at the rim.
      const steps = Math.max(2, Math.ceil(Math.hypot(tip.x - a.x, tip.y - a.y) / 3));
      for (let step = 0; step <= steps; step++) {
        const p = magnify({ x: a.x + (tip.x - a.x) * step / steps, y: a.y + (tip.y - a.y) * step / steps }, lens, aperture);
        if (step === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
    } else {
      ctx.moveTo(a.x, a.y); ctx.lineTo(tip.x, tip.y);
    }
    ctx.stroke();
    if (growth === 1) {
      const p = scene.field.particles[to], point = aperture ? magnify(b, lens, aperture) : b;
      ctx.globalAlpha = .7 * lens.networkFade;
      drawInspectionObject(ctx, point.x, point.y, markRadius(scene) * (point.magnification || 1), lens.current.label);
    }
  }
  ctx.restore();
}

function lensHandle(ctx, x, y, radius, depth) {
  const d = Math.SQRT1_2, half = Math.max(2.1, radius * .072);
  const start = radius * .97, end = radius * 1.66, tip = half * .8;
  const point = (u, v, z = 0) => [x + (u - v) * d + z * .6, y + (u + v) * d + z];
  const move = (u, v, z) => ctx.moveTo(...point(u, v, z));
  const line = (u, v, z) => ctx.lineTo(...point(u, v, z));
  const curve = (a, b, c, z = 0) => ctx.bezierCurveTo(...point(...a, z), ...point(...b, z), ...point(...c, z));
  // A single tapered grip with a shaded curved underside and a recessed collar.
  ctx.save(); ctx.lineWidth = .42; ctx.strokeStyle = '#607cd1'; ctx.fillStyle = '#d9e2f6';
  ctx.beginPath(); move(start, half); line(end, tip);
  curve([end + tip, tip], [end + tip, -tip], [end, -tip]);
  line(end, -tip, depth);
  curve([end + tip, -tip], [end + tip, tip], [end, tip], depth);
  line(start, half, depth); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#f3f0e8';
  if (typeof ctx.createLinearGradient === 'function') {
    const fill = ctx.createLinearGradient(...point(start, -half), ...point(start, half));
    fill.addColorStop(0, '#f3f0e8'); fill.addColorStop(.55, '#eef0f1'); fill.addColorStop(1, '#dce5f8');
    ctx.fillStyle = fill;
  }
  ctx.strokeStyle = '#4263bb'; ctx.lineWidth = .5;
  ctx.beginPath(); move(start, -half); line(end, -tip);
  curve([end + tip, -tip], [end + tip, tip], [end, tip]);
  line(start, half); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.lineWidth = .3; ctx.strokeStyle = '#95a6cd';
  ctx.beginPath(); move(start + half * 1.4, -half * .95);
  curve([start + half * 1.8, -half * .3], [start + half * 1.8, half * .3], [start + half * 1.4, half * .95]);
  ctx.stroke(); ctx.restore();
}

function drawLens(ctx, scene) {
  const opacity = scene.reducedMotion ? 1 : smooth((scene.age - .9) / .4);
  if (!opacity) return;
  const lens = lensPosition(scene);
  drawInspectionNetwork(ctx, scene, lens);
  const radius = clamp(scene.width * .102, 24, 43);
  const rim = Math.max(1.5, radius * .05), depth = Math.max(.7, radius * .025);
  ctx.save(); ctx.globalAlpha = opacity;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#4263bb'; ctx.lineWidth = .45;
  ctx.fillStyle = '#dce4f4';
  lensHandle(ctx, lens.x, lens.y, radius, depth);
  ctx.beginPath(); ctx.arc(lens.x + depth * .6, lens.y + depth, radius, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(lens.x + depth * .6, lens.y + depth, radius, -.18, Math.PI * 1.06); ctx.stroke();
  ctx.fillStyle = '#f3f0e8';
  ctx.beginPath(); ctx.arc(lens.x, lens.y, radius, 0, TAU); ctx.fill();
  // The thin bevel carries the blue pencil shading; the glass remains clear.
  ctx.strokeStyle = '#dee5f4'; ctx.lineWidth = rim;
  ctx.beginPath(); ctx.arc(lens.x, lens.y, radius - rim / 2, 0, TAU); ctx.stroke();
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
    const magnified = magnify(point, lens, aperture);
    // The field stays magnified throughout. Only the inspected grain becomes an object.
    const alpha = scene.opacity * (p.id === lens.current.id ? 1 - lens.reveal : 1);
    const kind = scene.locations[p.id].kind;
    if (kind) {
      ctx.save(); ctx.globalAlpha = opacity * alpha;
      drawInspectionObject(ctx, magnified.x, magnified.y, markRadius(scene) * magnified.magnification, kind);
      ctx.restore();
    } else {
      ctx.fillStyle = `rgba(36,78,255,${alpha})`;
      dot(ctx, magnified.x, magnified.y, p.radius * scene.field.bounds.grainSize * magnified.magnification);
    }
  }
  drawInspectionNetwork(ctx, scene, lens, aperture);
  if (lens.reveal > 0) {
    ctx.globalAlpha = opacity * lens.reveal;
    drawInspectionObject(ctx, lens.x, lens.y, markRadius(scene) * 2.65 + (radius - rim - markRadius(scene) * 2.65) * lens.reveal, lens.current.label);
  }
  ctx.restore();
  ctx.strokeStyle = '#4263bb'; ctx.lineWidth = .53;
  ctx.beginPath(); ctx.arc(lens.x, lens.y, radius, 0, TAU); ctx.stroke();
  ctx.strokeStyle = '#8296c6'; ctx.lineWidth = .32;
  ctx.beginPath(); ctx.arc(lens.x, lens.y, radius - rim, 0, TAU); ctx.stroke();
  // Short, fine strokes follow the bevel rather than forming a second flat icon.
  ctx.lineWidth = .25; ctx.strokeStyle = '#8197cb';
  for (let i = 0; i < 19; i++) {
    const angle = -.05 + i / 18 * Math.PI * .95;
    ctx.beginPath();
    ctx.moveTo(lens.x + Math.cos(angle) * (radius - rim * .75), lens.y + Math.sin(angle) * (radius - rim * .75));
    ctx.lineTo(lens.x + Math.cos(angle + .012) * (radius - rim * .2), lens.y + Math.sin(angle + .012) * (radius - rim * .2));
    ctx.stroke();
  }
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
    const kind = scene.phase === 0 && scene.locations[p.id].kind;
    if (kind) drawInspectionObject(ctx, point.x, point.y, markRadius(scene), kind);
    else dot(ctx, point.x, point.y, p.radius * scene.field.bounds.grainSize);
  }
  ctx.restore();
  if (scene.phase === 0) drawLens(ctx, scene);
  if (scene.phase === 2) drawGrowth(ctx, scene);
  return approachPresentation(scene);
}
