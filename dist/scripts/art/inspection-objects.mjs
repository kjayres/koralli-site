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

// Rounded volumes share the isometric ground plane; nearer limbs overlap the torso.
function human(ctx, x, y, scale) {
  const p = pen(ctx, x, y, scale), alpha = ctx.globalAlpha;
  const position = point => { const [px, py] = iso(point); return [px, py + 32]; };
  const paint = (commands, fill) => { p.path(commands); ctx.fillStyle = fill; ctx.fill(); };
  const gradient = (centre, radius, sphere = false) => {
    if (p.tiny) return PAPER;
    const [cx, cy] = centre;
    let fill = TINT;
    if (sphere && typeof ctx.createRadialGradient === 'function') {
      fill = ctx.createRadialGradient(x + (cx - radius * .35) * scale, y + (cy - radius * .4) * scale, 0, x + cx * scale, y + cy * scale, radius * 1.2 * scale);
    } else if (typeof ctx.createLinearGradient === 'function') {
      fill = ctx.createLinearGradient(x + (cx - radius) * scale, y + cy * scale, x + (cx + radius) * scale, y + cy * scale);
    }
    if (typeof fill !== 'string') {
      fill.addColorStop(0, sphere ? PAPER : '#dce5fc'); fill.addColorStop(.28, PAPER);
      fill.addColorStop(.5, '#edf0f8'); fill.addColorStop(.8, '#d5e0fa'); fill.addColorStop(1, '#b5c8f5');
    }
    return fill;
  };
  const texture = commands => {
    if (p.tiny) return;
    ctx.save(); p.path(commands); ctx.clip(); ctx.fillStyle = INK;
    for (let i = 0; i < 130; i++) {
      const u = -19 + random(i + 40) * 38, v = -39 + random(i + 293) * 79;
      ctx.globalAlpha = alpha * (.09 + random(i + 1837) * .14);
      ctx.beginPath(); ctx.arc(x + u * scale, y + v * scale, Math.max(.12, scale * .25), 0, TAU); ctx.fill();
    }
    ctx.restore();
  };
  const capsule = (from, to, radius, openShoulder = false) => {
    const a = position(from), b = position(to), dx = b[0] - a[0], dy = b[1] - a[1];
    const length = Math.hypot(dx, dy), nx = -dy / length * radius, ny = dx / length * radius, k = 1.3333333;
    const commands = [
      ['M', a[0] + nx, a[1] + ny], ['L', b[0] + nx, b[1] + ny],
      ['C', b[0] + nx + dx / length * radius * k, b[1] + ny + dy / length * radius * k, b[0] - nx + dx / length * radius * k, b[1] - ny + dy / length * radius * k, b[0] - nx, b[1] - ny],
      ['L', a[0] - nx, a[1] - ny],
      ['C', a[0] - nx - dx / length * radius * k, a[1] - ny - dy / length * radius * k, a[0] + nx - dx / length * radius * k, a[1] + ny - dy / length * radius * k, a[0] + nx, a[1] + ny], ['Z'],
    ];
    paint(commands, gradient(a, radius)); texture(commands);
    p.line(openShoulder ? commands.slice(0, 4) : commands, .9, .76);
  };
  const ellipsoid = (centre, radii) => {
    const [cx, cy] = position(centre), [rx, ry, rz] = radii;
    const xx = .75 * (rx * rx + ry * ry), xy = Math.sqrt(3) / 4 * (rx * rx - ry * ry);
    const yy = .25 * (rx * rx + ry * ry) + rz * rz;
    const a = Math.sqrt(xx), b = xy / a, c = Math.sqrt(yy - b * b);
    const transform = ([u, v]) => [cx + a * u, cy + b * u + c * v];
    const commands = oval(0, 0, 1, 1).map(([op, ...coordinates]) => {
      const output = [op];
      for (let i = 0; i < coordinates.length; i += 2) output.push(...transform(coordinates.slice(i, i + 2)));
      return output;
    });
    return { commands, centre: [cx, cy], width: a, point: angle => transform([Math.cos(angle), Math.sin(angle)]) };
  };
  capsule([-1, -9.4, 44], [1, -12, 22], 2.5);
  capsule([0, -4.5, 26], [1.4, -4.7, 1], 2.9);
  capsule([0, 4.5, 26], [1.4, 4.7, 1], 2.9);
  capsule([0, 0, 46], [1, 0, 54], 2.6);
  const torso = ellipsoid([0, 0, 35], [5.3, 8.8, 13.6]);
  paint(torso.commands, gradient(torso.centre, torso.width)); texture(torso.commands);
  const contour = Array.from({ length: 33 }, (_, i) => [i ? 'L' : 'M', ...torso.point(.65 - (Math.PI + 1.3) * i / 32)]);
  p.line(contour, .95, .8);
  capsule([1.8, 9.2, 44], [3, 12, 22], 2.5, true);
  const head = ellipsoid([1.2, 0, 61], [5.7, 5.7, 6.1]);
  paint(head.commands, gradient(head.centre, head.width, true)); texture(head.commands);
  p.line(head.commands);
}

