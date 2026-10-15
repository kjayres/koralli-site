const INK = '#244eff';
const PAPER = '#f3f0e8';
const markSprites = new Map();
const KAPPA = .5522847498;

// All five symbols share a flat view, rounded contours and a 40-unit radius.
// Geometry stays inside 37 units, leaving room for the magnifier's rim.
const circle = (x, y, r) => {
  const k = r * KAPPA;
  return [
    ['M', x + r, y],
    ['C', x + r, y + k, x + k, y + r, x, y + r],
    ['C', x - k, y + r, x - r, y + k, x - r, y],
    ['C', x - r, y - k, x - k, y - r, x, y - r],
    ['C', x + k, y - r, x + r, y - k, x + r, y], ['Z'],
  ];
};
const roundRect = (x, y, width, height, r = 2.5) => [
  ['M', x + r, y], ['L', x + width - r, y],
  ['C', x + width, y, x + width, y, x + width, y + r],
  ['L', x + width, y + height - r],
  ['C', x + width, y + height, x + width, y + height, x + width - r, y + height],
  ['L', x + r, y + height],
  ['C', x, y + height, x, y + height, x, y + height - r],
  ['L', x, y + r], ['C', x, y, x, y, x + r, y], ['Z'],
];
const shoulders = (x, y, halfWidth, height) => [
  ['M', x - halfWidth, y + height], ['L', x - halfWidth, y + height * .6],
  ['C', x - halfWidth, y - height * .2, x + halfWidth, y - height * .2, x + halfWidth, y + height * .6],
  ['L', x + halfWidth, y + height], ['Z'],
];

function pen(ctx, x, y, radius) {
  const scale = radius / 40;
  const path = commands => {
    ctx.beginPath();
    for (const [op, ...p] of commands) {
      if (op === 'M') ctx.moveTo(x + p[0] * scale, y + p[1] * scale);
      else if (op === 'L') ctx.lineTo(x + p[0] * scale, y + p[1] * scale);
      else if (op === 'C') ctx.bezierCurveTo(...p.map((v, i) => (i % 2 ? y : x) + v * scale));
      else if (op === 'Z') ctx.closePath();
    }
  };
  const line = commands => { path(commands); ctx.stroke(); };
  const shape = commands => { path(commands); ctx.fill(); ctx.stroke(); };
  return { line, shape };
}

function people(p) {
  // Three participants, with the central shoulders gently overlapping the group.
  p.shape(circle(-20, -13, 5.5));
  p.shape(circle(20, -13, 5.5));
  p.shape(shoulders(-20, -5, 10, 20));
  p.shape(shoulders(20, -5, 10, 20));
  p.shape(circle(0, -18, 7));
  p.shape(shoulders(0, -7, 13, 30));
}

function processes(p) {
  // One short, left-to-right sequence; the gaps keep each step distinct.
  for (const x of [-25, 0, 25]) p.shape(roundRect(x - 7, -10, 14, 20));
  for (const x of [-18, 7]) {
    p.line([['M', x, 0], ['L', x + 9, 0]]);
    p.line([['M', x + 5.5, -3.5], ['L', x + 9, 0], ['L', x + 5.5, 3.5]]);
  }
}

function decisions(p) {
  // A single question and two clearly separated possible outcomes.
  p.shape(circle(0, -28, 3));
  p.line([['M', 0, -25], ['L', 0, -21]]);
  p.shape([['M', 0, -21], ['L', 11, -10], ['L', 0, 1], ['L', -11, -10], ['Z']]);
  for (const side of [-1, 1]) {
    p.line([
      ['M', side * 11, -10], ['L', side * 17, -10],
      ['C', side * 19, -10, side * 19, -8, side * 19, -6],
      ['L', side * 19, 14],
    ]);
    p.line([['M', side * 19 - 3.5, 10.5], ['L', side * 19, 14], ['L', side * 19 + 3.5, 10.5]]);
    p.shape(roundRect(side * 19 - 5, 18, 10, 8, 2));
  }
}

function records(p) {
  // An upright sheet and its three entries, without a second perspective.
  p.shape([
    ['M', -17, -27], ['L', 7, -27], ['L', 18, -16], ['L', 18, 25],
    ['C', 18, 27, 17, 28, 15, 28], ['L', -15, 28],
    ['C', -18, 28, -18, 27, -18, 24], ['L', -18, -24],
    ['C', -18, -26, -18, -27, -17, -27], ['Z'],
  ]);
  p.line([['M', 7, -27], ['L', 7, -16], ['L', 18, -16]]);
  for (const y of [-6, 4, 14]) p.line([['M', -9, y], ['L', 9, y]]);
}

function relationships(p) {
  // Two people joined by a shared connection; no hand or facial detail.
  p.line([['M', -15, 3], ['L', -4, 3]]);
  p.line([['M', 4, 3], ['L', 15, 3]]);
  p.shape(circle(0, 3, 4));
  for (const x of [-21, 21]) {
    p.shape(circle(x, -13, 6));
    p.shape(shoulders(x, -4, 10, 24));
  }
}

const symbols = { People: people, Processes: processes, Decisions: decisions, Records: records, Relationships: relationships };

/** Draw a cobalt symbol inside the supplied radius, preserving the caller's state. */
export function drawInspectionObject(ctx, x, y, radius, kind, useCache = true) {
  if (!(radius > 0) || !Object.hasOwn(symbols, kind)) return;
  // Preserve the optional small-mark cache for callers outside the magnifier.
  if (useCache && radius < 8 && typeof OffscreenCanvas !== 'undefined' && typeof ctx.drawImage === 'function') {
    if (!markSprites.has(kind)) {
      const canvas = new OffscreenCanvas(40, 40), sprite = canvas.getContext('2d');
      if (sprite) {
        sprite.scale(4, 4);
        drawInspectionObject(sprite, 5, 5, 3, kind, false);
        markSprites.set(kind, canvas);
      }
    }
    const sprite = markSprites.get(kind);
    if (sprite) {
      const size = 10 * radius / 3;
      ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
      return;
    }
  }
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = INK; ctx.fillStyle = PAPER;
  ctx.lineWidth = Math.min(radius * .10, Math.max(.22, Math.min(1.1, radius * .028)));
  symbols[kind](pen(ctx, x, y, radius));
  ctx.restore();
}
