import { drawJournalSquid } from './journal-squid.mjs';
import { drawDeepFish, drawDeepHabitat } from './journal-deep-life.mjs';

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
  const particles = Array.from({ length: compact ? 48 : 95 }, (_, i) => ({
    x: hash(i * 7 + 61) * width, y: hash(i * 7 + 62) * height,
    size: .35 + hash(i * 7 + 63) * .7, speed: .6 + hash(i * 7 + 64) * 1.8,
    alpha: .11 + hash(i * 7 + 65) * .19, seed: i * 7 + 66
  }));
  cachedScene = { width, height, compact, size, particles };
  return cachedScene;
}

function trace(ctx, points) {
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
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
    const y = wrap(p.y + seconds * p.speed + noise(seconds * .03, p.seed + 9) * 7, height + 20) - 10;
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = '#A8BDF7';
    ctx.beginPath(); ctx.arc(x, y, p.size, 0, TAU); ctx.fill();
  }
  drawJelly(ctx, scene, seconds, current);
  drawJournalSquid(ctx, width, height, seconds, { compact: scene.compact, reducedMotion: options.reducedMotion, scrollProgress: scroll });
  drawDeepFish(ctx, scene, seconds, current, scroll);
  drawDeepHabitat(ctx, scene, seconds, current);
  ctx.restore();
}
