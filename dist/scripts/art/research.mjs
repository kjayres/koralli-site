const TAU = Math.PI * 2;
const COUNT = 1800;
const DURATION = 16;
const STEP = 1 / 240;
const states = new WeakMap();
const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
const random = seed => {
  let n = Math.imul(seed + 271, 374761393);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};

// These paths are sampled into grains once. Only the grains are ever painted.
function makeShape(build) {
  const points = [];
  const line = (x1, y1, x2, y2) => {
    const count = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / .006));
    for (let i = 0; i < count; i++) {
      const t = i / count;
      points.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]);
    }
  };
  const path = vertices => {
    for (let i = 1; i < vertices.length; i++) line(...vertices[i - 1], ...vertices[i]);
  };
  const box = (x, y, w, h) => path([[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]]);
  const circle = (x, y, radius, start = 0, end = TAU) => {
    const count = Math.ceil((end - start) * radius / .006);
    for (let i = 0; i < count; i++) {
      const angle = start + (end - start) * i / count;
      points.push([x + Math.cos(angle) * radius, y + Math.sin(angle) * radius]);
    }
  };
  const fill = (x, y, w, h) => {
    for (let py = y; py < y + h; py += .012) {
      for (let px = x; px < x + w; px += .012) points.push([px, py]);
    }
  };
  build({ line, path, box, circle, fill });
  const targets = Array.from({ length: COUNT }, (_, i) => {
    const [x, y] = points[Math.floor((i + .5) * points.length / COUNT)];
    return { x: x + (random(i + 721) - .5) * .004, y: y + (random(i + 1911) - .5) * .004 };
  });
  // A stable shuffle keeps each incoming stream distributed across the form.
  for (let i = targets.length - 1; i > 0; i--) {
    const j = Math.floor(random(i + 3301) * (i + 1));
    [targets[i], targets[j]] = [targets[j], targets[i]];
  }
  return targets;
}

const shapes = [
  makeShape(({ line, path, box, fill }) => {
    box(-.61, -.38, 1.22, .76);
    line(-.61, -.24, .61, -.24);
    line(-.43, -.24, -.43, .38);
    line(-.54, -.31, -.31, -.31);
    for (let i = 0; i < 4; i++) line(-.55, -.13 + i * .11, -.48, -.13 + i * .11);
    for (let i = 0; i < 3; i++) {
      box(-.35 + i * .31, -.16, .24, .15);
      line(-.31 + i * .31, -.085, -.20 + i * .31, -.085);
    }
    path([[-.33, .06], [-.33, .29], [.05, .29]]);
    fill(-.26, .18, .055, .10);
    fill(-.15, .12, .055, .16);
    fill(-.04, .065, .055, .215);
    path([[.15, .29], [.15, .065], [.15, .29], [.52, .29]]);
    path([[.17, .24], [.24, .20], [.31, .22], [.40, .11], [.47, .13], [.53, .055]]);
  }),
  makeShape(({ line, path, box, circle }) => {
    // Three agents pass work through a central decision to a shared output.
    for (const y of [-.29, 0, .29]) {
      box(-.61, y - .105, .24, .21);
      circle(-.49, y - .028, .031);
      circle(-.49, y + .053, .057, Math.PI, TAU);
      path([[-.37, y], [-.25, y], [-.13, 0]]);
    }
    path([[-.13, 0], [0, -.14], [.13, 0], [0, .14], [-.13, 0]]);
    line(.13, 0, .34, 0);
    path([[.27, -.05], [.34, 0], [.27, .05]]);
    box(.35, -.18, .26, .36);
    for (let i = 0; i < 3; i++) line(.40, -.09 + i * .09, .56, -.09 + i * .09);
  }),
  makeShape(({ path, fill }) => {
    // A broad claw head and long handle remain legible at small canvas sizes.
    path([[-.43, -.30], [-.32, -.41], [.15, -.41], [.36, -.32], [.48, -.13],
      [.31, -.22], [.19, -.24], [.15, -.14], [-.14, -.14], [-.19, -.22],
      [-.30, -.22], [-.30, -.14], [-.43, -.14], [-.43, -.30]]);
    fill(-.30, -.35, .42, .14);
    fill(-.12, -.14, .14, .56);
    path([[-.12, -.14], [-.15, .42], [.035, .42], [.02, -.14]]);
  }),
];

function constrain(p, bounds, dt) {
  const floor = bounds.bottom - p.r;
  if (p.y > floor) {
    p.y = floor;
    p.vy = 0;
    p.vx -= Math.sign(p.vx) * Math.min(Math.abs(p.vx), 1.4 * dt);
  }
  if (p.x - p.r < -bounds.halfWidth || p.x + p.r > bounds.halfWidth) {
    p.x = clamp(p.x, -bounds.halfWidth + p.r, bounds.halfWidth - p.r);
    p.vx *= -.08;
  }
  if (p.y - p.r < bounds.top) { p.y = bounds.top + p.r; p.vy = Math.abs(p.vy) * .08; }
}

