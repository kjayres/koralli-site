import { humanParts } from './building-people.mjs';

const PAPER = '#F3F0E8';
const SHADE = '#E5E8ED';
const GLASS = '#D7DFEF';
const BLUE = '#244EFF';
const CORAL = '#FF6655';
const TAU = Math.PI * 2;

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => {
  const c = clamp(t);
  return c * c * (3 - 2 * c);
};
const number = n => Number(n.toFixed(2));
const points = ps => ps.map(p => `${number(p[0])},${number(p[1])}`).join(' ');

function makeProjector({ originX = 280, originY = 176, centerX = 120, centerY = 90, angle = -28, scale = 1.42 } = {}) {
  const rad = angle * Math.PI / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  return (x, y, z = 0) => {
    const dx = x - centerX, dy = y - centerY;
    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;
    return [
      number(originX + scale * 0.9 * (rx - ry)),
      number(originY + scale * 0.45 * (rx + ry) - scale * z),
    ];
  };
}

function isoPrimitives(p) {
  const polygon = (ps, fill = PAPER, extra = '') => `<polygon points="${points(ps)}" fill="${fill}" ${extra}/>`;
  const line = (a, b, extra = '') => `<path d="M${number(a[0])},${number(a[1])} L${number(b[0])},${number(b[1])}" fill="none" ${extra}/>`;
  const planLine = (coords, extra = '') => `<path d="${coords.map(([x, y, z], i) => `${i ? 'L' : 'M'}${p(x, y, z || 0).join(',')}`).join(' ')}" fill="none" ${extra}/>`;
  const surface = (x, y, w, d, z = 0, fill = PAPER, extra = '') =>
    polygon([p(x, y, z), p(x + w, y, z), p(x + w, y + d, z), p(x, y + d, z)], fill, extra);
  const panelX = (x, y, z, w, h, fill = PAPER, extra = '') =>
    polygon([p(x, y, z), p(x + w, y, z), p(x + w, y, z + h), p(x, y, z + h)], fill, extra);
  const panelY = (x, y, z, d, h, fill = SHADE, extra = '') =>
    polygon([p(x, y, z), p(x, y + d, z), p(x, y + d, z + h), p(x, y, z + h)], fill, extra);
  const box = (x, y, w, d, h, topFill = PAPER, frontFill = PAPER, sideFill = SHADE, baseZ = 0, extra = '') => (
    panelY(x + w, y, baseZ, d, h, sideFill, extra) +
    panelX(x, y + d, baseZ, w, h, frontFill, extra) +
    surface(x, y, w, d, baseZ + h, topFill, extra)
  );
  const ruledNote = (x, y, w = 13, d = 10, z = 20.4, accent = CORAL, checked = false) => {
    let out = surface(x, y, w, d, z, PAPER, 'stroke-width=".75"');
    out += surface(x + 1.8, y + 1.6, w - 3.6, 1.8, z + .05, accent, 'stroke="none" fill-opacity=".38"');
    out += line(p(x + 2, y + 5.2, z + .08), p(x + w - 2, y + 5.2, z + .08), 'stroke-width=".6" stroke-opacity=".55"');
    out += line(p(x + 2, y + 7.6, z + .08), p(x + w - 3.2, y + 7.6, z + .08), 'stroke-width=".6" stroke-opacity=".55"');
    if (checked) {
      out += planLine(
        [[x + w - 5.5, y + d - 3.2, z + .14], [x + w - 4.1, y + d - 1.8, z + .14], [x + w - 1.6, y + d - 5.2, z + .14]],
        `stroke="${accent}" stroke-width="1.05"`
      );
    }
    return out;
  };
  return { polygon, line, planLine, surface, panelX, panelY, box, ruledNote };
}

/**
 * Isometric 3D articulated blue SVG robot/agent matching the architectural
 * linework of building.mjs and volumetric joint language of building-people.mjs.
 */
