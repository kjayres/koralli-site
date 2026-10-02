import { figureDefinitions } from './figures.mjs?v=4272aaa1c2e4';

const INK = '#244eff';
const PAPER = '#f3f0e8';
const LIGHT = '#e8eaf0';
const SHADE = '#dbe1ee';
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

// These are the existing approved Figma figures, not newly drawn silhouettes.
const definitions = figureDefinitions('inspection');
const figures = new Map();
function figurePaths(name) {
  if (figures.has(name)) return figures.get(name);
  const start = definitions.indexOf(`<g id="inspection-figure-${name}"`);
  const next = definitions.indexOf('<g id="inspection-figure-', start + 1);
  const markup = definitions.slice(start, next < 0 ? definitions.length : next);
  const paths = [...markup.matchAll(/<path\b([^>]+)\/>/g)].map(([, attributes]) => {
    const value = key => new RegExp(`(?:^|\\s)${key}="([^"]+)"`).exec(attributes)?.[1];
    const tokens = value('d').match(/[A-Za-z]|[-+]?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?/g);
    const commands = [];
    let i = 0;
    while (i < tokens.length) {
      const command = tokens[i++];
      const count = { M: 2, L: 2, H: 1, V: 1, C: 6, Z: 0 }[command];
      if (count === undefined) throw new Error('Unsupported inspection figure path: ' + command);
      commands.push([command, ...tokens.slice(i, i + count).map(Number)]);
      i += count;
    }
    return { commands, fill: value('fill'), fillOpacity: Number(value('fill-opacity') || 1), stroke: value('stroke'), width: Number(value('stroke-width') || 1) };
  });
  figures.set(name, paths);
  return paths;
}

function person(ctx, x, y, height, name = 'man-standing', mirror = false) {
  const s = height / 147;
  const px = n => x + (n - 120) * s * (mirror ? -1 : 1);
  const py = n => y + (n - 108) * s;
  const alpha = ctx.globalAlpha;
  for (const path of figurePaths(name)) {
    ctx.beginPath();
    let currentX = 0, currentY = 0;
    for (const [command, ...n] of path.commands) {
      if (command === 'M') { ctx.moveTo(px(n[0]), py(n[1])); currentX = n[0]; currentY = n[1]; }
      if (command === 'L') { ctx.lineTo(px(n[0]), py(n[1])); currentX = n[0]; currentY = n[1]; }
      if (command === 'H') { ctx.lineTo(px(n[0]), py(currentY)); currentX = n[0]; }
      if (command === 'V') { ctx.lineTo(px(currentX), py(n[0])); currentY = n[0]; }
      if (command === 'C') { ctx.bezierCurveTo(px(n[0]), py(n[1]), px(n[2]), py(n[3]), px(n[4]), py(n[5])); currentX = n[4]; currentY = n[5]; }
      if (command === 'Z') ctx.closePath();
    }
    if (path.fill && path.fill !== 'none') {
      ctx.fillStyle = path.fill.includes('building-paper') ? PAPER : INK;
      ctx.globalAlpha = alpha * path.fillOpacity;
      ctx.fill();
    }
    if (path.stroke) {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(.35, path.width * s);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = alpha;
}

// The same horizontal projection as the building; z remains upright.
const project = ([x, y, z = 0]) => [.9 * (x - y), .45 * (x + y) - z];
function model() {
  const marks = [];
  const face = (points, fill = PAPER, opacity = 1) => marks.push({ points: points.map(project), fill, closed: true, opacity });
  const line = (points, opacity = .7, width = 1) => marks.push({ points: points.map(project), opacity, width });
  const box = (x, y, w, d, h, z = 0) => {
    face([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], SHADE);
    face([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], LIGHT);
    face([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]]);
  };
  const beam = (a, b, width = 2.6, thickness = 2) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
    const nx = -dy / length * width / 2, ny = dx / length * width / 2;
    const ps = [[a[0] + nx, a[1] + ny, a[2]], [b[0] + nx, b[1] + ny, b[2]], [b[0] - nx, b[1] - ny, b[2]], [a[0] - nx, a[1] - ny, a[2]]];
    face([ps[0], ps[1], [ps[1][0], ps[1][1], ps[1][2] - thickness], [ps[0][0], ps[0][1], ps[0][2] - thickness]], SHADE);
    face([ps[1], ps[2], [ps[2][0], ps[2][1], ps[2][2] - thickness], [ps[1][0], ps[1][1], ps[1][2] - thickness]], LIGHT);
    face(ps);
  };
  return { marks, face, line, box, beam };
}

