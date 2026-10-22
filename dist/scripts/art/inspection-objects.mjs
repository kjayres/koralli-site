const INK = '#244eff';
const CORAL = '#ff6655';
const PAPER = '#f3f0e8';
const SHADE = '#e5e8ed';
const TINT = { [INK]: '#e2e3ea', [CORAL]: '#f4e5dc' };
const TAU = Math.PI * 2;
const KAPPA = .5522847498;
const markSprites = new Map();

// All five symbols are small isometric scenes on the same raised platform as the
// homepage cards, with the same rounded figures, inside a 40-unit radius.
// Geometry stays inside 37 units, leaving room for the magnifier's rim.
const LIFT = 6;
const ZOOM = 1.18;
const iso = (x, y, z = 0) => [.866 * (x - y), .5 * (x + y) - z + LIFT];

function kit(ctx, x, y, radius) {
  const s = radius / 40 * ZOOM;
  const base = ctx.globalAlpha;
  const width = ctx.lineWidth;
  const at = ([u, v]) => [x + u * s, y + v * s];
  const trace = pts => pts.forEach((pt, i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, ...at(pt)));
  const paint = (fill, stroke, { alpha = 1, line = 1 } = {}) => {
    ctx.globalAlpha = base * alpha;
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width * line; ctx.stroke(); }
    ctx.globalAlpha = base; ctx.lineWidth = width;
  };
  const poly = (pts, fill, stroke = INK, opts) => { ctx.beginPath(); trace(pts); ctx.closePath(); paint(fill, stroke, opts); };
  const lines = (pairs, stroke = INK, opts) => { ctx.beginPath(); for (const pair of pairs) trace(pair); paint(null, stroke, opts); };
  // Tapered capsule between two screen-space points, as one closed subpath.
  const capsule = (a, rA, b, rB) => {
    const [ax, ay] = at(a), [bx, by] = at(b);
    const ra = rA * s, rb = rB * s;
    const th = Math.atan2(by - ay, bx - ax);
    const tilt = Math.PI / 2 - Math.asin(Math.max(-.95, Math.min(.95, (ra - rb) / (Math.hypot(bx - ax, by - ay) || 1e-6))));
    ctx.moveTo(ax + ra * Math.cos(th + tilt), ay + ra * Math.sin(th + tilt));
    ctx.arc(ax, ay, ra, th + tilt, th + TAU - tilt);
    ctx.arc(bx, by, rb, th - tilt, th + tilt);
    ctx.closePath();
  };
  const circle = (c, r) => { const [cx, cy] = at(c); ctx.moveTo(cx + r * s, cy); ctx.arc(cx, cy, r * s, 0, TAU); };
  const ellipse = (c, rx, ry) => {
    const [cx, cy] = at(c), ex = rx * s, ey = ry * s, kx = ex * KAPPA, ky = ey * KAPPA;
    ctx.moveTo(cx + ex, cy);
    ctx.bezierCurveTo(cx + ex, cy + ky, cx + kx, cy + ey, cx, cy + ey);
    ctx.bezierCurveTo(cx - kx, cy + ey, cx - ex, cy + ky, cx - ex, cy);
    ctx.bezierCurveTo(cx - ex, cy - ky, cx - kx, cy - ey, cx, cy - ey);
    ctx.bezierCurveTo(cx + kx, cy - ey, cx + ex, cy - ky, cx + ex, cy);
  };
  // Stroke at double width, then fill: overlapping parts read as one outline.
  const silhouette = (draw, color) => { ctx.beginPath(); draw(); paint(null, color, { line: 2 }); paint(TINT[color], null); };

  const block = (bx, by, w, d, h, z = 0, { stroke = INK, top = PAPER, side = SHADE, alpha } = {}) => {
    poly([iso(bx + w, by, z), iso(bx + w, by + d, z), iso(bx + w, by + d, z + h), iso(bx + w, by, z + h)], side, stroke, { alpha });
    poly([iso(bx, by + d, z), iso(bx + w, by + d, z), iso(bx + w, by + d, z + h), iso(bx, by + d, z + h)], PAPER, stroke, { alpha });
    poly([iso(bx, by, z + h), iso(bx + w, by, z + h), iso(bx + w, by + d, z + h), iso(bx, by + d, z + h)], top, stroke, { alpha });
  };

  const platform = (half = 17) => {
    block(-half, -half, half * 2, half * 2, 2.2, -2.2);
    const inset = half - 3;
    poly([iso(-inset, -inset), iso(inset, -inset), iso(inset, inset), iso(-inset, inset)], null, INK, { alpha: .22, line: .7 });
  };

  // A standing figure; `hands` are screen points to reach for, otherwise arms hang.
  const person = (wx, wy, color = INK, hands = null) => {
    const [fx, fy] = iso(wx, wy);
    ctx.beginPath(); ellipse([fx, fy], 5.2, 2.3); paint(SHADE, null, { alpha: .9 });
    const shoulders = [[fx - 2.9, fy - 14.6], [fx + 2.9, fy - 14.6]];
    const arm = (i, hand) => capsule(shoulders[i], 1.25, hand, 1.15);
    silhouette(() => {
      for (const side of [-1, 1]) capsule([fx + side * 1.5, fy - 8.6], 1.7, [fx + side * 1.6, fy - .9], 1.35);
      capsule([fx, fy - 9.6], 3.0, [fx, fy - 14.4], 3.4);
      if (!hands) { arm(0, [fx - 3.9, fy - 7.4]); arm(1, [fx + 3.9, fy - 7.4]); }
    }, color);
    if (hands) silhouette(() => { arm(0, hands[0]); arm(1, hands[1]); }, color);
    silhouette(() => circle([fx, fy - 20.2], 3.1), color);
  };

  const note = (cx, cy, z, w = 10, d = 7, accent = CORAL, checked = true) => {
    const c = (u, v) => iso(cx + u, cy + v, z);
    poly([c(-w / 2, -d / 2), c(w / 2, -d / 2), c(w / 2, d / 2), c(-w / 2, d / 2)], PAPER, INK, { line: .8 });
    poly([c(-w / 2 + 1.4, -d / 2 + 1.1), c(w / 2 - 1.4, -d / 2 + 1.1), c(w / 2 - 1.4, -d / 2 + 2.4), c(-w / 2 + 1.4, -d / 2 + 2.4)], accent, null, { alpha: .45 });
    lines([[c(-w / 2 + 1.5, .4), c(w / 2 - 1.5, .4)], [c(-w / 2 + 1.5, 2.2), c(w / 2 - 3.5, 2.2)]], INK, { alpha: .55, line: .55 });
    if (checked) lines([[c(w / 2 - 4.2, d / 2 - 2.2), c(w / 2 - 3.1, d / 2 - 1.1), c(w / 2 - 1.2, d / 2 - 3.6)]], accent, { line: .9 });
  };

  return { iso, poly, lines, block, platform, person, note };
}