function robotMarkup(p, { x, y, heading = 0, target = [x, y + 14, 24] } = {}) {
  const forward = [Math.sin(heading), Math.cos(heading), 0];
  const right = [Math.cos(heading), -Math.sin(heading), 0];
  const local = (u, v, z) => [
    x + right[0] * u + forward[0] * v,
    y + right[1] * u + forward[1] * v,
    z,
  ];
  const poly = (pts, fill = PAPER, extra = '') =>
    `<polygon points="${points(pts.map(pt => p(...pt)))}" fill="${fill}" ${extra}/>`;
  const seg = (a, b, extra = '') => {
    const pa = p(...a), pb = p(...b);
    return `<path d="M${pa[0]},${pa[1]} L${pb[0]},${pb[1]}" fill="none" ${extra}/>`;
  };
  const node = (pt, r = 2.0, fill = PAPER, stroke = BLUE) => {
    const [sx, sy] = p(...pt);
    return `<circle cx="${sx}" cy="${sy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width=".95"/>`;
  };

  const prism = (u0, v0, z0, uw, vd, zh, topFill = PAPER, frontFill = PAPER, sideFill = SHADE, extra = '') => {
    const p000 = local(u0, v0, z0), p100 = local(u0 + uw, v0, z0);
    const p110 = local(u0 + uw, v0 + vd, z0), p010 = local(u0, v0 + vd, z0);
    const p001 = local(u0, v0, z0 + zh), p101 = local(u0 + uw, v0, z0 + zh);
    const p111 = local(u0 + uw, v0 + vd, z0 + zh), p011 = local(u0, v0 + vd, z0 + zh);
    const faces = [
      { pts: [p000, p100, p101, p001], fill: frontFill },
      { pts: [p010, p110, p111, p011], fill: frontFill },
      { pts: [p000, p010, p011, p001], fill: sideFill },
      { pts: [p100, p110, p111, p101], fill: sideFill },
      { pts: [p001, p101, p111, p011], fill: topFill },
    ];
    faces.sort((a, b) => {
      const da = a.pts.reduce((s, q) => s + p(q[0], q[1], 0)[1] + 0.35 * q[2], 0);
      const db = b.pts.reduce((s, q) => s + p(q[0], q[1], 0)[1] + 0.35 * q[2], 0);
      return da - db;
    });
    return faces.map(f => poly(f.pts, f.fill, extra)).join('');
  };

  let out = '';
  // Base shadow / footpad & twin articulated legs
  out += poly([local(-5.4, -4.4, .2), local(5.4, -4.4, .2), local(5.4, 4.4, .2), local(-5.4, 4.4, .2)], GLASS, 'fill-opacity=".5" stroke-opacity=".6"');
  for (const side of [-2.4, 2.4]) {
    out += prism(side - 1.3, -1.8, 0, 2.6, 4.0, 2.4, PAPER, PAPER, SHADE);
    out += seg(local(side, 0, 2.4), local(side, .4, 10.5), 'stroke-width="1.8"');
    out += node(local(side, .4, 10.5), 1.55);
    out += seg(local(side, .4, 10.5), local(side, 0, 18.2), 'stroke-width="1.8"');
  }
  // Pelvis & waist actuator
  out += prism(-4.5, -2.7, 17.8, 9.0, 5.4, 2.8, PAPER, PAPER, SHADE);
  out += seg(local(0, 0, 20.6), local(0, 0, 22.4), 'stroke-width="2.2"');
  // Isometric torso chassis + glass core display
  out += prism(-5.8, -3.6, 22.0, 11.6, 7.2, 11.8, PAPER, PAPER, SHADE);
  out += poly(
    [local(-3.8, 3.65, 24.8), local(3.8, 3.65, 24.8), local(3.8, 3.65, 31.6), local(-3.8, 3.65, 31.6)],
    GLASS,
    'fill-opacity=".82" stroke-width=".8"'
  );
  out += seg(local(-2.3, 3.7, 29.2), local(2.3, 3.7, 29.2), 'stroke-width=".85" stroke-opacity=".85"');
  out += seg(local(-2.3, 3.7, 27.0), local(1.2, 3.7, 27.0), 'stroke-width=".85" stroke-opacity=".7"');
  // Neck & sensor head with blue visor + antenna
  out += seg(local(0, 0, 33.8), local(0, 0, 35.8), 'stroke-width="2.0"');
  out += prism(-4.4, -3.3, 35.5, 8.8, 6.6, 6.8, PAPER, PAPER, SHADE);
  out += poly(
    [local(-3.1, 3.35, 37.6), local(3.1, 3.35, 37.6), local(3.1, 3.35, 40.2), local(-3.1, 3.35, 40.2)],
    BLUE,
    'fill-opacity=".28" stroke-width=".85"'
  );
  out += seg(local(0, 0, 42.3), local(0, 0, 45.6), 'stroke-width="1.05"');
  out += node(local(0, 0, 46.2), 1.45, GLASS, BLUE);

  // Articulated arms reaching toward target
  for (const side of [-1, 1]) {
    const shoulder = local(side * 6.4, 0.2, 31.8);
    const hand = [
      target[0] + right[0] * side * 3.8,
      target[1] + right[1] * side * 3.8,
      target[2],
    ];
    const mid = [
      (shoulder[0] + hand[0]) * 0.5 + right[0] * side * 2.5 - forward[0] * 1.8,
      (shoulder[1] + hand[1]) * 0.5 + right[1] * side * 2.5 - forward[1] * 1.8,
      Math.max(19.5, (shoulder[2] + hand[2]) * 0.5 - 2.6),
    ];
    out += node(shoulder, 1.65, PAPER, BLUE);
    out += seg(shoulder, mid, `stroke="${PAPER}" stroke-width="3.2" stroke-linecap="round"`);
    out += seg(shoulder, mid, 'stroke-width="1.45" stroke-linecap="round"');
    out += node(mid, 1.5, PAPER, BLUE);
    out += seg(mid, hand, `stroke="${PAPER}" stroke-width="2.9" stroke-linecap="round"`);
    out += seg(mid, hand, 'stroke-width="1.35" stroke-linecap="round"');
    // Precision two-finger gripper
    const jawA = [hand[0] + forward[0] * 2.4, hand[1] + forward[1] * 2.4, hand[2] + 1.2];
    const jawB = [hand[0] + forward[0] * 2.4, hand[1] + forward[1] * 2.4, hand[2] - 1.2];
    out += node(hand, 1.3, GLASS, BLUE);
    out += seg(hand, jawA, 'stroke-width="1.05"');
    out += seg(hand, jawB, 'stroke-width="1.05"');
  }
  return out;
}

