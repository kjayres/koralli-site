// The journal lives in open water. All dimensions below are CSS pixels.
// Seeded continuous motion keeps a resize, a still frame and reduced motion stable.
const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const mix = (a, b, t) => a + (b - a) * t;
const wrap = (x, span) => ((x % span) + span) % span;
const smooth = x => x * x * (3 - 2 * x);
const hash = n => {
  const value = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return value - Math.floor(value);
};
const noise = (x, seed = 0) => {
  const cell = Math.floor(x);
  return mix(hash(cell + seed * 71), hash(cell + 1 + seed * 71), smooth(x - cell)) * 2 - 1;
};

/** Shared horizontal current for the marine scene and the living title. */
export function journalCurrent(time = 0) {
  const seconds = Number.isFinite(time) ? Math.max(0, time) : 0;
  return .6 * noise(seconds * .06, 41) + .4 * Math.sin(seconds * .23 + 1.4);
}

let cachedScene;

function makeScene(width, height) {
  if (cachedScene?.width === width && cachedScene.height === height) return cachedScene;
  const compact = width < 700;
  const size = clamp(width / 1440, .66, 1.18);
  const fronds = [];
  const bases = compact ? [[-9, 8], [width + 8, 35]] : [[-8, 15], [width * .048, 40], [width * .958, 5], [width + 14, 38]];
  for (let plant = 0; plant < bases.length; plant++) {
    const [rootX, rootLift] = bases[plant];
    const side = rootX < width / 2 ? 1 : -1;
    const count = compact ? 5 : 6;
    for (let leaf = 0; leaf < count; leaf++) {
      const seed = plant * 43 + leaf * 11 + 7;
      const length = Math.min(height * .66, 1120) * (.42 + hash(seed) * .54);
      fronds.push({
        seed, rootX: rootX + (hash(seed + 1) - .5) * 20 * size,
        rootY: height + rootLift, length,
        lean: side * (22 + hash(seed + 2) * (compact ? 52 : 100)) + (leaf - count / 2) * 10,
        width: (4.5 + hash(seed + 3) * 9) * size,
        opacity: .16 + hash(seed + 4) * .2,
        segments: Math.ceil(length / 11), side
      });
    }
  }
  // Phases and depth lanes are deliberately unequal. Fish enter and leave offstage.
  const fish = [
    { seed: 4, x: .77, y: .105, size: 63, speed: 12.4, direction: -1, opacity: .44, depth: .65 },
    { seed: 19, x: .18, y: .30, size: 42, speed: 8.2, direction: 1, opacity: .25, depth: .25 },
    { seed: 34, x: .87, y: .48, size: 77, speed: 10.4, direction: -1, opacity: .38, depth: .8 },
    { seed: 52, x: .12, y: .67, size: 58, speed: 9.7, direction: 1, opacity: .33, depth: .55 },
    { seed: 78, x: .7, y: .81, size: 34, speed: 7.4, direction: 1, opacity: .23, depth: .15 },
    { seed: 87, x: .91, y: .9, size: 52, speed: 11.2, direction: -1, opacity: .37, depth: .5 }
  ].filter((_, i) => !compact || i !== 1 && i !== 4);
  const particles = Array.from({ length: compact ? 48 : 95 }, (_, i) => ({
    x: hash(i * 7 + 61) * width, y: hash(i * 7 + 62) * height,
    size: .35 + hash(i * 7 + 63) * .7, speed: .6 + hash(i * 7 + 64) * 1.8,
    alpha: .11 + hash(i * 7 + 65) * .19, seed: i * 7 + 66
  }));
  cachedScene = { width, height, compact, size, fronds, fish, particles };
  return cachedScene;
}

function trace(ctx, points) {
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
}

function drawFrond(ctx, frond, time, current, compact) {
  const left = [], right = [], spine = [];
  let x = frond.rootX, y = frond.rootY;
  const step = frond.length / frond.segments;
  for (let i = 0; i <= frond.segments; i++) {
    const u = i / frond.segments;
    // The root is pinned; water bends successive sections rather than sliding a leaf.
    const angle = frond.lean / frond.length + u * .2 * current
      + Math.pow(u, 1.45) * (.14 * Math.sin(time * .44 - u * 4.1 + frond.seed)
        + .22 * noise(time * .09 - u * 1.8, frond.seed))
      + Math.sin(u * 5.4 + frond.seed) * .14 * u;
    if (i) { x += Math.sin(angle) * step; y -= Math.cos(angle) * step; }
    const twist = .22 + .78 * Math.abs(Math.cos(u * (3.8 + hash(frond.seed) * 3) + time * .07 + frond.seed));
    const taper = Math.pow(Math.sin(Math.PI * Math.pow(u, .8)), .75);
    const radius = (.2 + frond.width * taper) * twist;
    const edge = 1 + .11 * Math.sin(u * 33 + frond.seed);
    const nx = Math.cos(angle), ny = Math.sin(angle);
    left.push([x - nx * radius * edge, y - ny * radius * edge]);
    right.push([x + nx * radius / edge, y + ny * radius / edge]);
    spine.push([x, y]);
  }
  ctx.globalAlpha = frond.opacity * (compact ? .72 : 1);
  ctx.lineWidth = .6;
  ctx.strokeStyle = '#8FA5FF';
  ctx.beginPath(); trace(ctx, left); trace(ctx, right); ctx.stroke();
  ctx.globalAlpha *= .53;
  ctx.lineWidth = .42;
  ctx.beginPath(); trace(ctx, spine);
  for (let i = 1; i < left.length; i++) {
    ctx.moveTo(...left[i]); ctx.lineTo(...right[i]);
    if (i % 2 === 0) { ctx.moveTo(...left[i - 1]); ctx.lineTo(...right[i]); }
    else { ctx.moveTo(...right[i - 1]); ctx.lineTo(...left[i]); }
  }
  ctx.stroke();
}