function processModel() {
  const m = model();
  m.beam([-13, -14, 4], [7, -14, 4]);
  m.beam([13, -8, 4], [13, 12, 4]);
  for (const [x, y] of [[-25, -20], [7, -20], [7, 12]]) {
    m.box(x, y, 12, 12, 7);
    m.line([[x + 3, y + 4, 7], [x + 9, y + 4, 7]], .4, .6);
    m.line([[x + 3, y + 8, 7], [x + 7, y + 8, 7]], .4, .6);
  }
  m.line([[-6, -17, 4.1], [-2, -14, 4.1], [-6, -11, 4.1]], .9, 1);
  m.line([[10, 0, 4.1], [13, 4, 4.1], [16, 0, 4.1]], .9, 1);
  return m.marks;
}

function decisionModel() {
  const m = model();
  m.beam([0, -24, 5], [0, -7, 5], 3);
  m.beam([0, 7, 5], [0, 18, 5], 3);
  m.beam([0, 18, 5], [-23, 18, 5], 3);
  m.beam([0, 18, 5], [23, 18, 5], 3);
  m.beam([-23, 18, 5], [-23, 26, 5], 3);
  m.beam([23, 18, 5], [23, 26, 5], 3);
  m.box(-7, -7, 14, 14, 10);
  m.line([[-3, -3, 10], [3, 3, 10]], .3, .65);
  m.line([[-3, 3, 10], [3, -3, 10]], .3, .65);
  m.box(-29, 25, 12, 12, 8);
  m.box(17, 25, 12, 12, 8);
  return m.marks;
}

function bookModel() {
  const m = model();
  const z = x => 2 + Math.sin(Math.abs(x) / 24 * Math.PI) * 2.7 + Math.abs(x) * .34;
  const top = x => [x, -17, z(x)], front = x => [x, 17, z(x)];
  // Covers and the stacked page edges provide depth beneath the open leaves.
  m.face([[-25, 18, 6], [0, 18, -1], [25, 18, 6], [25, -18, 6], [0, -18, -1], [-25, -18, 6]], LIGHT);
  for (const sign of [-1, 1]) {
    const xs = [0, 6, 12, 18, 24].map(x => x * sign);
    m.face([...xs.map(front), ...xs.slice().reverse().map(x => [x, 17, z(x) - 2.5])], sign < 0 ? LIGHT : SHADE);
    m.face([top(sign * 24), front(sign * 24), [sign * 24, 17, z(24) - 2.5], [sign * 24, -17, z(24) - 2.5]], LIGHT);
    for (let i = 0; i < 4; i++) {
      const a = sign * i * 6, b = sign * (i + 1) * 6;
      m.face([top(a), top(b), front(b), front(a)], i === 0 ? LIGHT : PAPER, .12);
    }
    m.line(xs.map(top), .9, 1);
    m.line(xs.map(front), .9, 1);
    m.line([top(sign * 24), front(sign * 24)], .9, 1);
    for (const y of [-9, -1, 7]) {
      m.line([5, 9, 13, 17, 21].map(x => [x * sign, y, z(x) + .06]), .48, .65);
    }
    m.line(xs.map(x => [x, 17, z(x) - 1.25]), .35, .55);
  }
  m.line([top(0), front(0)], .85, 1.1);
  return m.marks;
}

const models = { Processes: processModel(), Decisions: decisionModel(), Records: bookModel() };
function paintModel(ctx, x, y, diameter, marks) {
  const points = marks.flatMap(mark => mark.points);
  const minX = Math.min(...points.map(p => p[0])), maxX = Math.max(...points.map(p => p[0]));
  const minY = Math.min(...points.map(p => p[1])), maxY = Math.max(...points.map(p => p[1]));
  const scale = diameter / Math.max(maxX - minX, maxY - minY);
  const cx = (maxX + minX) / 2, cy = (maxY + minY) / 2;
  const alpha = ctx.globalAlpha;
  for (const mark of marks) {
    ctx.beginPath();
    mark.points.forEach(([px, py], i) => ctx[i ? 'lineTo' : 'moveTo'](x + (px - cx) * scale, y + (py - cy) * scale));
    if (mark.closed) ctx.closePath();
    if (mark.fill) { ctx.fillStyle = mark.fill; ctx.fill(); }
    ctx.strokeStyle = INK;
    ctx.globalAlpha = alpha * (mark.opacity ?? 1);
    ctx.lineWidth = clamp(diameter / 76, .5, .8) * (mark.width ?? 1);
    ctx.stroke();
    ctx.globalAlpha = alpha;
  }
}

/** Native dimensional objects inside a lens. Radius is the lens radius in CSS px. */
export function drawInspectionObject(ctx, x, y, radius, kind) {
  if (!(radius > 0)) return;
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (kind === 'People') {
    person(ctx, x, y, radius * 1.5);
  } else if (kind === 'Relationships') {
    person(ctx, x - radius * .32, y + radius * .03, radius * 1.25, 'man-explaining');
    person(ctx, x + radius * .36, y - radius * .03, radius * 1.25, 'woman-standing', true);
  } else if (models[kind]) {
    paintModel(ctx, x, y, radius * 1.43, models[kind]);
  }
  ctx.restore();
}
