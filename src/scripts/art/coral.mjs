// Every branch grows from a lower, already-reached parent. These anchors are
// deliberately placed, so drifting field particles cannot invert the coral.
const STUDIES = [
  {
    name: 'AI GOVERNANCE',
    operators: [0, 2, 6, 9, 12, 13, 17, 18, 20, 23],
    nodes: [
      [0, 1, -1], [-0.01, 0.81, 0], [0.015, 0.62, 1], [0.002, 0.43, 2],
      [0.04, 0.25, 3], [0.01, 0.06, 4],
      [-0.16, 0.68, 1], [-0.29, 0.51, 6], [-0.36, 0.34, 7],
      [-0.44, 0.24, 8], [-0.25, 0.24, 8], [-0.23, 0.08, 10],
      [0.19, 0.66, 1], [0.34, 0.50, 12], [0.40, 0.33, 13],
      [0.50, 0.22, 14], [0.31, 0.17, 14], [0.32, 0.02, 16],
      [-0.15, 0.38, 3], [-0.19, 0.19, 18], [-0.14, 0.01, 19],
      [0.20, 0.31, 3], [0.20, 0.14, 21], [0.15, 0, 22],
    ],
  },
  {
    name: 'DATA FOUNDATIONS',
    operators: [0, 3, 7, 10, 14, 16, 18, 22, 24, 26],
    nodes: [
      [0.025, 1, -1], [0, 0.79, 0], [-0.015, 0.59, 1], [0.01, 0.39, 2],
      [-0.04, 0.20, 3], [-0.01, 0.01, 4],
      [-0.19, 0.66, 1], [-0.34, 0.51, 6], [-0.45, 0.34, 7],
      [-0.55, 0.23, 8], [-0.40, 0.16, 8], [-0.42, 0.01, 10],
      [-0.20, 0.38, 2], [-0.24, 0.20, 12], [-0.21, 0.04, 13],
      [-0.30, 0.28, 12],
      [0.20, 0.65, 1], [0.35, 0.48, 16], [0.48, 0.30, 17],
      [0.55, 0.17, 18], [0.39, 0.12, 18], [0.40, -0.02, 20],
      [0.20, 0.37, 2], [0.25, 0.17, 22], [0.21, 0.01, 23],
      [0.12, 0.22, 3], [0.11, 0.09, 25],
    ],
  },
  {
    name: 'WORKFLOW REDESIGN',
    operators: [0, 1, 4, 6, 9, 11, 13, 15, 18, 20, 22, 24],
    nodes: [
      [-0.01, 1, -1], [0.015, 0.80, 0], [-0.015, 0.59, 1], [0.035, 0.38, 2],
      [0.005, 0.17, 3], [0.05, -0.01, 4],
      [-0.18, 0.69, 1], [-0.30, 0.54, 6], [-0.33, 0.37, 7],
      [-0.42, 0.24, 8], [-0.40, 0.09, 9],
      [-0.23, 0.20, 8], [-0.24, 0.05, 11],
      [0.17, 0.63, 1], [0.31, 0.47, 13], [0.32, 0.28, 14],
      [0.42, 0.14, 15], [0.40, -0.03, 16],
      [0.23, 0.13, 15], [0.26, -0.04, 18],
      [-0.12, 0.34, 2], [-0.13, 0.16, 20], [-0.08, -0.02, 21],
      [0.15, 0.21, 3], [0.13, 0.04, 23],
    ],
  },
  {
    name: 'DELIVERY MEASUREMENT',
    operators: [0, 2, 5, 6, 8, 10, 13, 16, 18, 21, 23, 25],
    nodes: [
      [0, 1, -1], [-0.015, 0.80, 0], [0.01, 0.62, 1], [-0.015, 0.42, 2],
      [0.005, 0.23, 3], [-0.03, 0.06, 4],
      [-0.18, 0.64, 1], [-0.32, 0.47, 6], [-0.38, 0.28, 7],
      [-0.49, 0.15, 8], [-0.46, 0.01, 9],
      [-0.29, 0.13, 8], [-0.31, -0.01, 11],
      [0.18, 0.68, 1], [0.33, 0.51, 13], [0.44, 0.35, 14],
      [0.49, 0.17, 15], [0.41, 0.04, 16],
      [0.29, 0.31, 14], [0.27, 0.12, 18], [0.31, -0.04, 19],
      [-0.15, 0.31, 3], [-0.16, 0.10, 21], [-0.11, -0.04, 22],
      [0.13, 0.28, 3], [0.14, 0.08, 24], [0.09, -0.03, 25],
    ],
  },
  {
    name: 'OPERATING MODELS',
    operators: [0, 1, 3, 5, 8, 10, 11, 14, 16, 19, 22, 24],
    nodes: [
      [0, 1, -1], [-0.01, 0.80, 0], [-0.11, 0.60, 1], [-0.23, 0.43, 2],
      [-0.31, 0.24, 3], [-0.28, 0.04, 4],
      [-0.40, 0.39, 2], [-0.52, 0.23, 6], [-0.57, 0.06, 7],
      [-0.42, 0.07, 7], [-0.41, -0.07, 9],
      [-0.13, 0.28, 3], [-0.12, 0.08, 11], [-0.06, -0.05, 12],
      [0.13, 0.59, 1], [0.29, 0.40, 14], [0.38, 0.20, 15],
      [0.43, -0.02, 16], [0.54, 0.28, 15], [0.60, 0.10, 18],
      [0.24, 0.20, 15], [0.21, 0.01, 20],
      [0.055, 0.35, 14], [0.06, 0.13, 22], [0.02, -0.04, 23],
    ],
  },
].map((study) => {
  const arrivals = [0];
  const children = Array(study.nodes.length).fill(0);
  for (let i = 1; i < study.nodes.length; i++) {
    const [x, y, parent] = study.nodes[i];
    const [px, py] = study.nodes[parent];
    if (y >= py) throw new Error('Coral branches must grow upwards.');
    arrivals[i] = arrivals[parent] + Math.hypot(x - px, y - py);
    children[parent]++;
  }
  const longest = Math.max(...arrivals);
  return { ...study, operators: new Set(study.operators), children, arrivals: arrivals.map((d) => d / longest) };
});

