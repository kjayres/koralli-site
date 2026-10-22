import { createParticleField, resizeParticleField, advanceParticleField, researchBounds, researchTargets, RESEARCH_FORM_COUNT } from './research.mjs?v=c4fb63486639';
import { coralStudies } from './coral.mjs?v=c4fb63486639';
import { drawInspectionObject } from './inspection-objects.mjs?v=c4fb63486639';
import { createAdaptGrow, adaptGrowPresentation, drawAdaptGrow, heapPull } from './adapt-grow.mjs?v=c4fb63486639';

const TAU = Math.PI * 2;
const clamp = (n, low = 0, high = 1) => Math.max(low, Math.min(high, n));
const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
const random = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const states = new WeakMap();
const FORM_NAMES = ['A working prototype', 'Connected data tables', 'A measure people trust', 'A connected workflow', 'A shared view of performance'];
// Build & Learn starts from grains on the ground. They lift into the first object, swirl in the
// water from each object into the next, and after the last, the dashboard, drip back down.
const GROUND = 2.4, FORM_SPAN = 4.4, DRIP = 2.2;
const BUILD_CYCLE = RESEARCH_FORM_COUNT * FORM_SPAN + DRIP;
const STILL_FORM = RESEARCH_FORM_COUNT - 1;

function buildMoment(age) {
  if (age < GROUND) return { stage: 'ground', form: 0, within: age, cycle: -1 };
  const elapsed = age - GROUND, cycle = Math.floor(elapsed / BUILD_CYCLE), local = elapsed - cycle * BUILD_CYCLE;
  if (local < RESEARCH_FORM_COUNT * FORM_SPAN) {
    const form = Math.floor(local / FORM_SPAN);
    return { stage: 'form', form, within: local - form * FORM_SPAN, cycle };
  }
  return { stage: 'drip', form: RESEARCH_FORM_COUNT - 1, within: local - RESEARCH_FORM_COUNT * FORM_SPAN, cycle };
}

function buildAttraction(moment, p) {
  if (moment.stage === 'ground') return 0;
  if (moment.stage === 'drip') return 1 - smooth((moment.within - p.delay * .6) / .5);
  if (moment.form === 0) return smooth((moment.within - p.delay) / 1.3);
  // Between objects the grains loosen, swirl and sag a little, then hold the new form.
  return 1 - .55 * Math.sin(Math.PI * clamp((moment.within - p.delay * .8) / 1));
}
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
  const place = ({ u, v }) => ({ x: (u - .5) * bounds.halfWidth * 2, y: bounds.top + v * (bounds.bottom - bounds.top) });
  scene.homes = scene.locations.map(place);
  // With reduced motion the heap is already stacked; otherwise its grains fall into place.
  const resting = (point, id) => ({ x: point.x, y: Math.min(point.y, bounds.bottom - scene.field.particles[id].r) });
  scene.growTargets = scene.homes.map((home, id) => !scene.grow ? home : scene.grow.rock.has(id) ? resting(place(scene.grow.rock.get(id).still), id)
    : scene.grow.coral.has(id) ? place(scene.grow.locations[id]) : home);
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

/** One population, retaining the coral anchors that Adapt & Grow grows through. */
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
  const grow = createAdaptGrow(locations, studies, new Set(inspections.map(({ id }) => id)));
  const scene = { field, locations, studies, inspections, grow, width, height, phase: 0, age: 0, elapsed: 0, last: null, grey: 0, rock: 0, opacity: .48, reducedMotion: false };
  placeHomes(scene, field.bounds);
  field.particles.forEach((p, i) => Object.assign(p, scene.homes[i], { vx: 0, vy: 0 }));
  return scene;
}

export function approachPresentation(scene) {
  if (scene.phase === 0) return { caption: '01 / GO & SEE', detail: 'People, processes and relationships' };
  if (scene.phase === 1) {
    const moment = buildMoment(scene.age), form = scene.reducedMotion ? STILL_FORM : moment.form;
    // The name changes once the new object has mostly formed, not as its grains set off.
    const named = !scene.reducedMotion && moment.stage === 'form' && moment.form > 0 && moment.within < .8 ? form - 1 : form;
    return { caption: '02 / BUILD & LEARN', detail: FORM_NAMES[named], form, stage: moment.stage };
  }
  return adaptGrowPresentation(scene.grow, scene.age, scene.reducedMotion);
}