function parcelBox(iso, x, y, z, { checked = false, agent = false } = {}) {
  const accent = agent ? BLUE : CORAL;
  let out = iso.box(x - 6.8, y - 5.8, 13.6, 11.6, 10.0, PAPER, PAPER, SHADE, z, `stroke="${accent}" stroke-width=".95"`);
  // Top tape/label strip
  out += iso.surface(x - 4.4, y - 1.5, 8.8, 3.0, z + 10.06, accent, `stroke="none" fill-opacity="${agent ? '.28' : '.34'}"`);
  if (checked) {
    out += iso.planLine(
      [[x - 2.3, y + 2.4, z + 10.1], [x - .6, y + 3.9, z + 10.1], [x + 2.9, y + .8, z + 10.1]],
      `stroke="${accent}" stroke-width="1.2"`
    );
  }
  return out;
}

const card1Projector = makeProjector({ originX: 280, originY: 168, centerX: 120, centerY: 88, angle: -28, scale: 1.46 });
const card1Iso = isoPrimitives(card1Projector);
let card1StaticCache = '';

function card1StaticMarkup() {
  if (card1StaticCache) return card1StaticCache;
  const p = card1Projector;
  const { polygon, line, planLine, surface, panelY, box } = card1Iso;
  let s = '';

  // Architectural floor slab & perimeter plan lines (matching building.mjs room())
  s += surface(8, 8, 224, 160, 0, PAPER);
  s += polygon([p(8, 168, 0), p(232, 168, 0), p(232, 168, -4.5), p(8, 168, -4.5)], SHADE);
  s += polygon([p(232, 8, 0), p(232, 168, 0), p(232, 168, -4.5), p(232, 8, -4.5)], SHADE);
  s += surface(18, 16, 204, 144, .2, 'none', 'stroke-opacity=".18"');
  s += planLine([[24, 22, 11], [24, 22, 0], [216, 22, 0], [216, 22, 11]], 'stroke-opacity=".28"');
  s += planLine([[24, 22, 0], [24, 152, 0], [24, 152, 11]], 'stroke-opacity=".28"');

  // Incoming conveyor belt (left: x = 18..86, y = 76..100, height z = 17.2)
  for (const lx of [24, 52, 78]) {
    for (const ly of [79, 96]) s += box(lx, ly, 2.2, 2.2, 14, PAPER, PAPER, SHADE, 0);
  }
  s += box(18, 76, 68, 24, 3.2, PAPER, PAPER, SHADE, 14);
  s += surface(20, 79, 64, 18, 17.3, SHADE, `stroke="${CORAL}" stroke-opacity=".55" stroke-width=".75"`);

  // Central transfer & judgement plinth between human (x=98) and robot (x=136)
  s += box(111, 82, 14, 12, 11.5, PAPER, PAPER, SHADE, 0);
  s += surface(109, 80, 18, 16, 11.6, PAPER, `stroke="${CORAL}" stroke-width=".9"`);
  s += surface(112, 83, 12, 10, 11.75, CORAL, 'stroke="none" fill-opacity=".14"');

  // Outgoing AI-agent conveyor belt (right: x = 148..218, y = 76..100, height z = 17.2)
  for (const lx of [154, 182, 210]) {
    for (const ly of [79, 96]) s += box(lx, ly, 2.2, 2.2, 14, PAPER, PAPER, SHADE, 0);
  }
  s += box(148, 76, 70, 24, 3.2, PAPER, PAPER, SHADE, 14);
  s += surface(150, 79, 66, 18, 17.3, GLASS, 'fill-opacity=".52" stroke-opacity=".68" stroke-width=".75"');

  // Blue agent verification gantry / scanner arch over outgoing belt (x = 186..196)
  s += panelY(186, 75, 17.2, 26, 23, GLASS, 'fill-opacity=".34" stroke-width=".85"');
  s += panelY(196, 75, 17.2, 26, 23, GLASS, 'fill-opacity=".22" stroke-width=".85"');
  s += surface(186, 75, 10, 26, 40.2, PAPER, 'stroke-width=".9"');
  s += line(p(191, 75, 40.2), p(191, 101, 40.2), 'stroke-opacity=".5"');

  // Feedback loop conduit line on floor connecting agent station back to human station
  s += planLine([[191, 101, .4], [191, 134, .4], [98, 134, .4], [98, 101, .4]], 'stroke-dasharray="3 3" stroke-opacity=".42"');

  card1StaticCache = s;
  return s;
}