function setBounds(state, bounds) {
  state.bounds = bounds;
  state.resting = false;
  state.particles.forEach(p => {
    p.r = p.radius * bounds.grainSize / bounds.scale;
    p.asleep = false;
    p.sleepTime = 0;
    constrain(p, bounds, 0);
  });
  state.cell = Math.max(...state.particles.map(p => p.r)) * 2 + .0003;
  state.minRadius = Math.min(...state.particles.map(p => p.r));
  state.columns = Math.ceil(bounds.halfWidth * 2 / state.cell) + 3;
  const rows = Math.ceil((bounds.bottom - bounds.top) / state.cell) + 3;
  state.binHeads = new Int32Array(state.columns * rows);
  state.binNext ||= new Int32Array(COUNT);
  state.binKeys ||= new Int32Array(COUNT);
  state.contacts ||= Array.from({ length: COUNT }, () => []);
  state.supported ||= new Uint8Array(COUNT);
  state.supportQueue ||= new Int32Array(COUNT);
}

function createState(seconds, bounds) {
  const particles = Array.from({ length: COUNT }, (_, i) => ({
    x: (random(i * 7 + 13) - .5) * bounds.halfWidth * 1.05,
    y: bounds.top + (bounds.bottom - bounds.top) * (.05 + random(i * 7 + 83) * .48),
    vx: (random(i + 301) - .5) * .025,
    vy: random(i + 515) * .08,
    delay: random(i + 915) * .35,
    radius: .68 + random(i + 431) * .32,
    attraction: 0,
  }));
  const state = { particles, time: Math.floor(seconds / DURATION) * DURATION, last: seconds, accumulator: 0 };
  setBounds(state, bounds);
  const warmup = seconds - state.time;
  const ticks = Math.floor(warmup / STEP);
  for (let i = 0; i < ticks; i++) step(state, STEP);
  state.accumulator = warmup - ticks * STEP;
  return state;
}

function nearbyPairs(state, visit) {
  const { particles, cell, bounds, columns, binHeads, binNext, binKeys } = state;
  binHeads.fill(-1);
  particles.forEach((p, i) => {
    if (p.attraction >= .12) return;
    const key = Math.floor((p.x + bounds.halfWidth) / cell) + 1
      + (Math.floor((p.y - bounds.top) / cell) + 1) * columns;
    binKeys[i] = key;
    binNext[i] = binHeads[key];
    binHeads[key] = i;
  });
  particles.forEach((p, i) => {
    if (p.attraction >= .12) return;
    for (let row = -1; row <= 1; row++) {
      for (let column = -1; column <= 1; column++) {
        const key = binKeys[i] + row * columns + column;
        for (let j = binHeads[key]; j >= 0; j = binNext[j]) if (j > i) visit(p, particles[j], i, j);
      }
    }
  });
}

function collide(a, b) {
  let dx = b.x - a.x, dy = b.y - a.y;
  const reach = a.r + b.r;
  const squared = dx * dx + dy * dy;
  if (squared >= reach * reach) return;
  const distance = Math.sqrt(squared);
  if (distance < .0000001) { dx = 1; dy = 0; } else { dx /= distance; dy /= distance; }
  const correction = (reach - distance) * .48;
  a.x -= dx * correction; a.y -= dy * correction;
  b.x += dx * correction; b.y += dy * correction;
  if (a.asleep && b.asleep) return;
  const massA = a.asleep ? 0 : 1, massB = b.asleep ? 0 : 1;
  const mass = massA + massB;
  const normalSpeed = (b.vx - a.vx) * dx + (b.vy - a.vy) * dy;
  if (normalSpeed >= 0) return;
  const impulse = -normalSpeed / mass;
  a.vx -= impulse * dx * massA; a.vy -= impulse * dy * massA;
  b.vx += impulse * dx * massB; b.vy += impulse * dy * massB;
  const tangentSpeed = (b.vx - a.vx) * -dy + (b.vy - a.vy) * dx;
  const friction = clamp(-tangentSpeed / mass, -impulse * .6, impulse * .6);
  a.vx += friction * dy * massA; a.vy -= friction * dx * massA;
  b.vx -= friction * dy * massB; b.vy += friction * dx * massB;
}

