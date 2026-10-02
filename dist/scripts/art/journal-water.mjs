import { drawJournalSquid } from './journal-squid.mjs?v=e816cf862215';
import { drawDeepFish } from './journal-deep-life.mjs?v=e816cf862215';
import { drawJournalJelly } from './journal-jelly.mjs?v=e816cf862215';

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

function habitatStone(x, floor, radius, height, seed, detail = 14) {
  const vertices = [[0, 0, height]], faces = [], rings = [], rows = 4;
  for (let row = 1; row <= rows; row++) {
    const latitude = row / rows * Math.PI / 2, ring = [];
    for (let i = 0; i < detail; i++) {
      const angle = i * TAU / detail;
      const edge = 1 + .09 * Math.sin(angle * 3 + seed) + .05 * Math.cos(angle * 5 - seed);
      const reach = radius * Math.sin(latitude) * edge;
      ring.push(vertices.length);
      vertices.push([reach * Math.cos(angle), reach * .42 * Math.sin(angle),
        height * Math.cos(latitude) * (1 + .05 * Math.sin(angle * 2 + seed) * Math.sin(latitude))]);
    }
    for (let i = 0; i < detail; i++) {
      const next = (i + 1) % detail;
      if (!rings.length) faces.push([0, ring[i], ring[next]]);
      else {
        const previous = rings.at(-1);
        faces.push([previous[i], ring[i], ring[next]], [previous[i], ring[next], previous[next]]);
      }
    }
    rings.push(ring);
  }
  const points = vertices.map(([dx, dy, z]) => [x + dx, floor - z - dy * .30]);
  const visible = [], edges = new Map();
  for (const face of faces) {
    const [a, b, c] = face.map(i => vertices[i]), u = b.map((n, i) => n - a[i]), v = c.map((n, i) => n - a[i]);
    const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    if (-normal[1] + normal[2] * .30 <= 0) continue;
    visible.push(face);
    for (let j = 0; j < 3; j++) {
      const pair = [face[j], face[(j + 1) % 3]].sort((a, b) => a - b), key = pair.join(':');
      const edge = edges.get(key);
      if (edge) edge.count++;
      else edges.set(key, { pair, count: 1 });
    }
  }
  return { points, faces: visible, edges: [...edges.values()], x, floor, radius, height };
}

function makeScene(width, height) {
  if (cachedScene?.width === width && cachedScene.height === height) return cachedScene;
  const compact = width < 700;
  const size = clamp(width / 1440, .66, 1.18);
  const fronds = [], habitats = [];
  const bases = compact ? [[14, 22], [width - 15, 28]]
    : [[18, 28], [width * .048, 38], [width * .958, 34], [width - 17, 24]];
  for (let plant = 0; plant < bases.length; plant++) {
    const [rootX, moundHeight] = bases[plant];
    const side = rootX < width / 2 ? 1 : -1;
    const count = compact ? 5 : 6;
    const seed = plant * 43 + 503, floor = height - (compact ? 5 : 8);
    const radius = (compact ? 25 : 32 + hash(seed) * 12) * size;
    const stone = habitatStone(rootX, floor, radius, moundHeight * size, seed);
    const rootY = floor - stone.height + 1.5;
    const roots = [];
    habitats.push({ stone, roots, seed, rootX, rootY,
      // Small low neighbours merge the holdfast rock into the lower page edge.
      cover: [-1, 1].map((direction, j) => habitatStone(rootX + direction * radius * .76,
        height - 2, radius * (.58 + j * .10), stone.height * (.29 + j * .08), seed + j * 13 + 1, 10)) });
    for (let leaf = 0; leaf < count; leaf++) {
      const seed = plant * 43 + leaf * 11 + 7;
      const length = Math.min(height * .66, 1120) * (.42 + hash(seed) * .54);
      const rootOffset = (hash(seed + 1) - .5) * (compact ? 8 : 12) * size;
      const attachment = [rootX + rootOffset, rootY + Math.abs(rootOffset) * .14];
      roots.push(attachment);
      fronds.push({
        seed, rootX: attachment[0], rootY: attachment[1], length,
        lean: side * (22 + hash(seed + 2) * (compact ? 52 : 100)) + (leaf - count / 2) * 10,
        width: (4.5 + hash(seed + 3) * 9) * size,
        opacity: .16 + hash(seed + 4) * .2,
        segments: Math.ceil(length / 11), side
      });
    }
  }
  const particles = Array.from({ length: compact ? 48 : 95 }, (_, i) => ({
    x: hash(i * 7 + 61) * width, y: hash(i * 7 + 62) * height,
    size: .35 + hash(i * 7 + 63) * .7, speed: .6 + hash(i * 7 + 64) * 1.8,
    alpha: .11 + hash(i * 7 + 65) * .19, seed: i * 7 + 66
  }));
  cachedScene = { width, height, compact, size, fronds, habitats, particles };
  return cachedScene;
}

function trace(ctx, points) {
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
}