const card1FrameCache = new Map();
function card1DynamicMarkup(step) {
  if (card1FrameCache.has(step)) return card1FrameCache.get(step);
  const phase = (step % 80) / 80;
  const p = card1Projector;
  const { line, planLine } = card1Iso;
  let d = '';

  // Moving conveyor belt rollers
  const beltShift = (phase * 12) % 12;
  for (let rx = 24 + beltShift; rx <= 82; rx += 12) {
    d += line(p(rx, 80, 17.45), p(rx, 96, 17.45), `stroke="${CORAL}" stroke-opacity=".35" stroke-width=".65"`);
  }
  for (let rx = 152 + beltShift; rx <= 214; rx += 12) {
    d += line(p(rx, 80, 17.45), p(rx, 96, 17.45), 'stroke-opacity=".35" stroke-width=".65"');
  }

  // Incoming queue box on left belt
  const incomingX = lerp(28, 56, phase);
  d += parcelBox(card1Iso, incomingX, 88, 17.5, { checked: false, agent: false });

  // Active box being picked up by Coral Human -> inspected -> handed to Blue Robot -> placed on outgoing belt
  // Human stands in open central bay at (98, 84); Robot stands in open central bay at (136, 84).
  // 0.00..0.32: human lifts box from left belt end (x=76 -> 117)
  // 0.32..0.58: human & robot meet at central transfer pedestal (x=117), check mark applied
  // 0.58..0.88: blue robot carries box to right belt start (x=117 -> 158)
  // 0.88..1.00: box glides along right belt as human & robot reset
  let activeBoxPos, boxChecked = false, boxAgent = false;
  let humanHeading, humanTarget;
  let robotHeading, robotTarget;

  if (phase < 0.32) {
    const u = smooth(phase / 0.32);
    activeBoxPos = [lerp(76, 115, u), 88, lerp(17.5, 22.8, Math.sin(u * Math.PI * 0.5))];
    humanHeading = lerp(-Math.PI * 0.44, Math.PI * 0.44, u);
    humanTarget = [activeBoxPos[0], activeBoxPos[1], activeBoxPos[2] + 4.2];
    const rReset = smooth(u);
    robotHeading = lerp(Math.PI * 0.44, -Math.PI * 0.46, rReset);
    robotTarget = [lerp(154, 125, rReset), 88, lerp(20.5, 23.0, rReset)];
  } else if (phase < 0.58) {
    const u = smooth((phase - 0.32) / 0.26);
    activeBoxPos = [lerp(115, 119, u), 88, lerp(22.8, 23.6, Math.sin(u * Math.PI))];
    boxChecked = u > 0.32;
    humanHeading = Math.PI * 0.45;
    humanTarget = [activeBoxPos[0] - 2.5, activeBoxPos[1], activeBoxPos[2] + 4.4];
    robotHeading = -Math.PI * 0.46;
    robotTarget = [activeBoxPos[0] + 2.5, activeBoxPos[1], activeBoxPos[2] + 4.4];
  } else if (phase < 0.88) {
    const u = smooth((phase - 0.58) / 0.30);
    activeBoxPos = [lerp(119, 158, u), 88, lerp(23.6, 17.5, u)];
    boxChecked = true;
    boxAgent = u > 0.22;
    humanHeading = lerp(Math.PI * 0.45, -Math.PI * 0.44, u);
    humanTarget = [lerp(112, 78, u), 88, lerp(22, 19.5, u)];
    robotHeading = lerp(-Math.PI * 0.46, Math.PI * 0.46, u);
    robotTarget = [activeBoxPos[0], activeBoxPos[1], activeBoxPos[2] + 4.4];
  } else {
    const u = smooth((phase - 0.88) / 0.12);
    activeBoxPos = [lerp(158, 170, u), 88, 17.5];
    boxChecked = true;
    boxAgent = true;
    humanHeading = -Math.PI * 0.44;
    humanTarget = [78, 88, 19.5];
    robotHeading = Math.PI * 0.44;
    robotTarget = [lerp(158, 154, u), 88, 20.5];
  }

  // Outgoing box moving through the blue verification arch on the right belt
  const outX = lerp(170, 208, phase);
  d += parcelBox(card1Iso, outX, 88, 17.5, { checked: true, agent: true });

  // Draw the human operator (coral) at (98, 84), the robot agent (blue) at (136, 84), and the active box
  const human = humanParts({
    project: p,
    x: 98,
    y: 84,
    heading: humanHeading,
    pose: 'standing',
    kind: 'man',
    target: humanTarget,
    id: 'card1-operator',
  });
  d += human.map(part => part.markup).join('');
  d += robotMarkup(p, { x: 136, y: 84, heading: robotHeading, target: robotTarget });
  d += parcelBox(card1Iso, activeBoxPos[0], activeBoxPos[1], activeBoxPos[2], { checked: boxChecked, agent: boxAgent });

  // Learning loop pulse travelling along floor conduit from agent gantry back to human station
  const pulse = 0.5 + 0.5 * Math.sin(phase * TAU);
  const pulseX = lerp(191, 98, phase);
  const [fx, fy] = p(pulseX, 134, 0.8);
  d += `<circle cx="${fx}" cy="${fy}" r="2.4" fill="${CORAL}" stroke="${PAPER}" stroke-width=".75"/>`;
  d += planLine([[117, 88, 36 + pulse * 2], [117, 88, 40 + pulse * 2]], `stroke="${CORAL}" stroke-width="1.15" stroke-opacity=".65"`);

  card1FrameCache.set(step, d);
  return d;
}