/** Scroll changes forces while preserving particle identities and visible positions. */
export function updateApproachScene(scene, width, height, seconds, { phase = 0, reducedMotion = false } = {}) {
  const time = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const dt = scene.last === null ? 0 : clamp(time - scene.last, 0, .1);
  scene.last = time;
  if (scene.width !== width || scene.height !== height) {
    const bounds = approachBounds(width, height);
    resizeParticleField(scene.field, bounds);
    placeHomes(scene, bounds);
    scene.heapRest = null;
    scene.width = width;
    scene.height = height;
  }
  const next = clamp(Math.round(phase), 0, 2);
  if (reducedMotion) scene.coralExit = null;
  if (scene.coralExit) {
    scene.coralExit.age += dt;
    if (scene.coralExit.age >= .45) scene.coralExit = null;
  }
  if (next !== scene.phase) {
    // The grains are always where they are drawn, so only the coral's lines need a brief fade.
    if (scene.phase === 2 && !reducedMotion) scene.coralExit = { age: 0, state: approachPresentation(scene) };
    if (next === 2 || reducedMotion) scene.coralExit = null;
    scene.phase = next; scene.age = 0; scene.heapRest = null;
  }
  if (!reducedMotion) {
    let nextAge = scene.age + dt;
    if (scene.phase === 1 && !scene.field.resting) {
      // Grains lift from the ground only once the whole pile has settled.
      const boundary = scene.age < GROUND ? GROUND : GROUND + (Math.floor((scene.age - GROUND) / BUILD_CYCLE) + 1) * BUILD_CYCLE;
      if (nextAge >= boundary) nextAge = boundary - .000001;
    }
    scene.age = nextAge;
    scene.elapsed += dt;
  }
  scene.reducedMotion = reducedMotion;
  if (reducedMotion) {
    const points = scene.phase === 1 ? researchTargets(STILL_FORM) : scene.phase === 2 ? scene.growTargets : scene.homes;
    scene.field.particles.forEach((p, i) => Object.assign(p, points[i], { vx: 0, vy: 0, asleep: false, sleepTime: 0 }));
    scene.field.resting = false;
    scene.grey = scene.phase === 2 ? 1 : 0;
    scene.rock = scene.phase === 2 ? 1 : 0;
    scene.opacity = scene.phase === 1 ? 1 : scene.phase === 2 ? .30 : .48;
    return scene;
  }
  const blend = 1 - Math.exp(-dt * 3);
  scene.grey += ((scene.phase === 2 ? 1 : 0) - scene.grey) * blend;
  scene.rock += ((scene.phase === 2 ? 1 : 0) - scene.rock) * blend;
  scene.opacity += ((scene.phase === 1 ? 1 : scene.phase === 2 ? .30 : .48) - scene.opacity) * blend;
  if (scene.phase === 1) {
    const moment = buildMoment(scene.age);
    advanceParticleField(scene.field, dt, { targets: researchTargets(moment.form), attraction: p => buildAttraction(moment, p) });
  } else if (scene.phase === 2) {
    const { rock } = scene.grow, particles = scene.field.particles;
    // Once the heap has come to rest it is held where it lies, so a settled stage costs no physics.
    if (!scene.heapRest && scene.age > 3 && (scene.age > 7 || [...rock.keys()].every(id => Math.hypot(particles[id].vx, particles[id].vy) < .01))) {
      scene.heapRest = scene.growTargets.map((target, id) => rock.has(id) ? { x: particles[id].x, y: particles[id].y } : target);
    }
    if (scene.heapRest) advanceParticleField(scene.field, dt, { targets: scene.heapRest, attraction: 1, gravity: 0, damping: 8, curl: 0 });
    else {
      // Heap grains fall freely, drawn a little towards the middle, and settle as a natural pile.
      const halfWidth = scene.field.bounds.halfWidth * 2, pull = heapPull(scene.age);
      const targets = particles.map((p, id) => rock.has(id) ? { x: rock.get(id).offset * halfWidth, y: p.y } : scene.growTargets[id]);
      advanceParticleField(scene.field, dt, { targets, attraction: p => rock.has(p.id) ? pull : 1, curl: 0 });
    }
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
  ctx.save(); ctx.lineWidth = .6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#707783';
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
      // Each discovered node is a researcher or an operator, keyed as in the opening network.
      ctx.globalAlpha = .9 * lens.networkFade;
      ctx.fillStyle = to % 2 ? '#ff6655' : '#244eff';
      dot(ctx, point.x, point.y, Math.max(1.6, 1.5 * p.radius * scene.field.bounds.grainSize * (point.magnification || 1)));
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
    ctx.fillStyle = `rgba(36,78,255,${alpha})`;
    dot(ctx, magnified.x, magnified.y, p.radius * scene.field.bounds.grainSize * magnified.magnification);
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

// The coral's root sits on whichever heap grain is highest near the middle.
function heapTop(scene) {
  let top = null;
  for (const id of scene.grow.rock.keys()) {
    const p = scene.field.particles[id];
    if (Math.abs(p.x) < p.r * 7 && (!top || p.y - p.r < top.y - top.r)) top = p;
  }
  const point = top ? { x: top.x, y: top.y - top.r } : { x: 0, y: scene.field.bounds.bottom };
  return project(scene, point);
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
    // The rock reads as one solid form, a little darker than the grains left in the water.
    const alpha = scene.grow.rock.has(p.id) ? scene.opacity + (.6 - scene.opacity) * scene.rock : scene.opacity;
    ctx.globalAlpha = alpha * appeared;
    const point = project(scene, p);
    dot(ctx, point.x, point.y, p.radius * scene.field.bounds.grainSize);
  }
  ctx.restore();
  if (scene.phase === 0) drawLens(ctx, scene);
  const grain = id => id === scene.grow.root ? heapTop(scene) : project(scene, scene.field.particles[id]);
  const presentation = approachPresentation(scene);
  if (scene.phase === 2) drawAdaptGrow(ctx, grain, presentation, { width, height });
  if (scene.coralExit) drawAdaptGrow(ctx, grain, scene.coralExit.state, { width, height, opacity: 1 - smooth(scene.coralExit.age / .45) });
  return presentation;
}