function handshake(ctx, x, y, scale) {
  const p = pen(ctx, x, y, scale), alpha = ctx.globalAlpha;
  const project = (u, v, height = 0) => iso([.702 * u + .54 * v, -.315 * u + .9 * v, height]);
  const surface = (commands, height = 0) => commands.map(([op, ...coordinates]) => {
    const output = [op];
    for (let i = 0; i < coordinates.length; i += 2) output.push(...project(coordinates[i], coordinates[i + 1], height));
    return output;
  });
  const paint = (commands, fill, outline = commands) => {
    p.path(commands); ctx.fillStyle = fill; ctx.fill();
    if (!p.tiny) {
      ctx.save(); p.path(commands); ctx.clip(); ctx.fillStyle = INK;
      for (const grain of grainShade) {
        ctx.globalAlpha = alpha * grain.alpha * .75;
        ctx.beginPath(); ctx.arc(x + grain.x * scale, y + grain.y * scale, Math.max(.12, grain.radius * scale), 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    if (outline) p.line(outline, .9, .8);
  };
  const shade = (a, b, width, dome = false) => {
    if (p.tiny) return PAPER;
    let fill = TINT;
    if (dome && typeof ctx.createRadialGradient === 'function') {
      fill = ctx.createRadialGradient(x + (a[0] - width * .25) * scale, y + (a[1] - width * .3) * scale, 0, x + a[0] * scale, y + a[1] * scale, width * scale);
    } else if (typeof ctx.createLinearGradient === 'function') {
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const nx = -(b[1] - a[1]) / length * width, ny = (b[0] - a[0]) / length * width;
      fill = ctx.createLinearGradient(x + (a[0] - nx) * scale, y + (a[1] - ny) * scale, x + (a[0] + nx) * scale, y + (a[1] + ny) * scale);
    }
    if (typeof fill !== 'string') {
      fill.addColorStop(0, dome ? PAPER : '#dbe4fa'); fill.addColorStop(.3, PAPER);
      fill.addColorStop(.58, '#edf0f9'); fill.addColorStop(.82, '#d6e0f7'); fill.addColorStop(1, '#b8caf0');
    }
    return fill;
  };
  const leftWrist = surface([
    ['M', -40, -22], ['C', -35, -25, -27, -19, -22, -13], ['L', -28, 3],
    ['C', -35, -1, -41, -6, -44, -10], ['C', -46, -13, -43, -20, -40, -22], ['Z'],
  ], 3);
  const rightWrist = surface([
    ['M', 31, -21], ['C', 37, -24, 43, -19, 46, -10], ['L', 34, 3],
    ['C', 29, -1, 27, -6, 24, -11], ['C', 24, -14, 27, -19, 31, -21], ['Z'],
  ], 4);
  paint(leftWrist, shade(project(-39, -17, 3), project(-26, -6, 3), 7.5));
  paint(rightWrist, shade(project(39, -15, 4), project(27, -5, 4), 7.5));
  const farPalm = surface([
    ['M', 27, -11], ['C', 20, -16, 13, -17, 7, -15], ['L', -8, -11],
    ['C', -13, -9, -14, -5, -11, 0], ['L', -16, 8],
    ['C', -13, 14, -7, 18, -2, 19], ['L', 18, 12],
    ['C', 24, 9, 29, 4, 31, -2], ['Z'],
  ], 3.4);
  paint(farPalm, shade(project(12, -3, 3.4), null, 22, true));
  // Only the tips of the far hand show beneath the nearer palm.
  for (const [u, v] of [[-11, 15], [-5, 20], [1, 24]]) {
    const centre = project(u, v, 1.2), tip = oval(centre[0], centre[1], 2.7, 3.1);
    paint(tip, shade(centre, null, 3.2, true));
  }
  const nearPalm = surface([
    ['M', -25, -10], ['C', -20, -13, -14, -13, -9, -10],
    ['C', -1, -7, 8, 0, 20, 10], ['C', 25, 14, 21, 19, 17, 15],
    ['C', 21, 20, 16, 24, 12, 20], ['C', 15, 25, 10, 29, 6, 24],
    ['C', 8, 29, 2, 31, -3, 26], ['L', -21, 11],
    ['C', -25, 7, -28, 3, -29, -1], ['Z'],
  ], 4.5);
  paint(nearPalm, shade(project(-5, 7, 4.5), null, 24, true));
  if (!p.tiny) {
    for (const [u, v, endU, endV] of [[17, 15, 3, 4], [12, 20, -2, 9], [6, 24, -7, 14]]) {
      p.line(surface([['M', u, v], ['C', u - 3, v - 2, endU + 3, endV + 3, endU, endV]], 4.5), .7, .56);
    }
  }
  // The upper hand's long thumb lies across the back of the lower hand.
  const thumb = surface([
    ['M', -8, -8], ['C', -2, -9, 4, -3, 11, 2], ['L', 19, 6],
    ['C', 24, 8, 22, 13, 18, 12], ['C', 14, 11, 5, 5, -1, 2],
    ['C', -5, 0, -8, 1, -11, 1], ['C', -14, -2, -13, -7, -8, -8], ['Z'],
  ], 7);
  paint(thumb, shade(project(-8, -6, 7), project(19, 8, 7), 4), thumb.slice(0, 6));
}

function tile(p, cx, cy, width = 17, depth = 13, height = 3) {
  const x0 = cx - width / 2, x1 = cx + width / 2, y0 = cy - depth / 2, y1 = cy + depth / 2;
  p.shape(plane([[x1, y0, 0], [x1, y1, 0], [x1, y1, height], [x1, y0, height]]), false, '#dae3fb');
  p.shape(plane([[x0, y1, 0], [x1, y1, 0], [x1, y1, height], [x0, y1, height]]), false, TINT);
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
    handshake(ctx, x, y, scale);
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