const card2Projector = makeProjector({ originX: 282, originY: 196, centerX: 120, centerY: 92, angle: -28, scale: 1.29 });
const card2Iso = isoPrimitives(card2Projector);
let card2StaticCache = '';

function radcliffeCameraMarkup(p, iso) {
  const { polygon, line, planLine } = iso;
  const cx = 58, cy = 58;
  let out = '';

  const ringPoints = (r, z, n = 16, angleOffset = 0) => {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = angleOffset + (i * TAU) / n;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a), z]);
    }
    return pts;
  };

  const cylinderBand = (r0, r1, z0, z1, n = 16, fill = PAPER, shadeFill = SHADE, extra = '') => {
    const bot = ringPoints(r0, z0, n);
    const top = ringPoints(r1, z1, n);
    const quads = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const q = [bot[i], bot[j], top[j], top[i]];
      const midAngle = ((i + 0.5) * TAU) / n;
      const depth = q.reduce((s, pt) => s + p(pt[0], pt[1], 0)[1] + 0.25 * pt[2], 0);
      const isShaded = Math.cos(midAngle - 0.35) > 0.15;
      quads.push({ q, depth, fill: isShaded ? shadeFill : fill });
    }
    quads.sort((a, b) => a.depth - b.depth);
    let band = quads.map(({ q, fill: f }) => polygon(q.map(pt => p(...pt)), f, extra)).join('');
    band += polygon(top.map(pt => p(...pt)), PAPER, 'stroke-width=".8"');
    return band;
  };

  // 1. Rusticated octagonal podium base (z = 0..20)
  out += cylinderBand(33, 33, 0, 20, 8, PAPER, SHADE, 'stroke-width=".85"');
  out += cylinderBand(30, 30, 20, 23, 16, PAPER, SHADE, 'stroke-width=".75"');

  // Arched entrance portal facing the courtyard (+x, +y direction)
  const doorAngle = 0.72;
  const da0 = doorAngle - 0.22, da1 = doorAngle + 0.22;
  out += polygon(
    [
      p(cx + 33.2 * Math.cos(da0), cy + 33.2 * Math.sin(da0), 0),
      p(cx + 33.2 * Math.cos(da1), cy + 33.2 * Math.sin(da1), 0),
      p(cx + 33.2 * Math.cos(da1), cy + 33.2 * Math.sin(da1), 15),
      p(cx + 33.2 * Math.cos(da0), cy + 33.2 * Math.sin(da0), 15),
    ],
    GLASS,
    'fill-opacity=".78" stroke-width=".9"'
  );

  // 2. Cylindrical colonnade drum (z = 23..56) with paired columns & arched windows
  out += cylinderBand(27.5, 27.5, 23, 56, 16, PAPER, SHADE, 'stroke-width=".75"');
  for (let i = 0; i < 16; i++) {
    const a = (i * TAU) / 16;
    const x0 = cx + 28.6 * Math.cos(a), y0 = cy + 28.6 * Math.sin(a);
    if (Math.sin(a) + Math.cos(a) > -0.65) {
      out += line(p(x0, y0, 23), p(x0, y0, 55), 'stroke-width="1.05"');
    }
  }
  // Balustrade cornice ring (z = 56..60)
  out += cylinderBand(29, 28, 56, 60, 16, PAPER, SHADE, 'stroke-width=".85"');

  // 3. Lead-ribbed hemispherical dome (z = 60..92)
  const domeRings = [
    [26.5, 60],
    [24.2, 68.5],
    [19.8, 77],
    [13.5, 85],
    [6.5, 91],
  ];
  for (let r = 0; r < domeRings.length - 1; r++) {
    const [r0, z0] = domeRings[r];
    const [r1, z1] = domeRings[r + 1];
    out += cylinderBand(r0, r1, z0, z1, 16, PAPER, SHADE, 'stroke-width=".65" stroke-opacity=".75"');
  }
  for (let i = 0; i < 12; i++) {
    const a = (i * TAU) / 12;
    if (Math.sin(a) + Math.cos(a) > -0.5) {
      const rib = domeRings.map(([rad, z]) => [cx + rad * Math.cos(a), cy + rad * Math.sin(a), z]);
      out += planLine(rib, 'stroke-width=".75" stroke-opacity=".8"');
    }
  }

  // 4. Cupola lantern & finial spire (z = 91..113)
  out += cylinderBand(6.0, 6.0, 91, 102, 8, GLASS, SHADE, 'stroke-width=".8"');
  out += cylinderBand(6.2, 1.2, 102, 108, 8, PAPER, SHADE, 'stroke-width=".8"');
  out += line(p(cx, cy, 108), p(cx, cy, 115), 'stroke-width="1.1"');
  return out;
}