// A laterally compressed body built from elliptical cross sections, not a flat icon.
// Positive x is the nose; the tail bends more than the rigid head.
function fishPoint(x, y, z, time, seed) {
  const tail = Math.pow(clamp((.36 - x) / .93, 0, 1), 1.7);
  const beat = Math.sin(time * 3.5 + seed + x * 4.2);
  const bend = tail * .105 * beat;
  const yaw = .15 * Math.sin(time * .14 + seed) + .1;
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  return [(x * cy + (z + bend) * sy), y + (z + bend) * .3];
}

function drawFish(ctx, item, scene, time, current, scroll) {
  const { width, height, compact, size } = scene;
  const fishSize = item.size * (compact ? .78 : size);
  const span = width + 200;
  const travel = item.speed * time + 16 * noise(time * .045, item.seed);
  const x = wrap(item.x * width + 100 + item.direction * travel, span) - 100;
  const y = item.y * height + 19 * noise(time * .024, item.seed + 7)
    + 6 * Math.sin(time * .16 + item.seed) + scroll * item.depth * 9;
  if (x < -fishSize || x > width + fishSize) return;
  const edgeDistance = Math.min(x, width - x) / width;
  const centreQuiet = 1 - .55 * smooth(clamp((edgeDistance - .1) / .18, 0, 1));
  const alpha = item.opacity * centreQuiet;
  const pitch = .016 * current + .04 * Math.cos(time * .16 + item.seed);
  const convert = point => {
    const p = fishPoint(...point, time, item.seed);
    return [x + item.direction * (p[0] * Math.cos(pitch) - p[1] * Math.sin(pitch)) * fishSize,
      y + (p[0] * Math.sin(pitch) + p[1] * Math.cos(pitch)) * fishSize];
  };
  const rings = [];
  for (let i = 0; i <= 19; i++) {
    const u = i / 19;
    const rx = mix(-.39, .46, u);
    const radius = Math.pow(Math.sin(Math.PI * u), .68) * (.7 + .3 * u);
    const ring = [];
    for (let j = 0; j <= 12; j++) {
      const angle = TAU * j / 12;
      ring.push(convert([rx, Math.cos(angle) * .19 * radius, Math.sin(angle) * .095 * radius]));
    }
    rings.push(ring);
  }
  ctx.strokeStyle = '#B5C4FA'; ctx.lineWidth = .48;
  ctx.globalAlpha = alpha * .54;
  ctx.beginPath();
  for (const ring of rings) trace(ctx, ring);
  for (let j = 0; j < 12; j++) trace(ctx, rings.map(ring => ring[j]));
  ctx.stroke();
  ctx.globalAlpha = alpha; ctx.lineWidth = .65;
  ctx.beginPath();
  trace(ctx, rings.map(ring => ring[0]));
  trace(ctx, rings.map(ring => ring[6]));
  ctx.stroke();
  const fin = (root, outer, tip, ribs) => {
    const points = [root, outer, tip].map(convert);
    ctx.beginPath(); trace(ctx, [...points, points[0]]);
    for (let i = 1; i < ribs; i++) {
      const u = i / ribs;
      const end = outer.map((value, axis) => mix(value, tip[axis], u));
      const start = root.map((value, axis) => mix(value, tip[axis], u * .7));
      ctx.moveTo(...convert(start)); ctx.lineTo(...convert(end));
    }
    ctx.stroke();
  };
  ctx.lineWidth = .47; ctx.globalAlpha = alpha * .72;
  // Dorsal, anal and near pectoral fins are separate thin ribbed membranes.
  fin([.19, -.163, 0], [-.07, -.285, 0], [-.3, -.092, 0], 10);
  fin([.05, .18, 0], [-.16, .27, 0], [-.31, .086, 0], 7);
  fin([.21, .025, .07], [.02, .17, .18], [.03, .045, .07], 6);
  // A concave fork, with the narrow caudal peduncle still visible.
  const tail = [[-.365, -.038, 0], [-.67, -.185, 0], [-.55, 0, 0], [-.67, .185, 0], [-.365, .038, 0]];
  ctx.beginPath(); trace(ctx, [...tail, tail[0]].map(convert));
  for (let i = 0; i <= 12; i++) {
    const u = i / 12, v = Math.abs(u - .5) * 2;
    ctx.moveTo(...convert([-.37, mix(-.033, .033, u), 0]));
    ctx.lineTo(...convert([-.55 - .12 * v, mix(-.185, .185, u), 0]));
  }
  ctx.stroke();
  ctx.globalAlpha = alpha * .85;
  const eye = convert([.325, -.045, .055]);
  ctx.fillStyle = '#CDDAFF';
  ctx.beginPath(); ctx.arc(...eye, Math.max(.55, fishSize * .008), 0, TAU); ctx.fill();
  ctx.globalAlpha = alpha * .55;
  ctx.beginPath();
  trace(ctx, [[.235, -.116, .055], [.19, -.05, .09], [.19, .035, .09], [.225, .115, .055]].map(convert));
  ctx.stroke();
}