function people(k) {
  // Three colleagues in conversation, one gesturing to make a point.
  k.platform();
  k.person(-7, -8);
  k.person(-9, 6);
  const [fx, fy] = iso(7, -1);
  k.person(7, -1, CORAL, [[fx - 6.2, fy - 13.6], [fx + 3.9, fy - 7.4]]);
}

function processes(k) {
  // A short conveyor: one parcel waiting, one being worked, one done.
  k.platform();
  k.block(-15, -4.5, 30, 9, 5.2);
  for (const x of [-9, -3, 3, 9]) k.lines([[iso(x, -4.5, 5.2), iso(x, 4.5, 5.2)]], INK, { alpha: .35, line: .6 });
  k.block(-13.5, -3.2, 6.4, 6.4, 5, 5.2, { stroke: CORAL });
  k.block(-3.2, -3.2, 6.4, 6.4, 5, 5.2, { stroke: CORAL, top: '#f6dcd4' });
  k.block(7.1, -3.2, 6.4, 6.4, 5, 5.2);
  k.lines([[iso(8.9, 1.2, 10.25), iso(10.1, 2.4, 10.25), iso(12.2, -.6, 10.25)]], INK, { line: .9 });
}

function decisions(k) {
  // One path arriving at a fork, a figure weighing the two outcomes.
  k.platform();
  const dashes = (from, to, count) => {
    const pairs = [];
    for (let i = 0; i < count; i++) {
      const a = i / count, b = (i + .55) / count;
      pairs.push([iso(from[0] + (to[0] - from[0]) * a, from[1] + (to[1] - from[1]) * a), iso(from[0] + (to[0] - from[0]) * b, from[1] + (to[1] - from[1]) * b)]);
    }
    k.lines(pairs, INK, { alpha: .55, line: .7 });
  };
  dashes([14, 14], [2, 2], 4);
  dashes([2, 2], [-10, 4], 4);
  dashes([2, 2], [4, -10], 4);
  k.poly([iso(2, -.4, .1), iso(4.4, 2, .1), iso(2, 4.4, .1), iso(-.4, 2, .1)], '#f6dcd4', CORAL, { line: .8 });
  k.block(-15, 1, 6, 6, 4.5, 0, { top: '#d7dfef' });
  k.block(1, -15, 6, 6, 4.5, 0, { stroke: CORAL, top: '#f6dcd4' });
  const [fx, fy] = iso(8, 8);
  k.person(8, 8, CORAL, [[fx - 2.6, fy - 19.2], [fx + 3.9, fy - 7.4]]);
}

function records(k) {
  // A stack of filed notes, the top one reviewed and signed off.
  k.platform();
  for (const [i, z] of [0, 1.8, 3.6, 5.4].entries()) k.block(-12 + i * .8, -8.5 - i * .8, 24, 17, 1.1, z, { side: PAPER });
  k.note(2.4, -2.4, 6.55, 22, 15, CORAL, true);
}

function relationships(k) {
  // A researcher and an operator passing the same note between them.
  k.platform();
  const z = 10.6;
  const [lx, ly] = iso(-10, 4), [rx, ry] = iso(4, -10);
  const [nx, ny] = iso(-3, -3, z);
  k.person(4, -10, CORAL, [[nx + 3.4, ny - .8], [rx + 3.9, ry - 7.4]]);
  k.note(-3, -3, z, 8.5, 6.5, CORAL, true);
  k.person(-10, 4, INK, [[lx - 3.9, ly - 7.4], [nx - 3.4, ny + .8]]);
}

const symbols = { People: people, Processes: processes, Decisions: decisions, Records: records, Relationships: relationships };

/** Draw a symbol inside the supplied radius, preserving the caller's state. */
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
  ctx.lineWidth = Math.min(radius * .10, Math.max(.22, Math.min(1.1, radius * .028)));
  symbols[kind](kit(ctx, x, y, radius));
  ctx.restore();
}