function officeBuildingMarkup(p, iso) {
  const { surface, panelX, panelY, box, line } = iso;
  const ox = 152, oy = 20, ow = 56, od = 54;
  let out = '';

  // 3-storey isometric office block in the exact style of company-building
  const heights = [0, 27, 54, 81];
  for (let tier = 0; tier < 3; tier++) {
    const z0 = heights[tier], h = 27;
    out += box(ox, oy, ow, od, h, PAPER, PAPER, SHADE, z0, 'stroke-width=".9"');
    for (let col = 0; col < 3; col++) {
      const wx = ox + 5 + col * 16.5;
      out += panelX(wx, oy + od + .1, z0 + 4, 13, 19, GLASS, 'fill-opacity=".55" stroke-width=".65" stroke-opacity=".7"');
    }
    for (let col = 0; col < 3; col++) {
      const wy = oy + 5 + col * 16.0;
      out += panelY(ox + ow + .1, wy, z0 + 4, 12.5, 19, GLASS, 'fill-opacity=".42" stroke-width=".65" stroke-opacity=".7"');
    }
    out += line(p(ox, oy + od, z0 + h), p(ox + ow, oy + od, z0 + h), 'stroke-width="1.15"');
    out += line(p(ox + ow, oy, z0 + h), p(ox + ow, oy + od, z0 + h), 'stroke-width="1.15"');
  }
  out += surface(ox + 6, oy + 6, ow - 12, od - 12, 81.3, 'none', 'stroke-opacity=".35"');
  out += box(ox + 18, oy + 17, 20, 20, 6, PAPER, PAPER, SHADE, 81, `stroke="${CORAL}" stroke-width=".9"`);
  // Ground entrance portal facing courtyard
  out += panelX(ox + 6, oy + od + .2, 0, 14, 18, GLASS, `fill-opacity=".8" stroke="${CORAL}" stroke-width=".95"`);
  return out;
}