function drawJelly(ctx, scene, time, current) {
  const { width, height, compact } = scene;
  const radius = compact ? 12 : 21;
  const x = width * (compact ? .88 : .91) + noise(time * .023, 301) * (compact ? 8 : 25);
  const y = Math.min(height * .255, 435) + noise(time * .03, 98) * 15;
  const pulse = Math.pow(.5 + .5 * Math.sin(time * 1.2), 3);
  const rx = radius * (1 - pulse * .14), ry = radius * (.66 + pulse * .18);
  ctx.strokeStyle = '#8FA5FF'; ctx.globalAlpha = compact ? .16 : .21; ctx.lineWidth = .48;
  ctx.beginPath();
  // Latitudes and meridians form a translucent domed bell.
  for (let ring = 1; ring <= 6; ring++) {
    const a = ring / 6 * Math.PI / 2;
    const pts = [];
    for (let i = 0; i <= 42; i++) {
      const phi = i / 42 * TAU;
      pts.push([x + Math.cos(phi) * Math.sin(a) * rx,
        y - Math.cos(a) * ry + Math.sin(phi) * Math.sin(a) * rx * .2]);
    }
    trace(ctx, pts);
  }
  for (let rib = 0; rib < 14; rib++) {
    const phi = rib / 14 * TAU, pts = [];
    for (let i = 0; i <= 14; i++) {
      const a = i / 14 * Math.PI / 2;
      pts.push([x + Math.cos(phi) * Math.sin(a) * rx,
        y - Math.cos(a) * ry + Math.sin(phi) * Math.sin(a) * rx * .2]);
    }
    trace(ctx, pts);
  }
  ctx.stroke(); ctx.globalAlpha *= .7;
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const phi = i / 7 * TAU, pts = [];
    const length = radius * (2.1 + hash(i + 431) * 1.3);
    for (let j = 0; j <= 28; j++) {
      const u = j / 28;
      pts.push([x + Math.cos(phi) * rx * .82 + current * u * 7
        + Math.sin(u * 7 - time * .65 + i) * u * radius * .12,
        y + Math.sin(phi) * rx * .18 + u * length]);
    }
    trace(ctx, pts);
  }
  ctx.stroke();
}

/**
 * Transparent marine scenery. Call with CSS-pixel dimensions after setting the
 * context's DPR transform. time is elapsed seconds; no wall-clock state is kept.
 * reducedMotion freezes the same composed scene. scrollProgress (0..1) is optional.
 */
export function drawJournalWater(ctx, width, height, time = 0, options = {}) {
  if (!ctx || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
  const scene = makeScene(width, height);
  const elapsed = Number(time);
  const seconds = options.reducedMotion || !Number.isFinite(elapsed) ? 0 : Math.max(0, elapsed);
  const scroll = options.reducedMotion ? 0 : clamp(Number(options.scrollProgress) || 0, 0, 1);
  const current = journalCurrent(seconds);
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const p of scene.particles) {
    const x = wrap(p.x + seconds * p.speed * .25 + noise(seconds * .05, p.seed) * 11, width + 20) - 10;
    const y = wrap(p.y - seconds * p.speed + noise(seconds * .03, p.seed + 9) * 7, height + 20) - 10;
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = '#A8BDF7';
    ctx.beginPath(); ctx.arc(x, y, p.size, 0, TAU); ctx.fill();
  }
  drawJelly(ctx, scene, seconds, current);
  for (const fish of scene.fish) drawFish(ctx, fish, scene, seconds, current, scroll);
  for (const frond of scene.fronds) drawFrond(ctx, frond, seconds, current, scene.compact);
  ctx.restore();
}
