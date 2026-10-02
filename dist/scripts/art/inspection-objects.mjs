const INK = '#244eff';
const PAPER = '#f3f0e8';
const TINT = '#e8ecfa';
const markSprites = new Map();
const TAU = Math.PI * 2;
const random = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const iso = ([x, y, z = 0]) => [Math.sqrt(3) / 2 * (x - y), (x + y) / 2 - z];
const polygon = points => points.map((point, i) => [i ? 'L' : 'M', ...point]).concat([['Z']]);
const plane = points => polygon(points.map(iso));
const path3 = commands => commands.map(([op, ...coordinates]) => {
  const output = [op];
  for (let i = 0; i < coordinates.length; i += 3) output.push(...iso(coordinates.slice(i, i + 3)));
  return output;
});
const grainShade = Array.from({ length: 180 }, (_, i) => ({
  x: -44 + random(i + 40) * 88,
  y: -44 + random(i + 293) * 88,
  radius: .22 + random(i + 971) * .20,
  alpha: .12 + random(i + 1837) * .15,
}));

function pen(ctx, x, y, scale) {
  const alpha = ctx.globalAlpha, tiny = scale * 47 < 10;
  const path = commands => {
    ctx.beginPath();
    for (const [op, ...p] of commands) {
      if (op === 'M') ctx.moveTo(x + p[0] * scale, y + p[1] * scale);
      if (op === 'L') ctx.lineTo(x + p[0] * scale, y + p[1] * scale);
      if (op === 'C') ctx.bezierCurveTo(...p.map((v, i) => (i % 2 ? y : x) + v * scale));
      if (op === 'Z') ctx.closePath();
    }
  };
  const line = (commands, weight = 1, opacity = .82) => {
    path(commands);
    ctx.strokeStyle = INK; ctx.globalAlpha = alpha * opacity;
    ctx.lineWidth = (tiny ? .22 : Math.max(.38, Math.min(.65, scale * .78))) * weight;
    ctx.stroke(); ctx.globalAlpha = alpha;
  };
  const shape = (commands, shade = true, fill = PAPER) => {
    path(commands); ctx.fillStyle = fill; ctx.fill();
    if (shade && !tiny) {
      ctx.save(); ctx.clip();
      path([['M', 1, -46], ['C', -7, -15, 5, 15, 1, 46], ['L', 46, 46], ['L', 46, -46], ['Z']]);
      ctx.fillStyle = TINT; ctx.fill();
      ctx.fillStyle = INK;
      for (const grain of grainShade) {
        ctx.globalAlpha = alpha * grain.alpha;
        ctx.beginPath();
        ctx.arc(x + grain.x * scale, y + grain.y * scale, Math.max(.12, grain.radius * scale), 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    line(commands);
  };
  return { line, shape, tiny, path };
}

function oval(cx, cy, rx, ry) {
  const k = .55228475;
  return [
    ['M', cx + rx, cy], ['C', cx + rx, cy + ry * k, cx + rx * k, cy + ry, cx, cy + ry],
    ['C', cx - rx * k, cy + ry, cx - rx, cy + ry * k, cx - rx, cy],
    ['C', cx - rx, cy - ry * k, cx - rx * k, cy - ry, cx, cy - ry],
    ['C', cx + rx * k, cy - ry, cx + rx, cy - ry * k, cx + rx, cy], ['Z'],
  ];
}

const HUMAN_BODY = [
  ['M', -1, -21], ['C', -5, -21, -9, -18, -10, -13], ['L', -13, 8],
  ['C', -13.5, 11, -9.8, 12, -9.2, 8.5], ['L', -6.8, -6],
  ['C', -6.1, -1, -6.2, 4, -6.2, 9], ['L', -6.5, 30.5],
  ['C', -6.5, 34, -1.5, 34, -1.3, 30.5], ['L', -.6, 12],
  ['C', -.5, 9, 1.2, 9, 1.4, 12], ['L', 1.9, 27],
  ['C', 2, 30.5, 7, 30, 7, 26.5], ['L', 6.5, 5],
  ['C', 6.4, 0, 6.5, -5, 7, -11], ['L', 9.5, 2.5],
  ['C', 10, 6, 13.6, 5, 13.1, 1.7], ['L', 10.7, -18],
  ['C', 10.2, -22, 7, -24, 4, -23], ['C', 2, -22.5, 1, -21, -1, -21], ['Z'],
];

// A continuous human contour with rounded limb and head shading, facing south-east.
function human(ctx, x, y, scale) {
  const originY = y, p = pen(ctx, x, originY, scale);
  const position = point => { const [px, py] = iso(point); return [px, py + 32]; };
  const body = HUMAN_BODY, [hx, hy] = position([1.5, 0, 61]);
  const head = oval(hx, hy, 6.1, 6.5);
  const paint = (commands, fill) => { p.path(commands); ctx.fillStyle = fill; ctx.fill(); };
  const shade = (a, b, radius, sphere = false) => {
    let fill = TINT;
    if (sphere && typeof ctx.createRadialGradient === 'function') {
      fill = ctx.createRadialGradient(x + (a[0] - radius * .3) * scale, originY + (a[1] - radius * .35) * scale, 0, x + a[0] * scale, originY + a[1] * scale, radius * 1.2 * scale);
    } else if (typeof ctx.createLinearGradient === 'function') {
      fill = ctx.createLinearGradient(x + (a[0] - radius) * scale, originY + a[1] * scale, x + (a[0] + radius) * scale, originY + a[1] * scale);
    }
    if (typeof fill !== 'string') {
      fill.addColorStop(0, PAPER); fill.addColorStop(.35, PAPER);
      fill.addColorStop(.72, '#e8edfc'); fill.addColorStop(1, '#c9d5fb');
    }
    if (sphere) { paint(head, fill); return; }
    const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
    const nx = -dy / length * radius, ny = dx / length * radius, k = 1.3333333;
    paint([
      ['M', a[0] + nx, a[1] + ny], ['L', b[0] + nx, b[1] + ny],
      ['C', b[0] + nx + dx / length * radius * k, b[1] + ny + dy / length * radius * k, b[0] - nx + dx / length * radius * k, b[1] - ny + dy / length * radius * k, b[0] - nx, b[1] - ny],
      ['L', a[0] - nx, a[1] - ny],
      ['C', a[0] - nx - dx / length * radius * k, a[1] - ny - dy / length * radius * k, a[0] + nx - dx / length * radius * k, a[1] + ny - dy / length * radius * k, a[0] + nx, a[1] + ny], ['Z'],
    ], fill);
  };
  const texture = () => {
    const alpha = ctx.globalAlpha;
    ctx.fillStyle = INK;
    for (let i = 0; i < 180; i++) {
      const u = -18 + random(i + 40) * 36, v = -38 + random(i + 293) * 78;
      ctx.globalAlpha = alpha * (.1 + random(i + 1837) * .13);
      ctx.beginPath(); ctx.arc(x + u * scale, originY + v * scale, Math.max(.12, scale * .26), 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = alpha;
  };
  p.shape(body, false);
  if (!p.tiny) {
    ctx.save(); p.path(body); ctx.clip();
    shade(position([1.5, 0, 46]), position([1.5, 0, 27]), 6.4);
    for (const sign of [-1, 1]) {
      shade(position([1.5, sign * 10, 44]), position([1.5, sign * 12, 22]), 2.2);
      shade(position([1.5, sign * 4.5, 25]), position([1.5, sign * 4.5, 3]), 2.8);
    }
    texture(); ctx.restore(); p.line(body);
  }
  p.shape(head, false);
  if (!p.tiny) {
    ctx.save(); p.path(head); ctx.clip(); shade([hx, hy], [hx, hy], 6.5, true);
    texture(); ctx.restore(); p.line(head);
  }
}

function handshake(p) {
  const leftPalm = [
    ['M', -22, -8], ['L', -14, -13], ['C', -10, -15, -7, -14, -3, -11],
    ['L', 16, 5], ['C', 19, 7, 19, 10, 16, 12],
    ['C', 18, 14, 15, 18, 12, 17], ['C', 12, 21, 8, 23, 5, 20],
    ['C', 3, 24, -1, 24, -4, 21], ['L', -19, 8], ['L', -27, 0], ['Z'],
  ];
  const rightPalm = [
    ['M', 24, -9], ['L', 16, -14], ['C', 12, -17, 8, -17, 5, -14],
    ['L', -4, -7], ['C', -7, -5, -10, -2, -8, 1],
    ['C', -6, 4, -3, 3, -1, 1], ['L', 4, -3], ['C', 6, -4, 8, -3, 10, -1],
    ['L', 20, 8], ['L', 29, 0], ['Z'],
  ];
  const leftCuff = [
    ['M', -35, -20], ['L', -21, -11], ['C', -20, -10, -20, -9, -21, -7],
    ['L', -29, 6], ['C', -30, 7, -31, 7, -32, 6], ['L', -44, -2], ['Z'],
  ];
  const rightCuff = [
    ['M', 35, -22], ['L', 22, -13], ['C', 20, -12, 20, -10, 21, -8],
    ['L', 29, 6], ['C', 30, 8, 31, 8, 33, 7], ['L', 45, -2], ['Z'],
  ];
  const face = (commands, depth) => commands.map(([op, ...coordinates]) => {
    const output = [op];
    for (let i = 0; i < coordinates.length; i += 2) {
      const u = coordinates[i], v = coordinates[i + 1];
      output.push(...iso([u * .72 + depth, -u * .36, -v]));
    }
    return output;
  });
  const parts = [leftPalm, rightPalm, leftCuff, rightCuff];
  for (const part of parts) p.shape(face(part, -1.2), false, TINT);
  for (const part of parts) p.shape(face(part, 1.2));
  if (!p.tiny) {
    for (const [x, y] of [[-9, 9], [-4, 5], [1, 1]]) {
      p.line(face([['M', x, y], ['C', x + 4, y + 2, x + 8, y + 7, x + 13, y + 10]], 1.2), .75, .65);
    }
  }
}

function tile(p, cx, cy, width = 17, depth = 13, height = 3) {
  const x0 = cx - width / 2, x1 = cx + width / 2, y0 = cy - depth / 2, y1 = cy + depth / 2;
  p.shape(plane([[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]]), false, TINT);
  p.shape(plane([[x0, y0, height], [x1, y0, height], [x1, y1, height], [x0, y1, height]]));
  if (!p.tiny) {
    for (const inset of [-2, 2]) p.line(path3([['M', x0 + 4, cy + inset, height], ['L', x1 - 4, cy + inset, height]]), .6, .43);
  }
}

function book(p) {
  for (const side of [-1, 1]) {
    p.shape(plane([[0, -22.5, -1.5], [side * 25.5, -22.5, 3.5], [side * 25.5, 22.5, 3.5], [0, 22.5, -1.5]]), false, TINT);
  }
  for (const side of [-1, 1]) {
    p.shape(path3([
      ['M', 0, -21, 2], ['C', side * 8, -21, 7, side * 17, -21, 8, side * 24, -21, 7],
      ['L', side * 24, 21, 7], ['C', side * 17, 21, 8, side * 8, 21, 7, 0, 21, 2], ['Z'],
    ]));
    if (!p.tiny) {
      for (const row of [-11, 0, 11]) p.line(path3([
        ['M', side * 5, row, 5.4], ['C', side * 10, row, 7.2, side * 15, row, 7.8, side * 20, row, 7.4],
      ]), .6, .43);
    }
  }
}

/** One orthographic isometric view for the field marks and their magnified objects. */
export function drawInspectionObject(ctx, x, y, radius, kind, useCache = true) {
  if (!(radius > 0)) return;
  // The small field marks share five cached drawings instead of repeating hundreds
  // of tiny paths per frame. Enlarged objects retain their native vector contours.
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
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const scale = radius / 47, p = pen(ctx, x, y, scale);
  if (kind === 'People') {
    human(ctx, x, y, scale);
  } else if (kind === 'Relationships') {
    handshake(p);
  } else if (kind === 'Records') {
    book(p);
  } else if (kind === 'Processes') {
    p.line(path3([['M', -27, 3, 1], ['L', -1, -14, 1], ['L', 26, 5, 1]]), .8, .64);
    tile(p, -27, 3); tile(p, -1, -14); tile(p, 26, 5);
  } else if (kind === 'Decisions') {
    p.line(path3([['M', 0, -38, 1], ['L', 0, -14, 1]]), .8, .64);
    p.line(path3([['M', -9, -14, 1], ['L', -23, -14, 1], ['L', -23, 16, 1]]), .8, .64);
    p.line(path3([['M', 9, -14, 1], ['L', 23, -14, 1], ['L', 23, 16, 1]]), .8, .64);
    tile(p, 0, -14, 22, 22, 3);
    tile(p, -23, 16, 12, 12, 2); tile(p, 23, 16, 12, 12, 2);
  }
  ctx.restore();
}