/**
 * Fixed coral geometry for scenes that own their particle population. Coordinates
 * are local: x spans roughly -0.6 to 0.6; y grows upward from the root at 1.
 * Each node is [x, y, parentIndex]. Arrivals are path distances scaled to [0, 1].
 * Plain, deeply frozen arrays keep consumers from changing the original studies.
 */
export const coralStudies = Object.freeze(STUDIES.map((study) => Object.freeze({
  name: study.name,
  nodes: Object.freeze(study.nodes.map((node) => Object.freeze([...node]))),
  operators: Object.freeze([...study.operators]),
  roles: Object.freeze(study.nodes.map((_, i) => study.operators.has(i) ? 'operator' : 'researcher')),
  arrivals: Object.freeze([...study.arrivals]),
  children: Object.freeze([...study.children]),
})));

export function getCoralStudy(index = 0) {
  const selected = Number.isInteger(index) ? index : 0;
  return coralStudies[((selected % coralStudies.length) + coralStudies.length) % coralStudies.length];
}

const TAU = Math.PI * 2;
const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));
const smooth = (n) => { const t = clamp(n); return t * t * (3 - 2 * t); };
const hash = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const DRAW_START = 0.3, DRAW_END = 2.5, HOLD_END = 10.5, FADE_END = 11.7;
export const CORAL_TRACE_CYCLE_SECONDS = 12;