function card2StaticMarkup() {
  if (card2StaticCache) return card2StaticCache;
  const p = card2Projector;
  const { polygon, surface, planLine, box, ruledNote } = card2Iso;
  let s = '';

  // Shared campus / courtyard slab
  s += surface(8, 8, 224, 166, 0, PAPER);
  s += polygon([p(8, 174, 0), p(232, 174, 0), p(232, 174, -4.5), p(8, 174, -4.5)], SHADE);
  s += polygon([p(232, 8, 0), p(232, 174, 0), p(232, 174, -4.5), p(232, 8, -4.5)], SHADE);
  s += surface(16, 16, 208, 150, .2, 'none', 'stroke-opacity=".18"');

  // Courtyard paths connecting RadCam (left) and Office Building (right) to the central collaboration table
  s += planLine([[80, 82, .3], [116, 120, .3], [162, 76, .3]], 'stroke-dasharray="3 3" stroke-opacity=".4"');

  // Radcliffe Camera (Oxford Research, left) & Office Building (Operations, right)
  s += radcliffeCameraMarkup(p, card2Iso);
  s += officeBuildingMarkup(p, card2Iso);

  // Central courtyard collaboration table (x = 100..142, y = 118..142)
  for (const [dx, dy] of [[2, 2], [38, 2], [2, 20], [38, 20]]) {
    s += box(100 + dx, 118 + dy, 2, 2, 18, PAPER, PAPER, SHADE, 0);
  }
  s += box(100, 118, 42, 24, 2, PAPER, PAPER, SHADE, 18);
  s += ruledNote(105, 123, 13, 10, 20.3, BLUE, false);
  s += ruledNote(124, 125, 13, 10, 20.3, CORAL, true);

  card2StaticCache = s;
  return s;
}

const card2FrameCache = new Map();
function card2DynamicMarkup(step) {
  if (card2FrameCache.has(step)) return card2FrameCache.get(step);
  const phase = (step % 80) / 80;
  const p = card2Projector;
  const { ruledNote } = card2Iso;

  // Smooth ping-pong emergence & exchange cycle in the open courtyard in front of both buildings:
  const walk = 0.5 - 0.5 * Math.cos(phase * TAU);
  const gesture = Math.sin(phase * TAU);

  // Emerging Researcher (Blue) walking from RadCam doorway plaza (72, 96) toward courtyard (82, 110)
  const resWalkX = lerp(72, 82, walk);
  const resWalkY = lerp(96, 110, walk);
  const resWalk = humanParts({
    project: p,
    x: resWalkX,
    y: resWalkY,
    heading: 0.62,
    pose: 'holding-records',
    kind: 'woman',
    target: [resWalkX + 6, resWalkY + 8, 24],
    id: 'card2-res-walk',
  }).map(part => part.markup).join('');

  // Emerging Operator (Coral) walking from Office doorway plaza (164, 88) toward courtyard (156, 106)
  const opWalkX = lerp(164, 156, walk);
  const opWalkY = lerp(88, 106, walk);
  const opWalk = humanParts({
    project: p,
    x: opWalkX,
    y: opWalkY,
    heading: -0.58,
    pose: 'holding-records',
    kind: 'man',
    target: [opWalkX - 6, opWalkY + 8, 24],
    id: 'card2-op-walk',
  }).map(part => part.markup).join('');

  // Lead Researcher (Blue) at central table sharing notes with Lead Operator (Coral)
  const sharedNoteX = lerp(112, 121, walk);
  const resLead = humanParts({
    project: p,
    x: 92,
    y: 132,
    heading: Math.PI * 0.45,
    pose: 'collaborating',
    kind: 'man',
    target: [sharedNoteX, 129, 21.2 + Math.max(0, gesture) * 1.4],
    id: 'card2-res-lead',
  }).map(part => part.markup).join('');

  const opLead = humanParts({
    project: p,
    x: 150,
    y: 132,
    heading: -Math.PI * 0.45,
    pose: 'pointing',
    kind: 'woman',
    target: [sharedNoteX + 4, 130, 21.2 + Math.max(0, -gesture) * 1.4],
    id: 'card2-op-lead',
  }).map(part => part.markup).join('');

  // Shared note sliding between researcher and operator on the table
  const sharedNote = ruledNote(sharedNoteX - 6, 124, 12, 9.5, 20.55, walk > 0.5 ? CORAL : BLUE, walk > 0.35);

  const markup =
    `<g style="--building-coral:${BLUE}">${resWalk}</g>` +
    `<g style="--building-coral:${CORAL}">${opWalk}</g>` +
    sharedNote +
    `<g style="--building-coral:${BLUE}">${resLead}</g>` +
    `<g style="--building-coral:${CORAL}">${opLead}</g>`;

  card2FrameCache.set(step, markup);
  return markup;
}

