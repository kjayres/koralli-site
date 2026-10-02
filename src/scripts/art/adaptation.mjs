const TAU = Math.PI * 2;
const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const BLUE = [36, 78, 255], GREY = [112, 119, 131], CORAL = [232, 120, 131];
const INITIAL_COUNT = 5, CAPACITY = 12, ENTRY = 2.6, INTERVAL = 10;
const colour = (a, b, t) => a.map((value, i) => mix(value, b[i], t));
const css = rgb => `rgb(${rgb.map(Math.round).join(',')})`;

/** Centred ordinary least squares: y = intercept + slopeX*x + slopeZ*z. */
export function fitPlane(points) {
  if (!points.length) return { intercept: 0, slopeX: 0, slopeZ: 0 };
  let mx = 0, my = 0, mz = 0;
  for (const p of points) { mx += p.x; my += p.y; mz += p.z; }
  mx /= points.length; my /= points.length; mz /= points.length;
  let xx = 0, zz = 0, xz = 0, xy = 0, zy = 0;
  for (const p of points) {
    const x = p.x - mx, y = p.y - my, z = p.z - mz;
    xx += x * x; zz += z * z; xz += x * z; xy += x * y; zy += z * y;
  }
  const determinant = xx * zz - xz * xz;
  let slopeX = 0, slopeZ = 0;
  if (determinant > Number.EPSILON * Math.max(1, xx * zz) * 64) {
    slopeX = (xy * zz - zy * xz) / determinant;
    slopeZ = (zy * xx - xy * xz) / determinant;
  } else if (xx >= zz && xx > Number.EPSILON) slopeX = xy / xx;
  else if (zz > Number.EPSILON) slopeZ = zy / zz;
  return { intercept: my - slopeX * mx - slopeZ * mz, slopeX, slopeZ };
}
const predict = (fit, p) => fit.intercept + fit.slopeX * p.x + fit.slopeZ * p.z;
const mixFit = (a, b, t) => ({ intercept: mix(a.intercept, b.intercept, t), slopeX: mix(a.slopeX, b.slopeX, t), slopeZ: mix(a.slopeZ, b.slopeZ, t) });

// Five non-collinear starting measurements, then one surprising local observation.
const INITIAL = [[-.48, -.42, -.025], [-.48, .42, .025], [.48, -.42, .03], [.48, .42, -.03], [0, 0, 0]];
const CLUSTERS = [[.34, .27], [-.36, .25], [-.30, -.32], [.32, -.28]];
const RESPONSE_OFFSETS = [.20, .133, .066, 0, -.066, -.133, -.20];
function observation(id) {
  let x, z, deviation;
  if (id < INITIAL_COUNT) [x, z, deviation] = INITIAL[id];
  else {
    const event = id - INITIAL_COUNT, centre = CLUSTERS[event % CLUSTERS.length];
    x = centre[0] + .018 * Math.sin(event * 1.73);
    z = centre[1] + .018 * Math.cos(event * 1.37);
    // The response cycle does not divide the rolling window: updates keep mattering.
    deviation = RESPONSE_OFFSETS[event % RESPONSE_OFFSETS.length];
  }
  return { id, slot: id % CAPACITY, x, y: .04 + .20 * x + .10 * z + deviation, z };
}
function windowOf(total) {
  return Array.from({ length: Math.min(CAPACITY, total) }, (_, i) => observation(Math.max(0, total - CAPACITY) + i));
}
function camera(turn) {
  const yaw = Math.PI / 12 * clamp(turn), pitch = Math.PI / 18 * clamp(turn);
  return { cy: Math.cos(yaw), sy: Math.sin(yaw), cp: Math.cos(pitch), sp: Math.sin(pitch) };
}