/** Shared timing for the drawing and its accessible project caption. */
export function coralTraceState(timeSeconds, { reducedMotion = false, variant } = {}) {
  const seconds = Number(timeSeconds);
  const time = reducedMotion || !Number.isFinite(seconds) ? 0 : Math.max(0, seconds);
  const cycle = Math.floor(time / CORAL_TRACE_CYCLE_SECONDS);
  const phase = time % CORAL_TRACE_CYCLE_SECONDS;
  const index = Number.isInteger(variant) ? ((variant % STUDIES.length) + STUDIES.length) % STUDIES.length : cycle % STUDIES.length;
  const stage = reducedMotion ? 'hold' : phase < DRAW_START ? 'field' : phase < DRAW_END ? 'forming' : phase < HOLD_END ? 'hold' : phase < FADE_END ? 'fading' : 'field';
  return {
    index, name: STUDIES[index].name, time, phase, stage,
    growth: reducedMotion ? 1 : clamp((phase - DRAW_START) / (DRAW_END - DRAW_START)),
    opacity: reducedMotion ? 1 : smooth(phase / DRAW_START) * (1 - smooth((phase - HOLD_END) / (FADE_END - HOLD_END))),
  };
}

function dot(ctx, x, y, radius, colour) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
}

/**
 * Draw into CSS-pixel coordinates; callers own clearing, DPR scaling and RAF.
 * Time is in seconds. `variant` is optional and zero-based; omission cycles all
 * five forms. Reduced motion displays the chosen coral complete and stationary.
 * Pass `labels: false` when the caller supplies its own caption. `neutralField`
 * keeps the drifting field grey, so coloured nodes identify connected roles.
 * Node roles illustrate collaboration, not literal team sizes or staffing ratios.
 */