export function initThesisCards(stage) {
  const card1Svg = stage.querySelector('[data-thesis-svg="1"]');
  const card2Svg = stage.querySelector('[data-thesis-svg="2"]');
  if (!card1Svg || !card2Svg) return () => {};

  card1Svg.innerHTML = `<g stroke="${BLUE}" stroke-width=".9" stroke-linejoin="round" stroke-linecap="round">${card1StaticMarkup()}<g data-dynamic></g></g>`;
  card2Svg.innerHTML = `<g stroke="${BLUE}" stroke-width=".9" stroke-linejoin="round" stroke-linecap="round">${card2StaticMarkup()}<g data-dynamic></g></g>`;

  const dyn1 = card1Svg.querySelector('[data-dynamic]');
  const dyn2 = card2Svg.querySelector('[data-dynamic]');
  const items = {
    card1Body: stage.querySelector('[data-thesis-reveal="card1-body"]'),
    card1Art: stage.querySelector('[data-thesis-reveal="card1-art"]'),
    card2Card: stage.querySelector('[data-thesis-reveal="card2-card"]'),
    card2Heading: stage.querySelector('[data-thesis-reveal="card2-heading"]'),
    card2Body: stage.querySelector('[data-thesis-reveal="card2-body"]'),
    card2Art: stage.querySelector('[data-thesis-reveal="card2-art"]'),
  };

  let lastStep1 = -1;
  let lastStep2 = -1;

  const setReveal = (el, t) => {
    if (!el) return;
    const v = smooth(t);
    el.style.opacity = v.toFixed(3);
    el.style.transform = `translate3d(0,${((1 - v) * 14).toFixed(2)}px,0)`;
  };

  const render = (scrollProgress = 1, timeSeconds = 0, reducedMotion = false) => {
    if (reducedMotion) {
      stage.classList.remove('thesis-enhanced');
      Object.values(items).forEach(el => {
        if (!el) return;
        el.style.removeProperty('opacity');
        el.style.removeProperty('transform');
      });
      if (lastStep1 !== 20) {
        lastStep1 = 20;
        dyn1.innerHTML = card1DynamicMarkup(20);
      }
      if (lastStep2 !== 40) {
        lastStep2 = 40;
        dyn2.innerHTML = card2DynamicMarkup(40);
      }
      return;
    }

    stage.classList.add('thesis-enhanced');
    const p = clamp(scrollProgress);

    // Progressive scroll-driven fade-ins across the two cards:
    // 0.02 -> 0.24: Card 1 body text fades in
    // 0.16 -> 0.42: Card 1 isometric conveyor animation fades in
    // 0.40 -> 0.60: Card 2 & heading fade in
    // 0.54 -> 0.76: Card 2 body text fades in
    // 0.66 -> 0.90: Card 2 RadCam + Office isometric animation fades in
    setReveal(items.card1Body, (p - 0.02) / 0.22);
    setReveal(items.card1Art, (p - 0.16) / 0.26);
    setReveal(items.card2Card, (p - 0.38) / 0.20);
    setReveal(items.card2Heading, (p - 0.40) / 0.20);
    setReveal(items.card2Body, (p - 0.54) / 0.22);
    setReveal(items.card2Art, (p - 0.66) / 0.24);

    // Combine scroll progression with gentle live animation so scrolling directly
    // advances the handoff/courtyard AND the scene stays alive while reading.
    const cycle1 = ((timeSeconds * 0.18) + p * 1.1) % 1;
    const cycle2 = ((timeSeconds * 0.16) + Math.max(0, p - 0.45) * 1.2) % 1;
    const step1 = Math.floor(((cycle1 % 1) + 1) % 1 * 80);
    const step2 = Math.floor(((cycle2 % 1) + 1) % 1 * 80);

    if (step1 !== lastStep1) {
      lastStep1 = step1;
      dyn1.innerHTML = card1DynamicMarkup(step1);
    }
    if (step2 !== lastStep2) {
      lastStep2 = step2;
      dyn2.innerHTML = card2DynamicMarkup(step2);
    }
  };

  render(0, 0, false);
  return render;
}