/** Bounded rolling data, derived directly from phase age rather than an accumulating log. */
export function adaptationPresentation(age, reducedMotion = false) {
  const seconds = reducedMotion ? ENTRY + 35.5 : (Number.isFinite(age) ? Math.max(0, age) : 0);
  const local = Math.max(0, seconds - ENTRY), event = Math.floor(local / INTERVAL), eventAge = local % INTERVAL;
  const total = INITIAL_COUNT + event, previousTotal = Math.max(INITIAL_COUNT, total - 1);
  const current = windowOf(total), previous = windowOf(previousTotal);
  const updateProgress = event ? ease((eventAge - 5) / .3) : 1;
  const previousFit = fitPlane(previous), nextFit = fitPlane(current);
  const fitObservations = event && eventAge < 5 ? previous : current;
  const targetFit = event && eventAge < 5 ? previousFit : nextFit;
  const fit = event ? mixFit(previousFit, nextFit, updateProgress) : nextFit;
  const initialFit = reducedMotion ? 1 : ease((seconds - 3.4) / .55);
  const pending = [], points = Array(CAPACITY).fill(null);
  const observations = current.map(point => {
    const recent = event > 0 && point.id >= previousTotal;
    const included = !recent || eventAge >= 5;
    if (!included) pending.push(point.id);
    // Before recycling a slot, let its oldest displayed observation recede quietly.
    const retiring = total >= CAPACITY && point.id < total - CAPACITY + 1;
    const retirement = retiring && !reducedMotion ? 1 - ease((eventAge - 9.55) / .4) : 1;
    const presence = (recent && !reducedMotion ? ease(eventAge / .2) : 1) * retirement;
    const pulse = recent && !reducedMotion ? 1 - updateProgress : 0;
    const ringProgress = recent ? clamp((eventAge % 1.5) / 1.25) : 1;
    const ringOpacity = pulse * (1 - ringProgress) ** 2;
    const item = { ...point, included, presence, pulse, ringProgress, ringOpacity, residualOpacity: recent ? updateProgress : initialFit };
    points[point.slot] = item;
    return item;
  });
  const assemble = reducedMotion ? 1 : ease((seconds - 1.1) / 1.25);
  const turn = reducedMotion ? 1 : ease((seconds - 1.1) / 1.5);
  return {
    caption: '03 / ADAPT & GROW',
    detail: pending.length ? 'New evidence arrives' : event && updateProgress < 1 ? 'Updating the model' : 'Learning from new evidence',
    age: seconds, local, event, eventAge, total, pending, updateProgress, refitProgress: updateProgress,
    assemble, turn, camera: camera(turn), initialFit,
    frameOpacity: reducedMotion ? 1 : ease((seconds - 1.55) / .8),
    planeOpacity: initialFit, points, observations, fitObservations, fit, targetFit,
  };
}

function projectWithCamera(point, width, height, view) {
  const x = point.x * view.cy + point.z * view.sy;
  const depth = point.z * view.cy - point.x * view.sy;
  const y = point.y * view.cp - depth * view.sp;
  const scale = Math.min(width, height) * .36;
  return { x: width / 2 + x * scale, y: height * .49 - y * scale };
}
export function projectAdaptation(point, width, height, turn = 1) {
  return projectWithCamera({ z: 0, ...point }, width, height, camera(turn));
}
function observationSlot(id, count) {
  const slot = Math.floor(id * CAPACITY / count);
  return Math.floor((slot + .5) * count / CAPACITY) === id ? slot : -1;
}