export function drawCoralTrace(ctx, w, h, timeSeconds, { reducedMotion = false, variant, labels = true, neutralField = false } = {}) {
  if (!(w > 0 && h > 0)) return;
  const { time, phase, index, growth, opacity: fade } = coralTraceState(timeSeconds, { reducedMotion, variant });
  const study = STUDIES[index];
  const scaleY = h * 0.57;
  const scaleX = Math.min(w * 0.70, h * 0.85);
  const cx = w * 0.54;
  const crownY = h * 0.22;
  const posePhase = Math.min(phase, DRAW_END);
  const poseTime = time - phase + posePhase;
  const drift = reducedMotion ? 0 : (posePhase / CORAL_TRACE_CYCLE_SECONDS - 0.5) * Math.min(10, h * 0.018);
  const motion = reducedMotion ? 0 : 1;
  const points = study.nodes.map(([x, y], i) => ({
    x: cx + x * scaleX + motion * Math.sin(poseTime * 0.28 + y * 2.5) * (1 - y) * 2.3,
    y: crownY + y * scaleY + drift + motion * Math.sin(poseTime * 0.16 + i * 0.73) * 0.4,
  }));

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // A sparse field gently sinks independently of the connected coral anchors.
  const count = Math.round(clamp(w * h / 5900, 38, 105));
  for (let i = 0; i < count; i++) {
    const depth = hash(i + 600);
    const x = w * (0.055 + hash(i + 71) * 0.89) + Math.sin(time * 0.15 + i) * 2.2 * motion;
    const y0 = hash(i + 310) * (h + 24);
    const y = ((y0 + time * (1.3 + depth * 1.6)) % (h + 24)) - 12;
    const colour = !neutralField && i % 19 === 0 ? `rgba(255,102,85,${0.18 + depth * 0.12})` : `rgba(17,17,17,${0.10 + depth * 0.13})`;
    dot(ctx, x, y, 0.7 + depth * 0.65, colour);
  }

  // The deliberately placed nodes remain visible as part of that particle field.
  points.forEach((p) => dot(ctx, p.x, p.y, 1.25, `rgba(17,17,17,${0.16 * fade})`));

  for (let i = 1; i < points.length; i++) {
    const parent = study.nodes[i][2];
    const start = study.arrivals[parent];
    const end = study.arrivals[i];
    const progress = clamp((growth - start) / (end - start));
    if (progress <= 0) continue;
    const a = points[parent];
    const b = points[i];
    const tip = { x: a.x + (b.x - a.x) * progress, y: a.y + (b.y - a.y) * progress };

    ctx.strokeStyle = `rgba(17,17,17,${0.60 * fade})`;
    ctx.lineWidth = 1.12;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();

    // A subtle cobalt signal follows the leading edge while it is being drawn.
    if (progress < 1 && !reducedMotion) {
      const tail = Math.max(0, progress - 0.22);
      ctx.strokeStyle = `rgba(36,78,255,${0.90 * fade})`;
      ctx.lineWidth = 1.35;
      ctx.beginPath();
      ctx.moveTo(a.x + (b.x - a.x) * tail, a.y + (b.y - a.y) * tail);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();
      dot(ctx, tip.x, tip.y, 2.0, `rgba(36,78,255,${fade})`);
    }
  }

  points.forEach((p, i) => {
    if (growth < study.arrivals[i] || (!reducedMotion && phase < DRAW_START)) return;
    const colour = study.operators.has(i) ? '255,102,85' : '36,78,255';
    const arriving = reducedMotion ? 0 : 1 - clamp((growth - study.arrivals[i]) * 13);
    const radius = i === 0 ? 3.1 : study.children[i] > 1 ? 2.8 : 2.3;
    dot(ctx, p.x, p.y, radius, `rgba(${colour},${0.95 * fade})`);
    if (arriving > 0 && phase < DRAW_END) {
      ctx.strokeStyle = `rgba(${colour},${0.28 * arriving * fade})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius + 3.2 + (1 - arriving) * 4, 0, TAU);
      ctx.stroke();
    }
  });

  // The colour key explains the schematic without asserting specific headcounts.
  if (labels && w >= 280 && h >= 280) {
    const root = points[0];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '500 9px "IBM Plex Mono", monospace';
    ctx.fillStyle = `rgba(17,17,17,${0.72 * fade})`;
    ctx.fillText(study.name, root.x, root.y + 22);
    ctx.font = '400 7px "IBM Plex Mono", monospace';
    ctx.textAlign = 'left';
    dot(ctx, root.x - 83, root.y + 44, 2, `rgba(36,78,255,${.86 * fade})`);
    dot(ctx, root.x + 14, root.y + 44, 2, `rgba(255,102,85,${.86 * fade})`);
    ctx.fillStyle = `rgba(17,17,17,${0.47 * fade})`;
    ctx.fillText('RESEARCHERS', root.x - 75, root.y + 40);
    ctx.fillText('OPERATORS', root.x + 22, root.y + 40);
  }
  ctx.restore();
}

// Our Work grows a small new coral graph each cycle. The divided canopy gives
// branches room to spread without crossings; seeded variation changes their
// lengths, lean and fork structure. Roles do not imply a staffing ratio.
const WORK_CORAL_OPERATORS = new Set([0, 2, 4, 7, 9, 11]);
export const WORK_CORAL_CYCLE_SECONDS = 5;
let workCoralCache;

function workCoralGeometry(cycle) {
  if (workCoralCache?.cycle === cycle) return workCoralCache;
  let seed = (cycle + 1) * 179;
  const random = () => hash(seed++);
  const between = (a, b) => a + (b - a) * random();
  const lean = between(-.09, .09);
  const points = [[between(-.045, .045), .94, -1]];
  points.push([points[0][0] + between(-.055, .055), between(.71, .77), 0]);
  points.push([between(-.085, .085), between(.49, .58), 1]);

  const branch = (parent, left, right, top, budget) => {
    const x = between(left + (right - left) * .22, right - (right - left) * .22);
    const proposedY = budget === 1 ? top + between(0, .075) : top + (points[parent][1] - top) * between(.48, .63);
    const remainingDepth = budget === 1 ? 0 : budget === 2 ? 1 : 2;
    const y = Math.min(Math.max(proposedY, top + remainingDepth * .075), points[parent][1] - .055);
    const index = points.push([x, y, parent]) - 1;
    if (budget === 1) return;
    if (budget === 2 || (budget === 3 && random() < .32)) {
      branch(index, left, right, top, budget - 1);
      return;
    }
    const split = between(left + (right - left) * .4, left + (right - left) * .6);
    const remaining = budget - 1;
    const leftBudget = Math.max(1, Math.min(remaining - 1, Math.floor(remaining / 2) + (random() < .45 ? 1 : 0)));
    branch(index, left, split, top, leftBudget);
    branch(index, split, right, top, remaining - leftBudget);
  };

  const budgets = random() < .35 ? [3, 3, 3] : random() < .5 ? [4, 2, 3] : [2, 4, 3];
  if (random() < .5) budgets.reverse();
  const leftJoin = random() < .5 ? 1 : 2;
  const leftSplit = between(-.19, -.12), rightSplit = between(.11, .19);
  branch(leftJoin, -.44, leftSplit, between(.04, .20), budgets[0]);
  branch(2, leftSplit, rightSplit, between(.025, .08), budgets[1]);
  branch(leftJoin === 1 ? 2 : 1, rightSplit, .44, between(.04, .20), budgets[2]);
  const arrivals = [0];
  points.forEach((point, i) => {
    point[0] += lean * (.94 - point[1]);
    if (i) {
      const parent = point[2];
      arrivals[i] = arrivals[parent] + Math.hypot(point[0] - points[parent][0], point[1] - points[parent][1]);
    }
  });
  workCoralCache = { cycle, points, arrivals, length: Math.max(...arrivals) };
  return workCoralCache;
}

/** Sparse hero graph only. Existing coral studies retain their original timing. */
export function drawWorkCoralTrace(ctx, w, h, timeSeconds, { reducedMotion = false } = {}) {
  if (!(w > 0 && h > 0)) return;
  const time = reducedMotion || !Number.isFinite(timeSeconds) ? 0 : Math.max(0, timeSeconds);
  const phase = time % WORK_CORAL_CYCLE_SECONDS;
  const growth = reducedMotion ? 1 : clamp((phase - .08) / 1.7);
  const opacity = reducedMotion ? 1 : smooth(phase / .12) * (1 - smooth((phase - 4.35) / .55));
  const geometry = workCoralGeometry(Math.floor(time / WORK_CORAL_CYCLE_SECONDS));
  const scale = Math.min(w * .96, h * 1.08);
  const points = geometry.points.map(([x, y], i) => [
    w * .5 + x * scale + (reducedMotion ? 0 : Math.sin(time * .16 + i * 1.7) * 1.4),
    h * (.02 + y * .94) + (reducedMotion ? 0 : Math.sin(time * .12 + i * .8) * 1.1),
  ]);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Colour belongs only to the twelve connected role nodes.
  const count = Math.round(clamp(w * h / 7200, 30, 52));
  for (let i = 0; i < count; i++) {
    const depth = hash(i + 600);
    const x = w * (.045 + hash(i + 71) * .91) + (reducedMotion ? 0 : Math.sin(time * .15 + i) * 1.6);
    const y = (hash(i + 310) * (h + 24) + time * (1.1 + depth * 1.5)) % (h + 24) - 12;
    dot(ctx, x, y, .65 + depth * .55, `rgba(17,17,17,${.07 + depth * .09})`);
  }
  // The trace reaches dots already present in the plankton, colouring each one
  // as it arrives. All anchors drift smoothly together with their fine edges.
  points.forEach(([x, y]) => dot(ctx, x, y, 1.05, `rgba(17,17,17,${.16 * opacity})`));

  if (opacity > 0) {
    ctx.strokeStyle = `rgba(17,17,17,${.60 * opacity})`;
    ctx.lineWidth = 1.12;
    ctx.beginPath();
    for (let i = 1; i < points.length; i++) {
      const parent = geometry.points[i][2];
      const start = geometry.arrivals[parent], end = geometry.arrivals[i];
      const progress = clamp((growth * geometry.length - start) / (end - start));
      if (progress <= 0) continue;
      const a = points[parent], b = points[i];
      ctx.moveTo(...a);
      ctx.lineTo(a[0] + (b[0] - a[0]) * progress, a[1] + (b[1] - a[1]) * progress);
    }
    ctx.stroke();
  }

  points.forEach(([x, y], i) => {
    const arrival = geometry.arrivals[i] / geometry.length;
    if (growth < arrival || !opacity) return;
    const colour = WORK_CORAL_OPERATORS.has(i) ? '255,102,85' : '36,78,255';
    dot(ctx, x, y, Math.min(3.5, Math.max(2.6, w * .0067)), `rgba(${colour},${.96 * opacity})`);
  });
  ctx.restore();
}