function settle(state, dt) {
  const adjacency = state.contacts, supported = state.supported, queue = state.supportQueue;
  for (const neighbours of adjacency) neighbours.length = 0;
  supported.fill(0);
  let tail = 0;
  let maxOverlap = 0;
  // A grain may sleep only when touching the floor through a chain of real contacts.
  const tolerance = .00015;
  state.particles.forEach((p, i) => {
    if (p.attraction < .005 && state.bounds.bottom - p.y - p.r < tolerance) {
      supported[i] = 1; queue[tail++] = i;
    }
  });
  nearbyPairs(state, (a, b, i, j) => {
    const reach = a.r + b.r + tolerance;
    const squared = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
    if (squared <= reach * reach) {
      adjacency[i].push(j); adjacency[j].push(i);
      maxOverlap = Math.max(maxOverlap, a.r + b.r - Math.sqrt(squared));
    }
  });
  for (let cursor = 0; cursor < tail; cursor++) {
    for (const next of adjacency[queue[cursor]]) {
      if (!supported[next]) { supported[next] = 1; queue[tail++] = next; }
    }
  }
  state.particles.forEach((p, i) => {
    if (p.attraction >= .005 || !supported[i]) { p.sleepTime = 0; p.asleep = false; return; }
    if (Math.hypot(p.vx, p.vy) < .014) p.sleepTime += dt;
    else p.sleepTime = 0;
    if (p.sleepTime > .35) { p.asleep = true; p.vx = 0; p.vy = 0; }
  });
  state.resting = maxOverlap < state.minRadius * .02 && state.particles.every(p => p.asleep);
}

function step(state, dt) {
  state.time += dt;
  const phase = state.time % DURATION;
  if (state.resting && (phase < 3.3 || phase > 12.65)) return;
  state.resting = false;
  const shape = shapes[Math.floor(state.time / DURATION) % shapes.length];
  let freeGrains = false;
  state.particles.forEach((p, i) => {
    const gathering = smooth((phase - 3.3 - p.delay) / 1.8);
    const releasing = smooth((phase - 11.8 - p.delay * .5) / .65);
    const attraction = gathering * (1 - releasing);
    const free = 1 - attraction;
    p.attraction = attraction;
    if (attraction < .12) freeGrains = true;
    if (attraction >= .005) { p.asleep = false; p.sleepTime = 0; }
    if (p.asleep) return;
    const target = shape[i];
    const dx = target.x - p.x, dy = target.y - p.y;
    const curl = attraction * free * 2.8;
    p.vx += (attraction * (32 * dx - 6.8 * p.vx) - dy * curl - free * p.vx * .18) * dt;
    p.vy += (attraction * (32 * dy - 6.8 * p.vy) + dx * curl + free * (1.8 - p.vy * .18)) * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    constrain(p, state.bounds, dt);
  });
  if (!freeGrains) return;
  // Spatial bins keep contact work local; positions and velocities resolve together.
  for (let pass = 0; pass < 7; pass++) {
    nearbyPairs(state, collide);
    for (const p of state.particles) constrain(p, state.bounds, dt);
  }
  settle(state, dt);
}

/**
 * CSS-pixel painter. Caller owns the border, clearing, DPR and animation clock.
 * Physical disc radii equal painted radii. Only an active field suspends grains.
 */
export function drawResearch(ctx, width, height, seconds, { reducedMotion = false } = {}) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
  const time = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const scale = Math.min(width / 1.50, height / 1.30);
  const grainSize = clamp(scale / 320, .67, 1.32);
  const edge = 1 / scale;
  const bounds = { halfWidth: width / (2 * scale) - edge, top: -height / (2 * scale) + edge, bottom: height / (2 * scale) - edge, grainSize, scale };
  let state = states.get(ctx);
  if (!state) { state = createState(reducedMotion ? 0 : time, bounds); states.set(ctx, state); }
  if (state.bounds.scale !== scale || state.bounds.bottom !== bounds.bottom || state.bounds.halfWidth !== bounds.halfWidth) setBounds(state, bounds);
  if (!reducedMotion && state.reducedMotion) {
    state.particles.forEach((p, i) => Object.assign(p, shapes[0][i], { vx: 0, vy: 0, asleep: false, sleepTime: 0 }));
    state.time = 6;
    state.resting = false;
    state.last = time;
    state.accumulator = 0;
  }
  if (!reducedMotion) {
    const elapsed = Math.min(.1, Math.max(0, time - state.last));
    state.accumulator += elapsed;
    while (state.accumulator >= STEP) { step(state, STEP); state.accumulator -= STEP; }
  }
  state.last = time;
  state.reducedMotion = reducedMotion;
  ctx.save();
  ctx.fillStyle = '#244eff';
  for (let i = 0; i < COUNT; i++) {
    const point = reducedMotion ? shapes[0][i] : state.particles[i];
    const radius = state.particles[i].radius * grainSize;
    ctx.beginPath();
    ctx.arc(width / 2 + point.x * scale, height / 2 + point.y * scale, radius, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