/** Every scene grain retains its identity, even when its context opacity reaches zero. */
export function adaptationParticle(scene, id, state = adaptationPresentation(scene.age, scene.reducedMotion)) {
  const p = scene.field.particles[id], bounds = scene.field.bounds, location = scene.locations[id];
  const slot = observationSlot(id, scene.field.particles.length), point = slot < 0 ? null : state.points[slot];
  const context = { x: (location.u - .5) * 1.9, y: (.5 - location.v) * 1.8, z: (((id * 73 + 19) % 997) / 996 - .5) * 1.7 };
  const destination = projectWithCamera(point || context, scene.width, scene.height, state.camera);
  const original = { x: scene.width / 2 + p.x * bounds.scale, y: scene.height / 2 + p.y * bounds.scale };
  const radius = Math.max(1.8, Math.min(2.7, scene.width * .0063));
  const baseColour = colour(BLUE, GREY, scene.grey || 0);
  const fittedColour = colour(GREY, BLUE, state.initialFit);
  const dataColour = point ? colour(fittedColour, CORAL, point.pulse) : GREY;
  return {
    id, observation: point ? point.id : null,
    x: mix(original.x, destination.x, state.assemble), y: mix(original.y, destination.y, state.assemble),
    radius: mix(p.radius * bounds.grainSize, radius, state.assemble),
    alpha: mix(scene.opacity ?? .3, point ? .9 * point.presence : 0, state.assemble),
    colour: css(colour(baseColour, dataColour, state.assemble)),
    pulse: point ? point.pulse * state.assemble : 0,
    ringRadius: point ? mix(4, 14, point.ringProgress) * Math.min(1, Math.min(scene.width, scene.height) / 360) : 0,
    ringOpacity: point ? point.ringOpacity * state.assemble : 0,
  };
}

const BOX = [
  [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
  [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
].map(([x, y, z]) => ({ x, y, z }));
const EDGES = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
function dot(ctx, point, radius) { ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, TAU); ctx.fill(); }
function segment(ctx, a, b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }

/** Caller owns clear, DPR and clock. particles=false draws a retiring cube and plane. */
export function drawAdaptation(ctx, scene, { opacity = 1, particles = true, state = adaptationPresentation(scene.age, scene.reducedMotion) } = {}) {
  const project = point => projectWithCamera(point, scene.width, scene.height, state.camera);
  const onPlane = (x, z) => project({ x, z, y: predict(state.fit, { x, z }) });
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#858d9d'; ctx.lineWidth = .55;
  ctx.globalAlpha = opacity * state.frameOpacity * .55;
  const box = BOX.map(project);
  for (const [a, b] of EDGES) segment(ctx, box[a], box[b]);

  const corners = [[-.92, -.92], [.92, -.92], [.92, .92], [-.92, .92]].map(([x, z]) => onPlane(x, z));
  ctx.globalAlpha = opacity * state.planeOpacity * .045; ctx.fillStyle = '#244eff';
  ctx.beginPath(); corners.forEach((point, i) => i ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = opacity * state.planeOpacity * .55; ctx.strokeStyle = '#526eaa'; ctx.lineWidth = .65; ctx.stroke();
  ctx.globalAlpha = opacity * state.planeOpacity * .24; ctx.lineWidth = .4;
  for (const coordinate of [-.46, 0, .46]) {
    segment(ctx, onPlane(coordinate, -.92), onPlane(coordinate, .92));
    segment(ctx, onPlane(-.92, coordinate), onPlane(.92, coordinate));
  }
  if (typeof ctx.setLineDash === 'function') ctx.setLineDash([1.2, 1.8]);
  ctx.strokeStyle = '#7488b2'; ctx.lineWidth = .45;
  for (const point of state.observations) {
    ctx.globalAlpha = opacity * state.planeOpacity * point.residualOpacity * point.presence * .48;
    segment(ctx, project(point), onPlane(point.x, point.z));
  }
  if (typeof ctx.setLineDash === 'function') ctx.setLineDash([]);

  if (particles) {
    for (const p of scene.field.particles) {
      if (state.assemble === 1 && !state.points[observationSlot(p.id, scene.field.particles.length)]) continue;
      const point = adaptationParticle(scene, p.id, state);
      if (point.alpha <= 0) continue;
      if (point.ringOpacity > 0) {
        ctx.globalAlpha = opacity * point.ringOpacity * .34; ctx.strokeStyle = '#e87883'; ctx.lineWidth = .65;
        ctx.beginPath(); ctx.arc(point.x, point.y, point.ringRadius, 0, TAU); ctx.stroke();
      }
      ctx.globalAlpha = opacity * point.alpha; ctx.fillStyle = point.colour;
      dot(ctx, point, point.radius);
    }
  }
  ctx.restore();
  return state;
}