function drawHabitatStone(ctx, stone, compact) {
  const alpha = compact ? .20 : .27;
  ctx.fillStyle = '#0E1A33'; ctx.globalAlpha = .92;
  ctx.beginPath();
  for (const face of stone.faces) {
    trace(ctx, face.map(i => stone.points[i])); ctx.closePath();
  }
  ctx.fill();
  ctx.strokeStyle = '#8FA5FF'; ctx.lineWidth = .42; ctx.globalAlpha = alpha * .66;
  ctx.beginPath();
  for (const { pair } of stone.edges) trace(ctx, pair.map(i => stone.points[i]));
  ctx.stroke();
  ctx.globalAlpha = alpha; ctx.lineWidth = .55; ctx.beginPath();
  for (const { pair, count } of stone.edges) if (count === 1) trace(ctx, pair.map(i => stone.points[i]));
  ctx.stroke();
}

function drawHoldfast(ctx, habitat, compact) {
  const { rootX, rootY, roots, stone, seed } = habitat;
  ctx.strokeStyle = '#8FA5FF'; ctx.lineWidth = .58; ctx.globalAlpha = compact ? .27 : .37;
  ctx.beginPath();
  for (const [x, y] of roots) trace(ctx, [[x, y], [mix(x, rootX, .4), y + 2.5], [rootX, rootY + 4]]);
  for (let root = 0; root < 5; root++) {
    const direction = (root - 2) / 2;
    const endX = rootX + direction * stone.radius * (.48 + hash(seed + root) * .18);
    const endY = rootY + stone.height * (.28 + .17 * Math.abs(direction));
    trace(ctx, [[rootX, rootY + 3], [mix(rootX, endX, .38), mix(rootY + 3, endY, .6)], [endX, endY]]);
    if (root % 2 === 0) trace(ctx, [[mix(rootX, endX, .65), mix(rootY + 3, endY, .8)],
      [endX + (root - 2) * 1.2, endY + stone.height * .10]]);
  }
  ctx.stroke();
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
    const twist = .22 + .78 * Math.abs(Math.cos(u * (3.8 + hash(frond.seed) * 3) + time * .07 * u + frond.seed));
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

/**
 * Transparent marine scenery. Call with CSS-pixel dimensions after setting the
 * context's DPR transform. time is elapsed seconds; no wall-clock state is kept.
 * reducedMotion freezes the same composed scene. scrollProgress (0..1) is optional.
 * viewport, when supplied, is an expanded {top, bottom} band in canvas CSS pixels;
 * only whole objects outside that band are skipped. Omit it for a complete still.
 */
export function drawJournalWater(ctx, width, height, time = 0, options = {}) {
  if (!ctx || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
  const scene = makeScene(width, height);
  const elapsed = Number(time);
  const seconds = options.reducedMotion || !Number.isFinite(elapsed) ? 0 : Math.max(0, elapsed);
  const scroll = options.reducedMotion ? 0 : clamp(Number(options.scrollProgress) || 0, 0, 1);
  const current = journalCurrent(seconds);
  const viewport = options.viewport;
  const visible = (top, bottom) => !viewport || bottom >= viewport.top && top <= viewport.bottom;
  const stoneVisible = stone => visible(stone.floor - stone.height * 1.1 - stone.radius * .15 - 2,
    stone.floor + stone.radius * .15 + 2);
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const p of scene.particles) {
    const x = wrap(p.x + seconds * p.speed * .25 + noise(seconds * .05, p.seed) * 11, width + 20) - 10;
    const y = wrap(p.y + seconds * p.speed + noise(seconds * .03, p.seed + 9) * 7, height + 20) - 10;
    if (!visible(y - p.size - 1, y + p.size + 1)) continue;
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = '#A8BDF7';
    ctx.beginPath(); ctx.arc(x, y, p.size, 0, TAU); ctx.fill();
  }
  drawJournalJelly(ctx, width, height, seconds, { compact: scene.compact, reducedMotion: options.reducedMotion, current, viewport });
  drawJournalSquid(ctx, width, height, seconds, { compact: scene.compact, reducedMotion: options.reducedMotion, scrollProgress: scroll, viewport });
  drawDeepFish(ctx, scene, seconds, current, scroll, viewport);
  for (const habitat of scene.habitats) if (stoneVisible(habitat.stone)) drawHabitatStone(ctx, habitat.stone, scene.compact);
  for (const frond of scene.fronds) {
    // Arc length bounds every bent spine; the extra width covers both leaf edges.
    const reach = frond.length + (frond.width + .2) / .89 + 2;
    if (visible(frond.rootY - reach, frond.rootY + reach)) drawFrond(ctx, frond, seconds, current, scene.compact);
  }
  for (const habitat of scene.habitats) {
    if (visible(habitat.rootY - 2, habitat.stone.floor + 2)) drawHoldfast(ctx, habitat, scene.compact);
    for (const stone of habitat.cover) if (stoneVisible(stone)) drawHabitatStone(ctx, stone, scene.compact);
  }
  ctx.restore();
}
