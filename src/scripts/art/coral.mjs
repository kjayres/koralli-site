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

const TAU = Math.PI * 2;
const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));
const smooth = (n) => { const t = clamp(n); return t * t * (3 - 2 * t); };
const hash = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

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
 * Node roles illustrate collaboration, not literal team sizes or staffing ratios.
 */
export function drawCoralTrace(ctx, w, h, timeSeconds, { reducedMotion = false, variant } = {}) {
  if (!(w > 0 && h > 0)) return;
  const time = reducedMotion ? 0 : Math.max(0, Number(timeSeconds) || 0);
  const cycleLength = 14;
  const cycle = Math.floor(time / cycleLength);
  const phase = time % cycleLength;
  const index = Number.isInteger(variant) ? ((variant % STUDIES.length) + STUDIES.length) % STUDIES.length : cycle % STUDIES.length;
  const study = STUDIES[index];
  const fade = reducedMotion ? 1 : smooth(phase / 0.75) * (1 - smooth((phase - 11.2) / 1.7));
  const growth = reducedMotion ? 1 : clamp((phase - 0.8) / 4.7);
  const scaleY = h * 0.57;
  const scaleX = Math.min(w * 0.70, h * 0.85);
  const cx = w * 0.54;
  const crownY = h * 0.22;
  const drift = reducedMotion ? 0 : (phase / cycleLength - 0.5) * Math.min(10, h * 0.018);
  const motion = reducedMotion ? 0 : 1;
  const points = study.nodes.map(([x, y], i) => ({
    x: cx + x * scaleX + motion * Math.sin(time * 0.28 + y * 2.5) * (1 - y) * 2.3,
    y: crownY + y * scaleY + drift + motion * Math.sin(time * 0.16 + i * 0.73) * 0.4,
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
    const colour = i % 19 === 0 ? `rgba(255,102,85,${0.18 + depth * 0.12})` : `rgba(17,17,17,${0.10 + depth * 0.13})`;
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
    if (growth < study.arrivals[i] || (!reducedMotion && phase < 0.8)) return;
    const colour = study.operators.has(i) ? '255,102,85' : '36,78,255';
    const arriving = reducedMotion ? 0 : 1 - clamp((growth - study.arrivals[i]) * 13);
    const radius = i === 0 ? 3.1 : study.children[i] > 1 ? 2.8 : 2.3;
    dot(ctx, p.x, p.y, radius, `rgba(${colour},${0.95 * fade})`);
    if (arriving > 0 && phase < 5.5) {
      ctx.strokeStyle = `rgba(${colour},${0.28 * arriving * fade})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius + 3.2 + (1 - arriving) * 4, 0, TAU);
      ctx.stroke();
    }
  });

  // The colour key explains the schematic without asserting specific headcounts.
  if (w >= 280 && h >= 280) {
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
