const TAU = Math.PI * 2;
export const RESEARCH_PARTICLE_COUNT = 1800;
const COUNT = RESEARCH_PARTICLE_COUNT;
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
    // Related records: three tables, connected through shared keys.
    const table = (x, y, width, height, rows) => {
      box(x, y, width, height);
      line(x, y + .09, x + width, y + .09);
      line(x + .045, y + .045, x + width * .69, y + .045);
      for (let i = 0; i < rows; i++) {
        const rowY = y + .09 + (height - .09) * (i + .5) / rows;
        circle(x + .035, rowY, .008);
        line(x + .075, rowY, x + width - .035, rowY);
      }
    };
    table(-.60, -.29, .38, .57, 4);
    table(.16, -.38, .44, .32, 2);
    table(.16, .07, .44, .32, 2);
    path([[-.22, -.10], [-.04, -.10], [-.04, -.22], [.16, -.22]]);
    path([[-.22, .15], [.055, .15], [.055, .24], [.16, .24]]);
    for (const y of [-.22, .24]) {
      line(.10, y, .16, y - .035);
      line(.10, y, .16, y + .035);
    }
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
  makeShape(({ line, path }) => {
    const beam = (a, b, width) => {
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const nx = -(b[1] - a[1]) / length, ny = (b[0] - a[0]) / length;
      const steps = Math.ceil(width / .008);
      for (let i = 0; i <= steps; i++) {
        const offset = width * (i / steps - .5);
        line(a[0] + nx * offset, a[1] + ny * offset, b[0] + nx * offset, b[1] + ny * offset);
      }
    };
    const outer = [], inner = [];
    for (let i = 0; i <= 100; i++) {
      const t = i / 100, angle = -1.48 + t * 4.20;
      const thickness = .125 * Math.sin(Math.PI * t * .91) ** .72;
      const point = radius => [.005 + Math.cos(angle) * radius, -.015 + Math.sin(angle) * radius];
      const a = point(.46), b = point(.46 - thickness);
      outer.push(a); inner.push(b);
      line(...a, ...b);
    }
    path([...outer, ...inner.reverse(), outer[0]]);
    beam([-.39, .17], [-.57, .43], .075);
    beam([-.25, -.29], [.36, .39], .09);
    beam([-.44, -.19], [-.06, -.48], .14);
  }),
];

export const RESEARCH_FORM_COUNT = shapes.length;

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

/** Canvas geometry and particle coordinates use the same centred, normalised space. */
export function researchBounds(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const scale = Math.min(width / 1.50, height / 1.30);
  const grainSize = clamp(scale / 320, .67, 1.32);
  const edge = 1 / scale;
  return { halfWidth: width / (2 * scale) - edge, top: -height / (2 * scale) + edge, bottom: height / (2 * scale) - edge, grainSize, scale };
}

/** New fields start immediately; callers decide whether to drop or suspend them. */
export function createParticleField(bounds) {
  const particles = Array.from({ length: COUNT }, (_, i) => ({
    id: i,
    x: (random(i * 7 + 13) - .5) * bounds.halfWidth * 1.05,
    y: bounds.top + (bounds.bottom - bounds.top) * (.05 + random(i * 7 + 83) * .48),
    vx: (random(i + 301) - .5) * .025,
    vy: random(i + 515) * .08,
    delay: random(i + 915) * .35,
    radius: .68 + random(i + 431) * .32,
    attraction: 0,
  }));
  const state = { particles, time: 0, last: 0, accumulator: 0 };
  setBounds(state, bounds);
  return state;
}

/** Resize the container without replacing grains or restarting their simulation. */
export function resizeParticleField(state, bounds) {
  setBounds(state, bounds);
  return state;
}

/** Stable, shared targets. Treat the returned array and points as read-only. */
export function researchTargets(index = 0) {
  const i = Number.isFinite(index) ? Math.trunc(index) : 0;
  return shapes[((i % shapes.length) + shapes.length) % shapes.length];
}

function createState(seconds, bounds) {
  const state = createParticleField(bounds);
  state.time = Math.floor(seconds / DURATION) * DURATION;
  state.last = seconds;
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
    if (p.attraction === 0 && state.bounds.bottom - p.y - p.r < tolerance) {
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
    if (p.attraction > 0 || !supported[i]) { p.sleepTime = 0; p.asleep = false; return; }
    if (Math.hypot(p.vx, p.vy) < .014) p.sleepTime += dt;
    else p.sleepTime = 0;
    if (p.sleepTime > .35) { p.asleep = true; p.vx = 0; p.vy = 0; }
  });
  state.resting = maxOverlap < state.minRadius * .02 && state.particles.every(p => p.asleep);
}

function integrate(state, dt, { targets, attraction = 0, gravity = 1.8, damping, curl = 2.8 } = {}) {
  let attracting = false;
  state.particles.forEach((p, i) => {
    const force = typeof attraction === 'function' ? attraction(p, i) : attraction;
    p.attraction = targets?.[i] && Number.isFinite(force) ? clamp(force) : 0;
    if (p.attraction > 0) attracting = true;
  });
  if (state.resting && !attracting && gravity >= 0) return;
  state.resting = false;
  let freeGrains = false;
  state.particles.forEach((p, i) => {
    const attraction = p.attraction;
    const free = 1 - attraction;
    if (attraction < .12) freeGrains = true;
    if (attraction > 0 || gravity < 0) { p.asleep = false; p.sleepTime = 0; }
    if (p.asleep) return;
    const target = targets?.[i] || p;
    const dx = target.x - p.x, dy = target.y - p.y;
    const rotation = attraction * free * curl;
    const drag = damping ?? attraction * 6.8 + free * .18;
    p.vx += (attraction * 32 * dx - drag * p.vx - dy * rotation) * dt;
    p.vy += (attraction * 32 * dy - drag * p.vy + dx * rotation + free * gravity) * dt;
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

/** Advance at the original fixed timestep; long suspended frames cannot cause jumps. */
export function advanceParticleField(state, elapsed, options = {}) {
  if (!Number.isFinite(elapsed) || elapsed <= 0) return state;
  state.accumulator += Math.min(.1, elapsed);
  while (state.accumulator >= STEP) {
    state.time += STEP;
    integrate(state, STEP, options);
    state.accumulator -= STEP;
  }
  return state;
}

function step(state, dt) {
  state.time += dt;
  const phase = state.time % DURATION;
  if (state.resting && (phase < 3.3 || phase > 12.65)) return;
  integrate(state, dt, {
    targets: researchTargets(Math.floor(state.time / DURATION)),
    attraction: p => {
      const gathering = smooth((phase - 3.3 - p.delay) / 1.8);
      const releasing = smooth((phase - 11.8 - p.delay * .5) / .65);
      return gathering * (1 - releasing);
    },
  });
}

/**
 * CSS-pixel painter. Caller owns the border, clearing, DPR and animation clock.
 * Physical disc radii equal painted radii. Only an active field suspends grains.
 */
export function drawResearch(ctx, width, height, seconds, { reducedMotion = false } = {}) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
  const time = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const bounds = researchBounds(width, height);
  const { scale, grainSize } = bounds;
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
