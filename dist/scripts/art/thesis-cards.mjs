const PAPER = '#F3F0E8';
const SHADE = '#E5E8ED';
const GLASS = '#D7DFEF';
const BLUE = '#244EFF';
const CORAL = '#FF6655';

const DEEP_BG = '#0F1D3A';
const DEEP_SHADE = '#162A52';
const DEEP_GLASS = '#1D3B73';
const DEEP_LINE = '#8FA5FF';
const AQUA = '#7CE0FF';
const SPARK = '#FFD166';

const TAU = Math.PI * 2;

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => {
  const c = clamp(t);
  return c * c * (3 - 2 * c);
};
const number = n => Number(n.toFixed(2));
const pair = pt => `${number(pt[0])},${number(pt[1])}`;
const points = ps => ps.map(pair).join(' ');

const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len3 = a => Math.hypot(a[0], a[1], a[2]);
const unit3 = a => mul3(a, 1 / (len3(a) || 1));
const mix3 = (a, b, t) => [
  a[0] * (1 - t) + b[0] * t,
  a[1] * (1 - t) + b[1] * t,
  a[2] * (1 - t) + b[2] * t,
];

function hull(pts) {
  const sorted = pts.map(p => [p[0], p[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const half = input => {
    const res = [];
    for (const pt of input) {
      while (res.length > 1 && turn(res.at(-2), res.at(-1), pt) <= 0) res.pop();
      res.push(pt);
    }
    return res;
  };
  return [...half(sorted).slice(0, -1), ...half(sorted.slice().reverse()).slice(0, -1)];
}

function roundedPath(pts) {
  if (!pts.length) return '';
  const mid = (a, b) => [(a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5];
  let d = `M${pair(mid(pts.at(-1), pts[0]))}`;
  for (let i = 0; i < pts.length; i++) {
    d += `Q${pair(pts[i])} ${pair(mid(pts[i], pts[(i + 1) % pts.length]))}`;
  }
  return d + 'Z';
}

function makeProjector({ originX = 280, originY = 168, centerX = 100, centerY = 100, angle = -12, scale = 1.72, pitch = 0.43 } = {}) {
  const rad = angle * Math.PI / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const project = (x, y, z = 0) => {
    const dx = x - centerX, dy = y - centerY;
    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;
    return [
      number(originX + scale * 0.9 * (rx - ry)),
      number(originY + scale * pitch * (rx + ry) - scale * z),
    ];
  };
  const origin = project(0, 0, 0);
  const axes = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map(pt => {
    const pr = project(...pt);
    return [pr[0] - origin[0], pr[1] - origin[1]];
  });
  const xx = axes.reduce((s, a) => s + a[0] * a[0], 0);
  const yy = axes.reduce((s, a) => s + a[1] * a[1], 0);
  const xy = axes.reduce((s, a) => s + a[0] * a[1], 0);
  const tilt = 0.5 * Math.atan2(2 * xy, xx - yy);
  const spread = Math.hypot(xx - yy, 2 * xy);
  const major = Math.sqrt((xx + yy + spread) / 2);
  const minor = Math.sqrt((xx + yy - spread) / 2);
  const cosT = Math.cos(tilt), sinT = Math.sin(tilt);

  project.sphereOutline = (centre, radius, samples = 18) => {
    const pt = project(...centre);
    const out = [];
    for (let i = 0; i < samples; i++) {
      const theta = (TAU * i) / samples;
      const u = radius * major * Math.cos(theta);
      const v = radius * minor * Math.sin(theta);
      out.push([pt[0] + u * cosT - v * sinT, pt[1] + u * sinT + v * cosT]);
    }
    return out;
  };
  return project;
}

function isoPrimitives(p, palette = { paper: PAPER, shade: SHADE }) {
  const defPaper = palette.paper || PAPER;
  const defShade = palette.shade || SHADE;
  const polygon = (ps, fill = defPaper, extra = '') => `<polygon points="${points(ps)}" fill="${fill}" ${extra}/>`;
  const line = (a, b, extra = '') => `<path d="M${pair(a)} L${pair(b)}" fill="none" ${extra}/>`;
  const planLine = (coords, extra = '') => `<path d="${coords.map(([x, y, z], i) => `${i ? 'L' : 'M'}${pair(p(x, y, z || 0))}`).join(' ')}" fill="none" ${extra}/>`;
  const surface = (x, y, w, d, z = 0, fill = defPaper, extra = '') =>
    polygon([p(x, y, z), p(x + w, y, z), p(x + w, y + d, z), p(x, y + d, z)], fill, extra);
  const panelX = (x, y, z, w, h, fill = defPaper, extra = '') =>
    polygon([p(x, y, z), p(x + w, y, z), p(x + w, y, z + h), p(x, y, z + h)], fill, extra);
  const panelY = (x, y, z, d, h, fill = defShade, extra = '') =>
    polygon([p(x, y, z), p(x, y + d, z), p(x, y + d, z + h), p(x, y, z + h)], fill, extra);
  const box = (x, y, w, d, h, topFill = defPaper, frontFill = defPaper, sideFill = defShade, baseZ = 0, extra = '') => (
    panelY(x + w, y, baseZ, d, h, sideFill, extra) +
    panelX(x, y + d, baseZ, w, h, frontFill, extra) +
    surface(x, y, w, d, baseZ + h, topFill, extra)
  );
  const ruledNote = (x, y, w = 11, d = 8.5, z = 16.4, accent = CORAL, checked = false) => {
    let out = surface(x, y, w, d, z, defPaper, 'stroke-width=".75"');
    out += surface(x + 1.5, y + 1.3, w - 3.0, 1.5, z + .05, accent, 'stroke="none" fill-opacity=".38"');
    out += line(p(x + 1.6, y + 4.4, z + .08), p(x + w - 1.6, y + 4.4, z + .08), 'stroke-width=".58" stroke-opacity=".55"');
    out += line(p(x + 1.6, y + 6.4, z + .08), p(x + w - 2.8, y + 6.4, z + .08), 'stroke-width=".58" stroke-opacity=".55"');
    if (checked) {
      out += planLine(
        [[x + w - 4.6, y + d - 2.7, z + .14], [x + w - 3.4, y + d - 1.5, z + .14], [x + w - 1.3, y + d - 4.3, z + .14]],
        `stroke="${accent}" stroke-width="1.0"`
      );
    }
    return out;
  };
  return { polygon, line, planLine, surface, panelX, panelY, box, ruledNote };
}

// ----------------------------------------------------------------------------
// Rounded solids for the mech suit, so the machine is drawn in the same
// capsule language as the people.
// ----------------------------------------------------------------------------

// World direction that points out of the screen towards the viewer.
function viewToward(angle) {
  const rad = angle * Math.PI / 180;
  return unit3([Math.cos(rad) + Math.sin(rad), Math.cos(rad) - Math.sin(rad), 0]);
}

function bodyFrame(x, y, heading, z = 0, scale = 1) {
  const forward = [Math.sin(heading), Math.cos(heading), 0];
  const right = [Math.cos(heading), -Math.sin(heading), 0];
  const local = (u, v, h) => [
    x + (right[0] * u + forward[0] * v) * scale,
    y + (right[1] * u + forward[1] * v) * scale,
    z + h * scale,
  ];
  return { forward, right, local, scale };
}

function solid(d, { fill, stroke, width = 1.0, extra = '' }) {
  return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" ${extra}/>`;
}

function capsule(p, a, rA, b, rB, style) {
  return solid(roundedPath(hull([...p.sphereOutline(a, rA), ...p.sphereOutline(b, rB)])), style);
}

function ball(p, c, r, style) {
  return solid(roundedPath(p.sphereOutline(c, r, 20)), style);
}

// Smooth hull through stacked elliptical rings: [height, half-width, half-depth, forward offset].
function shell(p, frame, rings, style) {
  const pts = [];
  for (const [h, uRad, vRad, vOff = 0] of rings) {
    for (let i = 0; i < 18; i++) {
      const t = (TAU * i) / 18;
      pts.push(p(...frame.local(uRad * Math.cos(t), vOff + vRad * Math.sin(t), h)));
    }
  }
  return solid(roundedPath(hull(pts)), style);
}

// The part of an elliptical ring around a body that faces the viewer.
function visibleArc(p, frame, view, h, uRad, vRad, vOff = 0, extra = '') {
  const pts = [];
  for (let i = 0; i <= 48; i++) {
    const t = (TAU * i) / 48;
    const normal = add3(mul3(frame.right, Math.cos(t) / uRad), mul3(frame.forward, Math.sin(t) / vRad));
    if (dot3(normal, view) > 0.02) pts.push(p(...frame.local(uRad * Math.cos(t), vOff + vRad * Math.sin(t), h)));
    else if (pts.length) break;
  }
  if (pts.length < 2) return '';
  return `<path d="M${pts.map(pair).join(' L')}" fill="none" ${extra}/>`;
}

/**
 * Volumetric 3D world-space human figure:
 * - Continuous, seamless 3D torso + legs + feet silhouette (two-pass stroke-then-fill removes
 *   all "wooden doll" hip/waist/ankle seam lines while keeping full 3D perspective volume).
 * - Faceless 3D spherical head floating cleanly above the shoulders (or fitted with a 3D welder mask).
 * - Fixed-length 3D inverse-kinematics arms with strictly uniform radius from shoulder to hand
 *   (no flared/longer wrists and zero rubber-band stretching).
 */
function human3DMarkup(p, {
  id = 'h',
  x,
  y,
  z = 0,
  scale = 0.84,
  heading = 0,
  lean = 0,
  stride = 0,
  color = CORAL,
  fillPaper = PAPER,
  shadowColor = SHADE,
  leftTarget = null,
  rightTarget = null,
  holdingNote = null,
  holdingBoard = false,
  welderMask = false,
  blowtorchTarget = null,
  sparkPhase = 0,
  held = '',
} = {}) {
  const s = scale;
  const forward = [Math.sin(heading), Math.cos(heading), 0];
  const right = [Math.cos(heading), -Math.sin(heading), 0];
  const local = (u, v, h) => [
    x + (right[0] * u + forward[0] * v) * s,
    y + (right[1] * u + forward[1] * v) * s,
    z + h * s,
  ];
  const depthOf = pt => p(pt[0], pt[1], 0)[1] + 0.4 * pt[2];

  const hipZ = 20.5;
  const shoulderZ = 33.8;
  const headZ = 40.8;

  const capsuleContour = (a, rA, b, rB) =>
    roundedPath(hull([...p.sphereOutline(a, rA * s), ...p.sphereOutline(b, rB * s)]));

  // 1. 3D Legs + Feet contours (collected together with torso so they form a single seamless silhouette)
  const bodyContourPaths = [];
  for (const side of [-1, 1]) {
    const stepV = side * stride * 3.2;
    const liftZ = Math.max(0, side * stride) * 1.4;
    const hip = local(side * 2.55, 0, hipZ);
    const knee = local(side * 2.65, lean * 0.35 + stepV * 0.55, 10.6 + liftZ * 0.5);
    const ankle = local(side * 2.75, stepV, 1.6 + liftZ);
    const foot = local(side * 2.8, stepV + 1.9, 1.05 + liftZ);
    bodyContourPaths.push(
      `<path d="${capsuleContour(hip, 1.85, knee, 1.55)}"/>`,
      `<path d="${capsuleContour(knee, 1.55, ankle, 1.22)}"/>`,
      `<path d="${capsuleContour(ankle, 1.25, foot, 1.32)}"/>`
    );
  }

  // 2. 3D Volumetric Torso hull
  const torsoPts = [];
  const rings = [
    [hipZ - 0.6, 3.65, 2.25, 0],
    [hipZ + 5.2, 3.35, 2.15, lean * 0.45],
    [shoulderZ - 0.4, 4.45, 2.35, lean * 0.92],
    [shoulderZ + 1.1, 3.45, 2.0, lean],
  ];
  for (const [rz, uRad, vRad, vOff] of rings) {
    for (let i = 0; i < 14; i++) {
      const theta = (TAU * i) / 14;
      torsoPts.push(p(...local(uRad * Math.cos(theta), vOff + vRad * Math.sin(theta), rz)));
    }
  }
  const torsoD = roundedPath(hull(torsoPts));
  bodyContourPaths.push(`<path d="${torsoD}"/>`);

  const allBodyPaths = bodyContourPaths.join('');
  const clipId = `clip-${id}-${Math.round(x)}-${Math.round(y)}`;
  const defs = `<defs><clipPath id="${clipId}"><path d="${torsoD}"/></clipPath></defs>`;

  const strokeW = number(1.52 * Math.max(0.78, s));
  const unifiedBodyMarkup =
    `<g fill="${color}" stroke="${color}" stroke-width="${strokeW}" stroke-linejoin="round">${allBodyPaths}</g>` +
    `<g fill="${fillPaper}" stroke="none">${allBodyPaths}</g>` +
    `<g fill="${color}" opacity=".08" stroke="none">${allBodyPaths}</g>`;

  // 3. Faceless 3D Spherical Head floating cleanly above shoulders (+ optional 3D Welder Mask)
  const headCenter = local(0, lean * 1.05 + 0.2, headZ);
  const headD = roundedPath(p.sphereOutline(headCenter, 3.35 * s, 20));
  let headMarkup =
    `<path d="${headD}" fill="${color}" stroke="${color}" stroke-width="${strokeW}" stroke-linejoin="round"/>` +
    `<path d="${headD}" fill="${fillPaper}" stroke="none"/>` +
    `<path d="${headD}" fill="${color}" fill-opacity=".06" stroke="none"/>`;

  if (welderMask) {
    // 3D flip-down welding helmet visor on front of head with glowing slit
    const m0 = local(-3.2, lean * 1.05 + 2.5, headZ - 3.0);
    const m1 = local(3.2, lean * 1.05 + 2.5, headZ - 3.0);
    const m2 = local(3.4, lean * 1.05 + 2.9, headZ + 2.4);
    const m3 = local(-3.4, lean * 1.05 + 2.9, headZ + 2.4);
    const s0 = local(-2.3, lean * 1.05 + 3.05, headZ - 0.2);
    const s1 = local(2.3, lean * 1.05 + 3.05, headZ - 0.2);
    const s2 = local(2.3, lean * 1.05 + 3.1, headZ + 1.1);
    const s3 = local(-2.3, lean * 1.05 + 3.1, headZ + 1.1);
    headMarkup += `<polygon points="${points([m0, m1, m2, m3].map(pt => p(...pt)))}" fill="${fillPaper}" stroke="${color}" stroke-width="1.05"/>`;
    headMarkup += `<polygon points="${points([s0, s1, s2, s3].map(pt => p(...pt)))}" fill="${AQUA}" fill-opacity=".75" stroke="${color}" stroke-width=".75"/>`;
  }

  // 4. Fixed-length 3D Inverse-Kinematics Arms with strictly even width (no flared wrists)
  const torsoDepth = depthOf(local(0, lean * 0.5, (hipZ + shoulderZ) * 0.5));
  const backArms = [];
  const frontArms = [];
  const solvedHands = [];

  // Each hand reaches with the arm on its own side of the body, so targets
  // given in world space never make the arms cross over the chest.
  const sideOf = pt => (pt[0] - x) * right[0] + (pt[1] - y) * right[1];
  const swapped = leftTarget && rightTarget && sideOf(leftTarget) > sideOf(rightTarget);
  const targets = swapped ? [rightTarget, leftTarget] : [leftTarget, rightTarget];
  const boardHand = swapped ? 1 : 0;

  for (const side of [-1, 1]) {
    const shoulder = local(side * 4.25, lean * 0.92, shoulderZ - 0.3);
    const defaultHand = local(side * 5.0, -side * stride * 2.4 + 0.8, 16.8);
    const requested = targets[side < 0 ? 0 : 1] || defaultHand;

    const delta = sub3(requested, shoulder);
    const dist = len3(delta);
    const upper = 7.7 * s;
    const lower = 7.7 * s;
    const maxReach = upper + lower - 0.04 * s;
    const used = Math.max(1.2 * s, Math.min(maxReach, dist));
    const dir = dist > 1e-6 ? unit3(delta) : [0, 0, -1];
    const hand = add3(shoulder, mul3(dir, used));
    solvedHands.push(hand);

    // For a raised hand (e.g. scratching head), let the elbow flare outward horizontally
    const highHand = hand[2] > shoulder[2] + 2.0 * s;
    const bendHint = highHand
      ? add3(mul3(right, side * 0.85), add3(mul3(forward, 0.25), [0, 0, -0.25]))
      : add3(mul3(right, side * 0.42), add3(mul3(forward, -0.22), [0, 0, -1]));
    let bend = sub3(bendHint, mul3(dir, dot3(bendHint, dir)));
    if (len3(bend) < 1e-6) bend = right;
    bend = unit3(bend);

    const along = (upper * upper - lower * lower + used * used) / (2 * used);
    const across = Math.sqrt(Math.max(0, upper * upper - along * along));
    const elbow = add3(add3(shoulder, mul3(dir, along)), mul3(bend, across));

    // Strictly uniform radius [1.32, 1.32, 1.32] from shoulder to hand -> even arm shape, no wrist bulb!
    const armR = 1.32;
    const upperD = capsuleContour(shoulder, armR, elbow, armR);
    const lowerD = capsuleContour(elbow, armR, hand, armR);
    const armPaths = `<path d="${upperD}"/><path d="${lowerD}"/>`;

    const shoulderDepth = depthOf(shoulder);
    const elbowDepth = depthOf(elbow);
    const isFrontShoulder = shoulderDepth >= torsoDepth - 0.15;

    const attachEnd = mix3(shoulder, elbow, 0.35);
    const attachD = capsuleContour(shoulder, armR * 1.12, attachEnd, armR * 1.04);
    const seam = isFrontShoulder
      ? `<g clip-path="url(#${clipId})"><path d="${attachD}" fill="${fillPaper}" stroke="none"/><path d="${attachD}" fill="${color}" fill-opacity=".08" stroke="none"/></g>`
      : '';

    const armMarkup =
      `<g fill="${color}" stroke="${color}" stroke-width="${strokeW}" stroke-linejoin="round">${armPaths}</g>` +
      seam +
      `<g fill="${fillPaper}" stroke="none">${armPaths}</g>` +
      `<g fill="${color}" opacity=".08" stroke="none">${armPaths}</g>`;

    if (isFrontShoulder || elbowDepth > torsoDepth + 0.5) {
      frontArms.push(armMarkup);
    } else {
      backArms.push(armMarkup);
    }
  }

  // Optional 3D note card held between the hands
  let propMarkup = '';
  if (holdingNote && solvedHands.length === 2) {
    const midH = mix3(solvedHands[0], solvedHands[1], 0.5);
    const corners = [
      add3(midH, add3(mul3(right, -3.4 * s), [0, 0, -2.6 * s])),
      add3(midH, add3(mul3(right, 3.4 * s), [0, 0, -2.6 * s])),
      add3(midH, add3(mul3(right, 3.4 * s), add3(mul3(forward, 1.6 * s), [0, 0, 2.8 * s]))),
      add3(midH, add3(mul3(right, -3.4 * s), add3(mul3(forward, 1.6 * s), [0, 0, 2.8 * s]))),
    ];
    propMarkup += `<polygon points="${points(corners.map(pt => p(...pt)))}" fill="${fillPaper}" stroke="${holdingNote}" stroke-width=".85"/>`;
  }

  // Optional 3D clipboard / inspection board held in left hand (for the head-scratching designer)
  if (holdingBoard && solvedHands.length >= 1) {
    const lh = solvedHands[boardHand];
    const bCorners = [
      add3(lh, add3(mul3(right, -3.8 * s), add3(mul3(forward, -1.0 * s), [0, 0, -3.5 * s]))),
      add3(lh, add3(mul3(right, 4.2 * s), add3(mul3(forward, 2.0 * s), [0, 0, -3.5 * s]))),
      add3(lh, add3(mul3(right, 4.2 * s), add3(mul3(forward, 3.5 * s), [0, 0, 4.2 * s]))),
      add3(lh, add3(mul3(right, -3.8 * s), add3(mul3(forward, 0.5 * s), [0, 0, 4.2 * s]))),
    ];
    const bPts = bCorners.map(pt => p(...pt));
    propMarkup += `<polygon points="${points(bPts)}" fill="${fillPaper}" stroke="${DEEP_LINE}" stroke-width=".95"/>`;
    const r1a = p(...mix3(bCorners[3], bCorners[0], 0.35));
    const r1b = p(...mix3(bCorners[2], bCorners[1], 0.35));
    const r2a = p(...mix3(bCorners[3], bCorners[0], 0.65));
    const r2b = p(...mix3(bCorners[2], bCorners[1], 0.65));
    propMarkup += `<path d="M${pair(r1a)} L${pair(r1b)} M${pair(r2a)} L${pair(r2b)}" fill="none" stroke="${CORAL}" stroke-width=".75"/>`;
  }

  // Optional 3D blowtorch & animated welding sparks (for the welder engineer)
  if (blowtorchTarget && solvedHands.length === 2) {
    const grip = mix3(solvedHands[0], solvedHands[1], 0.5);
    const dir = unit3(sub3(blowtorchTarget, grip));
    const bodyEnd = add3(grip, mul3(dir, 4.8 * s));
    const tip = add3(grip, mul3(dir, 7.6 * s));
    const flameEnd = add3(tip, mul3(dir, (3.6 + Math.sin(sparkPhase * TAU * 4) * 1.1) * s));
    const pGrip = p(...grip), pBody = p(...bodyEnd), pTip = p(...tip), pFlame = p(...flameEnd);
    propMarkup += `<path d="M${pair(pGrip)} L${pair(pBody)}" fill="none" stroke="${DEEP_LINE}" stroke-width="${number(3.2 * s)}" stroke-linecap="round"/>`;
    propMarkup += `<path d="M${pair(pBody)} L${pair(pTip)}" fill="none" stroke="${CORAL}" stroke-width="${number(1.8 * s)}" stroke-linecap="round"/>`;
    propMarkup += `<path d="M${pair(pTip)} L${pair(pFlame)}" fill="none" stroke="${AQUA}" stroke-width="${number(2.4 * s)}" stroke-linecap="round"/>`;
    // Radial welding sparks bursting from the weld point
    for (let k = 0; k < 6; k++) {
      const u = ((sparkPhase * 3 + k * 0.17) % 1);
      const a = k * (TAU / 6) + 0.4;
      const sparkR = (2.0 + u * 8.5) * s;
      const sx = pFlame[0] + Math.cos(a) * sparkR;
      const sy = pFlame[1] + Math.sin(a) * sparkR * 0.75 - Math.sin(u * Math.PI) * 3.5 * s;
      const sx0 = pFlame[0] + Math.cos(a) * sparkR * 0.45;
      const sy0 = pFlame[1] + Math.sin(a) * sparkR * 0.35;
      propMarkup += `<path d="M${number(sx0)},${number(sy0)} L${number(sx)},${number(sy)}" fill="none" stroke="${k % 2 ? SPARK : CORAL}" stroke-width=".95" stroke-opacity="${number(1 - u * 0.75)}"/>`;
    }
    propMarkup += `<circle cx="${pFlame[0]}" cy="${pFlame[1]}" r="${number((1.8 + 0.6 * Math.sin(sparkPhase * TAU * 6)) * s)}" fill="${SPARK}" stroke="none"/>`;
  }

  // Ground shadow under feet
  const [gx, gy] = p(x, y, z + 0.2);
  const shadow = `<ellipse cx="${number(gx)}" cy="${number(gy)}" rx="${number(6.8 * s)}" ry="${number(3.0 * s)}" fill="${shadowColor}" fill-opacity=".65" stroke="none"/>`;

  return `${defs}<g data-human-3d="${id}">${shadow}${backArms.join('')}${unifiedBodyMarkup}${held}${frontArms.join('')}${propMarkup}${headMarkup}</g>`;
}

/**
 * Isometric 3D articulated blue SVG robot/agent with rotating torso and dual gripper arms.
 */
function robotMarkup(p, { x, y, z = 0, scale = 0.84, heading = 0, target = [x, y + 14, 24], held = '' } = {}) {
  const s = scale;
  const forward = [Math.sin(heading), Math.cos(heading), 0];
  const right = [Math.cos(heading), -Math.sin(heading), 0];
  const local = (u, v, h) => [
    x + (right[0] * u + forward[0] * v) * s,
    y + (right[1] * u + forward[1] * v) * s,
    z + h * s,
  ];
  const poly = (pts, fill = PAPER, extra = '') =>
    `<polygon points="${points(pts.map(pt => p(...pt)))}" fill="${fill}" ${extra}/>`;
  const seg = (a, b, extra = '') => {
    const pa = p(...a), pb = p(...b);
    return `<path d="M${pair(pa)} L${pair(pb)}" fill="none" ${extra}/>`;
  };
  const node = (pt, r = 1.9, fill = PAPER, stroke = BLUE) => {
    const [sx, sy] = p(...pt);
    return `<circle cx="${sx}" cy="${sy}" r="${number(r * s)}" fill="${fill}" stroke="${stroke}" stroke-width=".95"/>`;
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
      const da = a.pts.reduce((sum, q) => sum + p(q[0], q[1], 0)[1] + 0.35 * q[2], 0);
      const db = b.pts.reduce((sum, q) => sum + p(q[0], q[1], 0)[1] + 0.35 * q[2], 0);
      return da - db;
    });
    return faces.map(f => poly(f.pts, f.fill, extra)).join('');
  };

  let out = '';
  out += poly([local(-5.4, -4.4, .2), local(5.4, -4.4, .2), local(5.4, 4.4, .2), local(-5.4, 4.4, .2)], GLASS, 'fill-opacity=".5" stroke-opacity=".6"');
  for (const side of [-2.4, 2.4]) {
    out += prism(side - 1.3, -1.8, 0, 2.6, 4.0, 2.4, PAPER, PAPER, SHADE);
    out += seg(local(side, 0, 2.4), local(side, .4, 10.5), 'stroke-width="1.8"');
    out += node(local(side, .4, 10.5), 1.55);
    out += seg(local(side, .4, 10.5), local(side, 0, 18.2), 'stroke-width="1.8"');
  }
  out += prism(-4.5, -2.7, 17.8, 9.0, 5.4, 2.8, PAPER, PAPER, SHADE);
  out += seg(local(0, 0, 20.6), local(0, 0, 22.4), 'stroke-width="2.2"');
  out += prism(-5.8, -3.6, 22.0, 11.6, 7.2, 11.8, PAPER, PAPER, SHADE);
  out += poly(
    [local(-3.8, 3.65, 24.8), local(3.8, 3.65, 24.8), local(3.8, 3.65, 31.6), local(-3.8, 3.65, 31.6)],
    GLASS,
    'fill-opacity=".82" stroke-width=".8"'
  );
  out += seg(local(-2.3, 3.7, 29.2), local(2.3, 3.7, 29.2), 'stroke-width=".85" stroke-opacity=".85"');
  out += seg(local(-2.3, 3.7, 27.0), local(1.2, 3.7, 27.0), 'stroke-width=".85" stroke-opacity=".7"');
  out += seg(local(0, 0, 33.8), local(0, 0, 35.8), 'stroke-width="2.0"');
  out += prism(-4.4, -3.3, 35.5, 8.8, 6.6, 6.8, PAPER, PAPER, SHADE);
  out += poly(
    [local(-3.1, 3.35, 37.6), local(3.1, 3.35, 37.6), local(3.1, 3.35, 40.2), local(-3.1, 3.35, 40.2)],
    BLUE,
    'fill-opacity=".28" stroke-width=".85"'
  );
  out += seg(local(0, 0, 42.3), local(0, 0, 45.6), 'stroke-width="1.05"');
  out += node(local(0, 0, 46.2), 1.45, GLASS, BLUE);
  out += held;

  for (const side of [-1, 1]) {
    const shoulder = local(side * 6.4, 0.2, 31.8);
    const hand = [
      target[0] + right[0] * side * 6.0 * s,
      target[1] + right[1] * side * 6.0 * s,
      target[2],
    ];
    const mid = [
      (shoulder[0] + hand[0]) * 0.5 + (right[0] * side * 2.2 - forward[0] * 1.6) * s,
      (shoulder[1] + hand[1]) * 0.5 + (right[1] * side * 2.2 - forward[1] * 1.6) * s,
      Math.max(z + 16 * s, (shoulder[2] + hand[2]) * 0.5 - 2.0 * s),
    ];
    out += node(shoulder, 1.65, PAPER, BLUE);
    out += seg(shoulder, mid, `stroke="${PAPER}" stroke-width="3.2" stroke-linecap="round"`);
    out += seg(shoulder, mid, 'stroke-width="1.45" stroke-linecap="round"');
    out += node(mid, 1.5, PAPER, BLUE);
    out += seg(mid, hand, `stroke="${PAPER}" stroke-width="2.9" stroke-linecap="round"`);
    out += seg(mid, hand, 'stroke-width="1.35" stroke-linecap="round"');
    const jawA = [hand[0] + forward[0] * 2.1 * s, hand[1] + forward[1] * 2.1 * s, hand[2] + 1.0 * s];
    const jawB = [hand[0] + forward[0] * 2.1 * s, hand[1] + forward[1] * 2.1 * s, hand[2] - 1.0 * s];
    out += node(hand, 1.3, GLASS, BLUE);
    out += seg(hand, jawA, 'stroke-width="1.05"');
    out += seg(hand, jawB, 'stroke-width="1.05"');
  }
  return out;
}

function parcelBox(iso, x, y, z, { checked = false, agent = false } = {}) {
  const accent = agent ? BLUE : CORAL;
  let out = iso.box(x - 6.0, y - 5.0, 12.0, 10.0, 8.8, PAPER, PAPER, SHADE, z, `stroke="${accent}" stroke-width=".95"`);
  out += iso.surface(x - 3.8, y - 1.3, 7.6, 2.6, z + 8.86, accent, `stroke="none" fill-opacity="${agent ? '.28' : '.34'}"`);
  if (checked) {
    out += iso.planLine(
      [[x - 2.0, y + 2.0, z + 8.9], [x - .5, y + 3.4, z + 8.9], [x + 2.5, y + .6, z + 8.9]],
      `stroke="${accent}" stroke-width="1.2"`
    );
  }
  return out;
}

// ============================================================================
// CARD 1: 3D Isometric Conveyor Relay (Human Judgement -> Blue AI Agent)
// ============================================================================
const card1Projector = makeProjector({ originX: 280, originY: 162, centerX: 118, centerY: 88, angle: -14, scale: 1.82, pitch: 0.43 });
const card1Iso = isoPrimitives(card1Projector);
let card1StaticCache = '';

function card1StaticMarkup() {
  if (card1StaticCache) return card1StaticCache;
  const p = card1Projector;
  const { polygon, line, surface, panelY, box } = card1Iso;
  let s = '';

  s += surface(20, 38, 196, 102, 0, PAPER);
  s += polygon([p(20, 140, 0), p(216, 140, 0), p(216, 140, -4.5), p(20, 140, -4.5)], SHADE);
  s += polygon([p(216, 38, 0), p(216, 140, 0), p(216, 140, -4.5), p(216, 38, -4.5)], SHADE);
  s += surface(27, 45, 182, 88, .2, 'none', 'stroke-opacity=".18"');

  for (const lx of [30, 58, 82]) {
    for (const ly of [77, 94]) s += box(lx, ly, 2.2, 2.2, 12.5, PAPER, PAPER, SHADE, 0);
  }
  s += box(24, 74, 66, 24, 3.0, PAPER, PAPER, SHADE, 12.5);
  s += surface(26, 77, 62, 18, 15.6, SHADE, `stroke="${CORAL}" stroke-opacity=".55" stroke-width=".75"`);


  for (const lx of [150, 178, 204]) {
    for (const ly of [77, 94]) s += box(lx, ly, 2.2, 2.2, 12.5, PAPER, PAPER, SHADE, 0);
  }
  s += box(144, 74, 68, 24, 3.0, PAPER, PAPER, SHADE, 12.5);
  s += surface(146, 77, 64, 18, 15.6, GLASS, 'fill-opacity=".52" stroke-opacity=".68" stroke-width=".75"');

  s += panelY(182, 73, 15.5, 26, 22, GLASS, 'fill-opacity=".34" stroke-width=".85"');
  s += panelY(192, 73, 15.5, 26, 22, GLASS, 'fill-opacity=".22" stroke-width=".85"');
  s += surface(182, 73, 10, 26, 37.5, PAPER, 'stroke-width=".9"');
  s += line(p(187, 73, 37.5), p(187, 99, 37.5), 'stroke-opacity=".5"');


  card1StaticCache = s;
  return s;
}

const card1FrameCache = new Map();
const BELT_TOP = 15.8;
const PARCEL_Y = 86;
const BELT_SPEED = 48;
const CARRY_Z = 18.8;
const keyframes = (t, frames) => {
  for (let i = 0; i < frames.length - 1; i++) {
    const [t0, v0] = frames[i], [t1, v1] = frames[i + 1];
    if (t <= t1) return lerp(v0, v1, smooth((t - t0) / (t1 - t0 || 1)));
  }
  return frames.at(-1)[1];
};
const ahead = (x, y, heading, reach) => [x + Math.sin(heading) * reach, y + Math.cos(heading) * reach];

/**
 * A hand-to-hand relay, continuous around the loop:
 * 0.00-0.16 the person lifts a parcel off the incoming belt and turns with it;
 * 0.00-0.30 the agent walks over to meet them;
 * 0.38-0.48 the agent takes the parcel from the person's hands;
 * 0.48-0.72 the agent turns, carries it back and 0.72-0.82 sets it on the outgoing belt;
 * 0.86-1.00 the agent turns back as the person reaches for the next parcel.
 */
function card1DynamicMarkup(step) {
  if (card1FrameCache.has(step)) return card1FrameCache.get(step);
  const phase = (step % 80) / 80;
  const p = card1Projector;
  const { line } = card1Iso;
  let d = '';

  const beltShift = (phase * BELT_SPEED) % 12;
  for (let rx = 28 + beltShift; rx <= 86; rx += 12) {
    d += line(p(rx, 78, 15.75), p(rx, 94, 15.75), `stroke="${CORAL}" stroke-opacity=".35" stroke-width=".65"`);
  }
  for (let rx = 148 + beltShift; rx <= 208; rx += 12) {
    d += line(p(rx, 78, 15.75), p(rx, 94, 15.75), 'stroke-opacity=".35" stroke-width=".65"');
  }

  // The next parcel rides in, arriving at the end of the belt as the loop closes;
  // the previous one rides away on the outgoing belt.
  const incomingX = 83 - BELT_SPEED * (1 - phase);
  d += parcelBox(card1Iso, incomingX, PARCEL_Y, BELT_TOP);
  const placeAt = 150, placed = 0.82;
  d += parcelBox(card1Iso, placeAt + BELT_SPEED * (1 - placed) + BELT_SPEED * phase, PARCEL_Y, BELT_TOP, { checked: true, agent: true });

  // Person: lifts the parcel, turns and steps towards the agent, hands it over, turns back.
  const humanX = keyframes(phase, [[0, 94], [0.16, 94], [0.32, 103], [0.5, 103], [0.7, 95], [1, 94]]);
  const humanHeading = keyframes(phase, [[0, -Math.PI * 0.42], [0.1, -Math.PI * 0.42], [0.3, Math.PI * 0.42], [0.5, Math.PI * 0.42], [0.68, -Math.PI * 0.42], [1, -Math.PI * 0.42]]);
  const humanStride = Math.sin(Math.PI * clamp((phase - 0.16) / 0.16)) * 0.45 - Math.sin(Math.PI * clamp((phase - 0.5) / 0.2)) * 0.4;
  const humanLean = keyframes(phase, [[0, 1.2], [0.1, 0.8], [0.32, 0.9], [0.44, 1.2], [0.56, 0.7], [0.9, 0.9], [1, 1.2]]);
  const holding = keyframes(phase, [[0, 1], [0.42, 1], [0.5, 0], [0.9, 0], [1, 1]]);

  // Agent: walks over to the person, takes the parcel, turns and walks back to the outgoing belt.
  const robotX = keyframes(phase, [[0, 128], [0.32, 117.5], [0.5, 117.5], [0.72, 135], [0.86, 135], [1, 128]]);
  const robotHeading = keyframes(phase, [[0, -Math.PI * 0.46], [0.48, -Math.PI * 0.46], [0.6, Math.PI * 0.46], [0.86, Math.PI * 0.46], [1, -Math.PI * 0.46]]);
  const robotHold = keyframes(phase, [[0, 0], [0.38, 0], [0.44, 1], [0.8, 1], [0.86, 0], [1, 0]]);
  const robotStep = Math.abs(Math.sin(Math.PI * clamp(phase / 0.32))) + Math.abs(Math.sin(Math.PI * clamp((phase - 0.5) / 0.22)));

  // The parcel follows whoever holds it, from belt to hands to hands to belt.
  const humanCarry = [...ahead(humanX, 82, humanHeading, 6.5), lerp(BELT_TOP, CARRY_Z, smooth((phase - 0.04) / 0.12))];
  const robotCarry = [...ahead(robotX, 84, robotHeading, 6.5), CARRY_Z];
  let parcel;
  if (phase < 0.42) parcel = mix3([83, PARCEL_Y, BELT_TOP], humanCarry, smooth(phase / 0.1));
  else if (phase < 0.72) parcel = mix3(humanCarry, robotCarry, smooth((phase - 0.4) / 0.08));
  else if (phase < placed) parcel = mix3(robotCarry, [placeAt, PARCEL_Y, BELT_TOP], smooth((phase - 0.72) / 0.1));
  else parcel = [placeAt + BELT_SPEED * (phase - placed), PARCEL_Y, BELT_TOP];
  const boxStr = parcelBox(card1Iso, parcel[0], parcel[1], parcel[2], { checked: phase > 0.2, agent: phase > 0.5 });

  const s = 0.84;
  const right = [Math.cos(humanHeading), -Math.sin(humanHeading), 0];
  const forward = [Math.sin(humanHeading), Math.cos(humanHeading), 0];
  const restHand = side => [humanX + (right[0] * side * 5.0 + forward[0] * 0.8) * s, 82 + (right[1] * side * 5.0 + forward[1] * 0.8) * s, 16.8 * s];
  const gripAt = phase < 0.6 ? parcel : [incomingX, PARCEL_Y, BELT_TOP];
  const hand = side => mix3(restHand(side), add3([gripAt[0], gripAt[1], gripAt[2] + 4.4], mul3(right, side * 5.4)), holding);

  const robotRest = [...ahead(robotX, 84, robotHeading, 3.5), 13];
  const robotTarget = mix3(robotRest, [parcel[0], parcel[1], parcel[2] + 4.4], robotHold);

  // Whoever holds the parcel draws it between their body and their arms; once it is
  // set on the belt it sits in front of the agent.
  const holder = phase < 0.45 ? 'human' : phase < placed + 0.03 ? 'robot' : 'belt';
  d += human3DMarkup(p, {
    id: 'c1-human',
    x: humanX,
    y: 82,
    scale: s,
    heading: humanHeading,
    lean: humanLean,
    stride: humanStride,
    color: CORAL,
    leftTarget: hand(-1),
    rightTarget: hand(1),
    held: holder === 'human' ? boxStr : '',
  });
  d += robotMarkup(p, {
    x: robotX,
    y: 84 + Math.min(1, robotStep) * 0.3,
    scale: 0.82,
    heading: robotHeading,
    target: robotTarget,
    held: holder === 'robot' ? boxStr : '',
  });
  if (holder === 'belt') d += boxStr;

  card1FrameCache.set(step, d);
  return d;
}

// ============================================================================
// CARD 2: 3D Isometric Radcliffe Camera (researchers, blue) + Modern Office
//         (operators, coral), with a researcher and an operator working a
//         blueprint together at a table in the courtyard between them.
// ============================================================================
const card2Projector = makeProjector({ originX: 280, originY: 183, centerX: 79, centerY: 80, angle: -4, scale: 1.25, pitch: 0.44 });
const card2Iso = isoPrimitives(card2Projector);
const card2View = viewToward(-4);
let card2StaticCache = '';

// Buildings are drawn at their own detail and then enlarged about their centres,
// so they stand well above the people without redrawing every measurement.
const BUILDING_SCALE = 1.4;
// Heights get a little extra so both buildings read as tall, not squat.
const BUILDING_HEIGHT = 1.22;
const scaledAbout = (p, cx, cy, k, kz = k) => (x, y, z = 0) => p(cx + (x - cx) * k, cy + (y - cy) * k, z * kz);

// Radcliffe door faces the courtyard.
const RADCAM = { x: 34, y: 100, door: 15 };

/**
 * The Radcliffe Camera, tier by tier: plinth, rusticated arcade, the main storey of paired
 * columns with pedimented windows, balustrade with urns, windowed drum, ribbed dome and lantern.
 * Only faces turned towards the viewer are drawn, so the rotunda needs no depth sorting.
 */
function radcliffeCameraMarkup(p, iso) {
  const { polygon, line } = iso;
  const { x: cx, y: cy } = RADCAM;
  const at = (r, a, z) => p(cx + r * Math.cos(a), cy + r * Math.sin(a), z);
  const facing = a => Math.cos(a) * card2View[0] + Math.sin(a) * card2View[1];
  const tone = a => (Math.cos(a) * 0.8 - Math.sin(a) * 0.6 > 0.3 ? SHADE : PAPER);
  const faces = n => Array.from({ length: n }, (_, i) => {
    const a0 = (i * TAU) / n, a1 = ((i + 1) * TAU) / n;
    return { i, a0, a1, mid: (a0 + a1) / 2 };
  }).filter(f => facing(f.mid) > 0.02);
  // A point on a flat face: fraction t across it, at height z, sitting just proud of radius r.
  const on = (f, r, t, z) => p(cx + r * lerp(Math.cos(f.a0), Math.cos(f.a1), t), cy + r * lerp(Math.sin(f.a0), Math.sin(f.a1), t), z);
  const band = (r0, r1, z0, z1, { n = 16, fill, extra = '', decorate } = {}) => faces(n).map(f =>
    polygon([at(r0, f.a0, z0), at(r0, f.a1, z0), at(r1, f.a1, z1), at(r1, f.a0, z1)], fill || tone(f.mid), extra) + (decorate ? decorate(f) : '')
  ).join('');
  const cap = (r, z, n = 16, fill = PAPER, extra = '') => polygon(Array.from({ length: n }, (_, i) => at(r, (i * TAU) / n, z)), fill, extra);
  const arch = (f, r, t0, t1, z0, spring, rise, fill, extra) => {
    const pts = [on(f, r, t0, z0)];
    for (let k = 0; k <= 8; k++) pts.push(on(f, r, lerp(t0, t1, k / 8), spring + rise * Math.sin((Math.PI * k) / 8)));
    pts.push(on(f, r, t1, z0));
    return polygon(pts, fill, extra);
  };
  let out = '';

  // Plinth and rusticated ground storey with its arcade.
  out += band(28, 28, 0, 1.6, { extra: 'stroke-width=".8"' }) + cap(28, 1.6);
  out += band(26, 26, 1.6, 14, {
    extra: 'stroke-width=".85"',
    decorate: f => {
      let d = '';
      for (const z of [5.4, 9.6]) d += line(on(f, 26.1, 0, z), on(f, 26.1, 1, z), 'stroke-width=".5" stroke-opacity=".45"');
      if (f.i === RADCAM.door) return d + arch(f, 26.15, .26, .74, 1.6, 8.6, 3.2, GLASS, `fill-opacity=".9" stroke="${CORAL}" stroke-width="1.0"`);
      return d + (f.i % 2
        ? arch(f, 26.15, .36, .64, 4.2, 9.0, 1.8, SHADE, 'stroke-width=".6"')
        : arch(f, 26.15, .26, .74, 1.6, 8.6, 3.2, GLASS, 'fill-opacity=".55" stroke-width=".7"'));
    },
  });
  out += band(26.8, 26.8, 14, 15.4, { extra: 'stroke-width=".75"' }) + cap(26.8, 15.4);

  // Main storey: paired columns at every angle, pedimented windows alternating with niches.
  out += band(24.6, 24.6, 15.4, 29.4, {
    extra: 'stroke-width=".85"',
    decorate: f => {
      let d = '';
      for (const t of [.05, .13, .87, .95]) d += line(on(f, 24.75, t, 15.6), on(f, 24.75, t, 29.2), 'stroke-width=".7"');
      for (const t of [.09, .91]) d += line(on(f, 24.8, t - .06, 28.4), on(f, 24.8, t + .06, 28.4), 'stroke-width=".7"');
      if (f.i % 2 === 0) {
        d += polygon([on(f, 24.8, .33, 18.0), on(f, 24.8, .67, 18.0), on(f, 24.8, .67, 25.2), on(f, 24.8, .33, 25.2)], GLASS, 'fill-opacity=".7" stroke-width=".65"');
        d += polygon([on(f, 24.9, .3, 25.8), on(f, 24.9, .7, 25.8), on(f, 24.9, .5, 27.4)], PAPER, 'stroke-width=".65"');
      } else {
        d += arch(f, 24.8, .4, .6, 18.6, 23.6, 1.4, 'none', 'stroke-width=".55" stroke-opacity=".7"');
      }
      return d;
    },
  });

  // Entablature, then the balustrade with urns over each pair of columns.
  out += band(25.8, 25.8, 29.4, 31.4, { extra: 'stroke-width=".8"' }) + cap(25.8, 31.4);
  out += band(24.8, 24.8, 31.4, 34.0, {
    extra: 'stroke-width=".7"',
    decorate: f => [.2, .35, .5, .65, .8].map(t => line(on(f, 24.9, t, 31.8), on(f, 24.9, t, 33.6), 'stroke-width=".45" stroke-opacity=".6"')).join(''),
  }) + cap(24.8, 34.0);
  for (let i = 0; i < 16; i++) {
    const a = (i * TAU) / 16;
    if (facing(a) <= 0.05) continue;
    const [ux, uy] = at(24.6, a, 35.1);
    out += `<ellipse cx="${number(ux)}" cy="${number(uy)}" rx="1.25" ry="1.6" fill="${PAPER}" stroke-width=".7"/>`;
  }

  // Drum with small windows and buttresses, its cornice, then the ribbed dome.
  out += band(19.2, 19.2, 34.0, 41.6, {
    extra: 'stroke-width=".75"',
    decorate: f => line(on(f, 19.3, 0, 34.2), on(f, 19.3, 0, 41.4), 'stroke-width=".8"') +
      (f.i % 2 === 0 ? polygon([on(f, 19.3, .36, 36.0), on(f, 19.3, .64, 36.0), on(f, 19.3, .64, 39.6), on(f, 19.3, .36, 39.6)], GLASS, 'fill-opacity=".65" stroke-width=".55"') : ''),
  });
  out += band(20.2, 20.2, 41.6, 43.0, { extra: 'stroke-width=".75"' }) + cap(20.2, 43.0);
  const profile = [0, 16, 32, 48, 62, 76].map(deg => {
    const t = deg * Math.PI / 180;
    return [19.2 * Math.cos(t), 43 + 15.2 * Math.sin(t)];
  });
  for (let k = 0; k < profile.length - 1; k++) {
    out += band(profile[k][0], profile[k + 1][0], profile[k][1], profile[k + 1][1], { extra: 'stroke-width=".55" stroke-opacity=".55"' });
  }
  for (let i = 0; i < 16; i++) {
    const a = (i * TAU) / 16;
    if (facing(a) <= 0.05) continue;
    out += `<path d="M${profile.map(([r, z]) => pair(at(r, a, z))).join(' L')}" fill="none" stroke-width=".8"/>`;
  }
  const top = profile.at(-1);
  out += cap(top[0], top[1]);

  // Lantern: open colonnade, cap, small dome and finial.
  out += band(5.0, 5.0, top[1], top[1] + 1.2, { n: 8, extra: 'stroke-width=".7"' });
  out += band(4.2, 4.2, top[1] + 1.2, top[1] + 6.4, {
    n: 8,
    fill: GLASS,
    extra: 'fill-opacity=".6" stroke-width=".6"',
    decorate: f => line(on(f, 4.3, 0, top[1] + 1.2), on(f, 4.3, 0, top[1] + 6.4), 'stroke-width=".9"'),
  });
  out += band(5.0, 5.0, top[1] + 6.4, top[1] + 7.4, { n: 8, extra: 'stroke-width=".7"' }) + cap(5.0, top[1] + 7.4, 8);
  out += band(4.4, 2.6, top[1] + 7.4, top[1] + 9.4, { n: 8, extra: 'stroke-width=".6"' });
  out += band(2.6, 0.6, top[1] + 9.4, top[1] + 10.8, { n: 8, extra: 'stroke-width=".6"' });
  out += line(at(0, 0, top[1] + 10.8), at(0, 0, top[1] + 14.6), 'stroke-width="1.0"');
  const [fx, fy] = at(0, 0, top[1] + 14.9);
  out += `<circle cx="${number(fx)}" cy="${number(fy)}" r=".9" fill="${PAPER}" stroke-width=".7"/>`;
  return out;
}


/**
 * Modern office in the operators' coral: glazed lobby behind slim columns with a
 * blue-framed entrance and canopy, four floors of ribbon glazing over solid spandrels,
 * a parapet and a louvred plant room.
 */
const OFFICE = { x: 106, y: 20, w: 44, d: 40, lobby: 10, floor: 9.5, floors: 4 };
const OFFICE_GLASS = '#F7DDD6';
const OFFICE_SHADE = '#EFE4E0';

function officeBuildingMarkup(p, iso) {
  const { surface, panelX, panelY, box, line } = iso;
  const { x: ox, y: oy, w, d, lobby, floor, floors } = OFFICE;
  const GLASS = OFFICE_GLASS, SHADE = OFFICE_SHADE;
  const top = lobby + floor * floors;
  const fy = oy + d, fx = ox + w;
  let out = '';

  // Lobby: glass box set back behind columns.
  out += box(ox + 2, oy + 2, w - 4, d - 4, lobby, PAPER, GLASS, GLASS, 0, 'fill-opacity=".75" stroke-width=".8"');
  for (let x = ox + 7.4; x < fx - 3; x += 7.4) out += line(p(x, fy - 1.9, 0), p(x, fy - 1.9, lobby), 'stroke-width=".5" stroke-opacity=".6"');
  for (let y = oy + 8; y < fy - 3; y += 8) out += line(p(fx - 1.9, y, 0), p(fx - 1.9, y, lobby), 'stroke-width=".5" stroke-opacity=".6"');
  out += panelX(ox + 18, fy - 1.85, 0, 8, 7.4, GLASS, `fill-opacity=".95" stroke="${BLUE}" stroke-width=".95"`);
  out += line(p(ox + 22, fy - 1.8, 0), p(ox + 22, fy - 1.8, 7.4), `stroke="${BLUE}" stroke-width=".7"`);
  for (const x of [ox, ox + 11, ox + 22, ox + 33, fx - 1.6]) out += box(x, fy - 1.6, 1.6, 1.6, lobby, PAPER, PAPER, SHADE, 0, 'stroke-width=".75"');
  for (const y of [oy, oy + 13, oy + 26]) out += box(fx - 1.6, y, 1.6, 1.6, lobby, PAPER, PAPER, SHADE, 0, 'stroke-width=".75"');

  // Office floors: solid mass, then ribbon glazing with mullions and a glint on each face.
  out += box(ox, oy, w, d, floor * floors, PAPER, PAPER, SHADE, lobby, 'stroke-width=".9"');
  for (let k = 0; k < floors; k++) {
    const z0 = lobby + k * floor + 2.0, h = floor - 3.6;
    out += panelX(ox + 1.4, fy + .05, z0, w - 2.8, h, GLASS, 'fill-opacity=".8" stroke-width=".65"');
    out += panelY(fx + .05, oy + 1.4, z0, d - 2.8, h, GLASS, 'fill-opacity=".65" stroke-width=".65"');
    for (let x = ox + 1.4 + 4.75; x < fx - 1.5; x += 4.75) out += line(p(x, fy + .1, z0), p(x, fy + .1, z0 + h), 'stroke-width=".45" stroke-opacity=".7"');
    for (let y = oy + 1.4 + 4.6; y < fy - 1.5; y += 4.6) out += line(p(fx + .1, y, z0), p(fx + .1, y, z0 + h), 'stroke-width=".45" stroke-opacity=".7"');
    out += line(p(ox + 6 + k * 3, fy + .12, z0 + .8), p(ox + 11 + k * 3, fy + .12, z0 + h - .8), `stroke="${PAPER}" stroke-width=".9" stroke-opacity=".8"`);
  }
  for (let k = 1; k < floors; k++) {
    const z = lobby + k * floor;
    out += line(p(ox, fy, z), p(fx, fy, z), 'stroke-width=".6"') + line(p(fx, oy, z), p(fx, fy, z), 'stroke-width=".6"');
  }

  // Canopy over the entrance.
  out += box(ox + 15, fy - 1, 14, 6, 0.9, PAPER, PAPER, SHADE, lobby - 1.4, `stroke="${BLUE}" stroke-width=".9"`);

  // Parapet, roof deck, plant room with louvres and a blue roof light.
  out += box(ox, oy, w, d, 1.6, PAPER, PAPER, SHADE, top, 'stroke-width=".85"');
  out += surface(ox + 1.4, oy + 1.4, w - 2.8, d - 2.8, top + 1.0, SHADE, 'stroke-width=".55"');
  out += box(ox + 8, oy + 6, 18, 14, 6.5, PAPER, PAPER, SHADE, top + 1.0, 'stroke-width=".8"');
  for (let z = top + 2.6; z < top + 7; z += 1.2) out += line(p(ox + 9.5, oy + 20.05, z), p(ox + 24.5, oy + 20.05, z), 'stroke-width=".45" stroke-opacity=".7"');
  out += surface(ox + 30, oy + 22, 8, 10, top + 1.1, GLASS, `stroke="${BLUE}" stroke-width=".9"`);
  return `<g stroke="${CORAL}">${out}</g>`;
}

function card2StaticMarkup() {
  if (card2StaticCache) return card2StaticCache;
  const p = card2Projector;
  const { polygon, surface } = card2Iso;
  let s = '';

  s += surface(-14, 0, 186, 160, 0, PAPER);
  s += polygon([p(-14, 160, 0), p(172, 160, 0), p(172, 160, -4.5), p(-14, 160, -4.5)], SHADE);
  s += polygon([p(172, 0, 0), p(172, 160, 0), p(172, 160, -4.5), p(172, 0, -4.5)], SHADE);
  s += surface(-7, 7, 172, 146, .2, 'none', 'stroke-opacity=".18"');

  const rp = scaledAbout(p, RADCAM.x, RADCAM.y, BUILDING_SCALE, BUILDING_SCALE * BUILDING_HEIGHT);
  s += radcliffeCameraMarkup(rp, isoPrimitives(rp));
  const ocx = OFFICE.x + OFFICE.w / 2, ocy = OFFICE.y + OFFICE.d / 2;
  const op = scaledAbout(p, ocx, ocy, BUILDING_SCALE, BUILDING_SCALE * BUILDING_HEIGHT);
  s += officeBuildingMarkup(op, isoPrimitives(op));

  card2StaticCache = s;
  return s;
}

// The table in the courtyard: a plan laid out with a note from each side on it.
const PLAN_TABLE = { x: 110, y: 116, w: 15, d: 34, h: 16 };
const TABLE_TOP = PLAN_TABLE.h + 1.85;
const PLAN = { x: 111.6, y: 118, w: 11.8, d: 30, z: TABLE_TOP };
let planTableCache = '';

// Split a figure at its held layer, so someone behind the table has their body
// behind it and their hands and head over it.
const HELD = '<!--held-->';
const figureLayers = markup => {
  const [back, front] = markup.split(HELD);
  return [`${back}</g>`, `<g>${front}`];
};

function planTableMarkup() {
  if (planTableCache) return planTableCache;
  const { box, surface, line } = card2Iso;
  const p = card2Projector;
  const { x, y, w, d, h } = PLAN_TABLE;
  const { x: px, y: py, w: pw, d: pd, z } = PLAN;
  let s = '';
  for (const [dx, dy] of [[2, 2], [w - 3.8, 2], [2, d - 3.8], [w - 3.8, d - 3.8]]) s += box(x + dx, y + dy, 1.8, 1.8, h, PAPER, PAPER, SHADE, 0);
  s += box(x, y, w, d, 1.8, PAPER, PAPER, SHADE, h);
  s += surface(px, py, pw, pd, z, '#E3EAFB', 'stroke-width=".8"');
  for (let gx = px + 3; gx < px + pw; gx += 3) s += line(p(gx, py, z + .02), p(gx, py + pd, z + .02), 'stroke-width=".3" stroke-opacity=".3"');
  for (let gy = py + 3; gy < py + pd; gy += 3) s += line(p(px, gy, z + .02), p(px + pw, gy, z + .02), 'stroke-width=".3" stroke-opacity=".3"');
  s += surface(px + 2, py + 2, pw - 4, pd - 4, z + .04, 'none', 'stroke-width=".9"');
  s += line(p(px + 2, py + 11, z + .05), p(px + pw - 2, py + 11, z + .05), 'stroke-width=".7"');
  s += line(p(px + 6, py + 11, z + .05), p(px + 6, py + pd - 2, z + .05), 'stroke-width=".7"');
  s += line(p(px + 6, py + 20, z + .05), p(px + pw - 2, py + 20, z + .05), 'stroke-width=".7"');
  planTableCache = s;
  return s;
}

// A form held upright between two hands, facing the way the holder faces.
function formMarkup(p, centre, heading, colour, scale = 0.66) {
  const { right, forward } = bodyFrame(0, 0, heading);
  const c = (u, v, h) => p(...add3(centre, add3(mul3(right, u * scale), add3(mul3(forward, v * scale), [0, 0, h * scale]))));
  const sheet = [c(-3.2, 0, -2.6), c(3.2, 0, -2.6), c(3.2, 1.4, 2.8), c(-3.2, 1.4, 2.8)];
  let out = `<polygon points="${points(sheet)}" fill="${PAPER}" stroke="${colour}" stroke-width=".85"/>`;
  out += `<path d="M${pair(c(-2.2, .9, 1.6))} L${pair(c(2.2, .9, 1.6))} M${pair(c(-2.2, .6, .3))} L${pair(c(1.2, .6, .3))}" fill="none" stroke="${colour}" stroke-width=".55" stroke-opacity=".7"/>`;
  return out;
}

/**
 * Midway between the buildings a researcher and an operator walk out from their doors,
 * meet, hand each other a form, and walk home with the other's paperwork.
 */
function exchangeMarkup(p, phase) {
  const R = { id: 'c2-res-walk', colour: BLUE, home: [73, 92], meet: [97, 79] };
  const O = { id: 'c2-op-walk', colour: CORAL, home: [127, 72], meet: [106, 73.5] };
  const walkOut = smooth((phase - 0.04) / 0.3);
  const reach = smooth((phase - 0.36) / 0.08) * (1 - smooth((phase - 0.56) / 0.08));
  const swapped = phase > 0.46 && phase < 0.98;
  const turned = smooth((phase - 0.62) / 0.08) * (1 - smooth((phase - 0.96) / 0.04));
  const walkBack = smooth((phase - 0.68) / 0.27);
  const moving = Math.sin(Math.PI * clamp((phase - 0.04) / 0.3)) + Math.sin(Math.PI * clamp((phase - 0.68) / 0.27));
  const along = walkOut * (1 - walkBack);
  const place = who => [lerp(who.home[0], who.meet[0], along), lerp(who.home[1], who.meet[1], along)];
  const rPos = place(R), oPos = place(O);
  const mid = [(rPos[0] + oPos[0]) / 2, (rPos[1] + oPos[1]) / 2];
  let out = '';
  for (const [who, pos, other] of [[R, rPos, O], [O, oPos, R]]) {
    const outward = Math.atan2(who.meet[0] - who.home[0], who.meet[1] - who.home[1]);
    // At the meeting point each turns to face the other before the handover.
    const toOther = Math.atan2(mid[0] - pos[0], mid[1] - pos[1]);
    const facing = lerp(outward, outward + Math.atan2(Math.sin(toOther - outward), Math.cos(toOther - outward)), smooth((phase - 0.32) / 0.06) * (1 - turned));
    const heading = facing + Math.PI * turned;
    const frame = bodyFrame(pos[0], pos[1], heading);
    const carrying = frame.local(0, 4.2, 17.2);
    const held = [lerp(carrying[0], mid[0], reach * 0.78), lerp(carrying[1], mid[1], reach * 0.78), lerp(17.2, 19.2, reach)];
    out += human3DMarkup(p, {
      id: who.id,
      x: pos[0],
      y: pos[1],
      scale: 0.66,
      heading,
      lean: 0.6 + reach * 0.5,
      stride: Math.sin(phase * TAU * 6) * 0.7 * Math.min(1, moving),
      color: who.colour,
      leftTarget: add3(held, mul3(frame.right, -2.0)),
      rightTarget: add3(held, mul3(frame.right, 2.0)),
    });
    out += formMarkup(p, held, heading, swapped ? other.colour : who.colour);
  }
  return out;
}

const card2FrameCache = new Map();
function card2DynamicMarkup(step) {
  if (card2FrameCache.has(step)) return card2FrameCache.get(step);
  const phase = (step % 80) / 80;
  const p = card2Projector;
  const { ruledNote } = card2Iso;
  const top = TABLE_TOP + .1;
  const cy = PLAN_TABLE.y + PLAN_TABLE.d / 2;

  // Two notes on the plan, one near each of them. Mid-discussion the operator slides theirs across.
  const slide = smooth((phase - 0.3) / 0.12) * (1 - smooth((phase - 0.82) / 0.12));
  const noteA = [112.2, 121.5];
  const noteB = [lerp(116.8, 114.6, slide), lerp(139, 131, slide)];
  const notes = ruledNote(noteA[0], noteA[1], 7.2, 5.6, top, BLUE, false) + ruledNote(noteB[0], noteB[1], 7.2, 5.6, top + .05, CORAL, true);
  const noteCentre = ([x, y]) => [x + 3.6, y + 2.8];

  // They face each other across the long sides and take turns: first the researcher taps a
  // line on the operator's note while the operator follows it; then the operator taps the
  // researcher's note while the researcher stands back a little, hand at the chin.
  const researcherTurn = phase < 0.5;
  const u = (phase % 0.5) / 0.5;
  const tap = Math.max(0, Math.sin(u * TAU * 3)) * 1.4 * smooth(u / 0.15) * (1 - smooth((u - 0.85) / 0.15));
  const bCentre = noteCentre(noteB), aCentre = noteCentre(noteA);
  const backX = PLAN_TABLE.x - 4.6, frontX = PLAN_TABLE.x + PLAN_TABLE.w + 4.6;
  const rY = 127, oY = 139;

  const rFrame = bodyFrame(backX, rY, Math.PI / 2);
  const researcher = human3DMarkup(p, {
    id: 'c2-researcher',
    x: backX,
    y: rY,
    scale: 0.72,
    heading: Math.PI / 2 + (researcherTurn ? 0.14 : -0.04),
    lean: researcherTurn ? 1.5 : 0.7,
    color: BLUE,
    leftTarget: [PLAN_TABLE.x + 1.2, rY + 4.4, top + .4],
    rightTarget: researcherTurn ? [bCentre[0] - .4, bCentre[1] - .8, top + .7 + tap] : rFrame.local(0.9, 3.0, 25.2),
    held: HELD,
  });

  const operator = human3DMarkup(p, {
    id: 'c2-operator',
    x: frontX,
    y: oY,
    scale: 0.72,
    heading: -Math.PI / 2 + (researcherTurn ? 0.04 : -0.14),
    lean: researcherTurn ? 1.1 : 1.5,
    color: CORAL,
    leftTarget: [PLAN_TABLE.x + PLAN_TABLE.w - 1.2, oY - 4.4, top + .4],
    rightTarget: researcherTurn ? [bCentre[0] + 2.4, bCentre[1] + 1.6, top + .5] : [aCentre[0] + .4, aCentre[1] + .8, top + .7 + tap],
  });

  const [researcherBack, researcherFront] = figureLayers(researcher);
  const markup = exchangeMarkup(p, phase) + researcherBack + planTableMarkup() + notes + researcherFront + operator;
  card2FrameCache.set(step, markup);
  return markup;
}

// ============================================================================
// REDESIGNERS STAGE: "koralli is for the redesigners."
// A fish's diving exosuit, broken down and sat on a maintenance crate, built from the
// same rounded capsule forms as the people so the suit and its makers read as one family:
// - Cracked glass dome, water-filled, with the coral fish still inside
// - Researcher with a clipboard, scratching their head
// - Welder at the open shoulder socket, the dead arm hanging beside them
// - Engineer standing back, hand at the chin, thinking it over
// ============================================================================
const mechProjector = makeProjector({ originX: 290, originY: 168, centerX: 98, centerY: 86, angle: -10, scale: 1.82, pitch: 0.43 });
const mechIso = isoPrimitives(mechProjector, { paper: DEEP_BG, shade: DEEP_SHADE });
const MECH_FILL = '#14295A';
const MECH_LIT = '#1C3A78';

const mechView = viewToward(-10);
const mechFrame = (x, y, heading) => bodyFrame(x, y, heading);
const MECH = mechFrame(98, 80, 0.32);
// +1 when the suit's right side faces the viewer.
const MECH_NEAR = Math.sign(dot3(MECH.right, mechView));
const MECH_STYLE = { fill: MECH_FILL, stroke: DEEP_LINE };

const mechCapsule = (a, rA, b, rB, opts) => capsule(mechProjector, a, rA, b, rB, { ...MECH_STYLE, ...opts });
const mechBall = (c, r, opts) => ball(mechProjector, c, r, { ...MECH_STYLE, ...opts });
const mechShell = (rings, opts) => shell(mechProjector, MECH, rings, { ...MECH_STYLE, ...opts });
const mechVisibleArc = (h, uRad, vRad, vOff, extra) => visibleArc(mechProjector, MECH, mechView, h, uRad, vRad, vOff, extra);

// The suit sits slumped on a maintenance crate, so every height is measured from the deck.
const SEAT = 11;
const SLUMP = 0.2;
const TORSO_RINGS = [[16.5, 7.6, 5.6], [21.5, 10.0, 6.8], [28.0, 10.8, 7.3], [33.5, 9.8, 6.8], [36.6, 7.4, 5.4]]
  .map(([h, u, v]) => [h, u, v, (h - 16.5) * SLUMP]);
const lean = h => (h - 16.5) * SLUMP;

// Shoulder, elbow and wrist positions are given directly: the arms are posed, not reaching.
function mechArmMarkup(shoulder, elbow, hand, grip) {
  const dir = unit3(sub3(hand, elbow));
  let up = sub3([0, 0, 1], mul3(dir, dir[2]));
  up = len3(up) < 0.2 ? MECH.forward : unit3(up);
  let out = '';
  out += mechCapsule(shoulder, 2.5, elbow, 2.4);
  out += mechBall(elbow, 3.0, { fill: MECH_LIT });
  out += mechCapsule(add3(elbow, mul3(dir, 1.6)), 2.6, add3(hand, mul3(dir, -1.2)), 3.3);
  out += mechCapsule(add3(hand, mul3(dir, -1.4)), 3.4, hand, 3.4, { stroke: CORAL, width: 1.05 });
  for (const jaw of [1, -1]) {
    const base = add3(hand, mul3(dir, 1.2));
    const knuckle = add3(add3(hand, mul3(dir, 4.8)), mul3(up, jaw * (1.2 + grip * 2.0)));
    const tip = add3(add3(hand, mul3(dir, 8.2)), mul3(up, jaw * (0.3 + grip * 1.1)));
    out += mechCapsule(base, 1.35, knuckle, 1.2);
    out += mechCapsule(knuckle, 1.2, tip, 0.75);
  }
  return out;
}

// Seated leg: thigh forward along the crate, shin down to a fin flat on the deck.
function mechLegMarkup(side) {
  const { local } = MECH;
  const u = side * 6.2;
  const hip = local(u, 0.5, SEAT + 3.2);
  const knee = local(u + side * 0.8, 12.5, SEAT + 3.6);
  const ankle = local(u + side * 1.2, 15.5, 3.4);
  const toe = local(u + side * 1.3, 18.6, 2.0);
  let out = '';
  const fin = [[-2.6, 15.6], [2.6, 15.6], [4.6, 27.4], [1.4, 25.2], [0, 26.6], [-1.4, 25.2], [-4.6, 27.4]]
    .map(([du, v]) => mechProjector(...local(u + side * 1.3 + du, v, 0.5)));
  out += `<polygon points="${points(fin)}" fill="${AQUA}" fill-opacity=".16" stroke="${AQUA}" stroke-width=".9"/>`;
  out += mechCapsule(ankle, 2.6, toe, 2.3);
  out += mechCapsule(knee, 3.0, ankle, 2.5);
  out += mechCapsule(hip, 3.5, knee, 3.1);
  out += mechBall(add3(knee, mul3(MECH.forward, 1.6)), 2.5, { fill: MECH_LIT });
  const [kx, ky] = mechProjector(...add3(knee, add3(mul3(MECH.forward, 3.6), [0, 0, 0.4])));
  out += `<circle cx="${number(kx)}" cy="${number(ky)}" r="1.2" fill="${CORAL}" stroke="none"/>`;
  return out;
}

let mechBackCache = '';
let mechBodyCache = '';

// Deck, console and gas bottles: everything the thinking engineer can stand in front of.
function mechBackMarkup() {
  if (mechBackCache) return mechBackCache;
  const p = mechProjector;
  const { polygon, line, planLine, surface, panelX, box } = mechIso;
  const { local } = MECH;
  let s = '';

  s += surface(16, 36, 168, 100, 0, DEEP_BG);
  s += polygon([p(16, 136, 0), p(184, 136, 0), p(184, 136, -4.5), p(16, 136, -4.5)], DEEP_SHADE);
  s += polygon([p(184, 36, 0), p(184, 136, 0), p(184, 136, -4.5), p(184, 36, -4.5)], DEEP_SHADE);
  s += surface(23, 43, 154, 86, .2, 'none', 'stroke-opacity=".24"');

  // Back-left telemetry console, showing a fault trace.
  s += box(24, 44, 14, 14, 18, DEEP_BG, DEEP_BG, DEEP_SHADE, 0);
  s += panelX(26, 58.2, 4, 10, 10, DEEP_GLASS, 'fill-opacity=".65" stroke-width=".75"');
  s += planLine([[28, 58.3, 9], [29.5, 58.3, 9], [30.5, 58.3, 12], [31.5, 58.3, 6.5], [32.5, 58.3, 9], [34, 58.3, 9]], `stroke="${CORAL}" stroke-width=".85"`);
  s += line(p(28, 58.3, 6), p(32, 58.3, 6), `stroke="${AQUA}" stroke-width=".85"`);

  s += planLine([[38, 54, .3], [62, 66, .3], [84, 74, .3]], 'stroke-dasharray="3 3" stroke-opacity=".48"');

  // Welding gas bottles behind the welder; the hose to the torch is drawn with the welder.
  for (const [i, colour] of [CORAL, DEEP_LINE].entries()) {
    const base = local(MECH_NEAR * (26.5 + i * 4.6), -4.5 - i * 1.4, 0);
    s += mechCapsule(add3(base, [0, 0, 2.6]), 2.5, add3(base, [0, 0, 13.0]), 2.5);
    s += mechCapsule(add3(base, [0, 0, 13.6]), 1.2, add3(base, [0, 0, 15.6]), 0.9, { stroke: colour, width: 1.0 });
  }

  mechBackCache = s;
  return s;
}

// The crate and every fixed part of the slumped suit.
function mechBodyMarkup() {
  if (mechBodyCache) return mechBodyCache;
  const p = mechProjector;
  const { panelX, box } = mechIso;
  const { local } = MECH;
  const near = MECH_NEAR, far = -MECH_NEAR;
  let s = '';

  // Maintenance crate the suit has been sat down on.
  s += box(88, 70, 21, 15, SEAT, DEEP_BG, DEEP_BG, DEEP_SHADE, 0);
  s += panelX(91, 85.1, 3.5, 15, 2.2, CORAL, 'fill-opacity=".5" stroke="none"');

  // Thruster tanks, far shoulder and the far arm resting on its knee.
  for (const side of [far, near]) {
    s += mechCapsule(local(side * 4.4, -7.4 + lean(18), 18), 3.1, local(side * 4.4, -7.4 + lean(34), 34), 3.1);
    s += mechCapsule(local(side * 4.4, -7.4, 15.4), 2.2, local(side * 4.4, -7.4, 17.0), 2.6, { stroke: AQUA, width: .9 });
  }
  const farShoulder = local(far * 12.0, lean(31.5), 31.5);
  s += mechBall(add3(farShoulder, [0, 0, 0.8]), 4.3);
  // Powered down: it hangs straight from the shoulder, claw resting on the deck beside the crate.
  s += mechArmMarkup(farShoulder, local(far * 13.8, -0.5, 21.5), local(far * 13.2, 1.5, 10.0), 0.3);

  s += mechLegMarkup(far);
  s += mechLegMarkup(near);

  s += mechShell([[SEAT + 0.6, 6.8, 4.8], [SEAT + 3.8, 7.8, 5.4], [SEAT + 6.2, 7.0, 5.0]]);
  s += mechShell(TORSO_RINGS);

  // Hull detailing: seams, coral depth stripe and lamps.
  s += mechVisibleArc(18.8, 8.6, 6.1, lean(18.8), `stroke="${DEEP_LINE}" stroke-width=".7" stroke-opacity=".7"`);
  s += mechVisibleArc(24.2, 10.45, 7.05, lean(24.2), `stroke="${CORAL}" stroke-width="1.6"`);
  s += mechVisibleArc(32.2, 10.15, 7.0, lean(32.2), `stroke="${DEEP_LINE}" stroke-width=".7" stroke-opacity=".7"`);
  for (const side of [-1, 1]) {
    s += mechBall(local(side * 6.2, 6.2 + lean(34.4), 34.4), 1.25, { fill: DEEP_SHADE, stroke: DEEP_LINE, width: .7 });
  }

  // Open service hatch on the chest: wiring spilling out, door swung wide.
  const front = h => 7.1 + lean(h);
  const hatch = [[-1.0, 21.4], [5.6, 21.4], [5.6, 29.0], [-1.0, 29.0]].map(([u, h]) => p(...local(u, front(h) + 0.3, h)));
  s += `<polygon points="${points(hatch)}" fill="${DEEP_BG}" stroke="${DEEP_LINE}" stroke-width=".9"/>`;
  const wire = (pts, colour) => `<path d="M${pts.map(([u, h, dv]) => pair(p(...local(u, front(h) + 0.4 + dv, h)))).join(' L')}" fill="none" stroke="${colour}" stroke-width=".95"/>`;
  s += wire([[0.4, 27.5, 0], [1.4, 25.0, 1.2], [0.9, 22.0, 2.6], [1.8, 19.4, 3.6]], CORAL);
  s += wire([[2.6, 27.8, 0], [3.4, 25.6, 1.0], [4.4, 23.8, 2.2], [3.6, 21.0, 3.4]], AQUA);
  s += wire([[4.4, 26.4, 0], [5.0, 24.6, 0.8], [6.8, 23.6, 1.6]], DEEP_LINE);
  const swing = 0.6;
  const door = [[21.4, 0], [29.0, 0], [29.0, 6.6], [21.4, 6.6]].map(([h, w]) => p(...local(5.6 + Math.cos(swing) * w, front(h) + 0.3 + Math.sin(swing) * w, h)));
  s += `<polygon points="${points(door)}" fill="${MECH_LIT}" stroke="${DEEP_LINE}" stroke-width=".9"/>`;

  // Collar that seats the dome.
  const collar = (h, r) => Array.from({ length: 28 }, (_, i) => p(...local(r * Math.cos((TAU * i) / 28), 0.6 + lean(h) + r * Math.sin((TAU * i) / 28), h)));
  s += `<polygon points="${points(collar(36.8, 7.9))}" fill="${MECH_LIT}" stroke="${CORAL}" stroke-width="1.15"/>`;
  s += `<polygon points="${points(collar(37.8, 7.0))}" fill="${MECH_FILL}" stroke="${CORAL}" stroke-width=".8"/>`;

  // Near side: the arm has been taken off for repair. It lies flat on the deck in front,
  // its shoulder pad beside it, while a loose cable hangs from the open socket.
  const padAt = local(near * 5.0, 34.0, 0);
  const pad = bodyFrame(padAt[0], padAt[1], 1.1);
  s += shell(p, pad, [[0.3, 5.0, 4.4], [2.4, 4.4, 3.9], [4.0, 2.8, 2.5], [4.6, 1.2, 1.1]], MECH_STYLE);
  s += visibleArc(p, pad, mechView, 0.6, 5.0, 4.4, 0, `stroke="${CORAL}" stroke-width="1.0"`);
  const socket = local(near * 11.4, lean(31.5), 31.5);
  const [sx, sy] = p(...socket);
  s += `<circle cx="${number(sx)}" cy="${number(sy)}" r="3.6" fill="${DEEP_BG}" stroke="${CORAL}" stroke-width="1.0"/>`;
  const cable = [socket, local(near * 14.0, 2.5, 18.0), local(near * 14.5, 4.0, 0.5)].map(pt => p(...pt));
  s += `<path d="M${pair(cable[0])} Q${pair(cable[1])} ${pair(cable[2])}" fill="none" stroke="${AQUA}" stroke-width=".9"/>`;
  s += mechArmMarkup(local(near * 16.0, 19.0, 2.6), local(near * 21.0, 26.0, 2.5), local(near * 18.0, 35.0, 3.3), 0.2);
  for (const [u, v] of [[11, 26], [25, 31], [13, 30]]) {
    const [bx, by] = p(...local(near * u, v, 0.4));
    s += `<circle cx="${number(bx)}" cy="${number(by)}" r="1.1" fill="${DEEP_SHADE}" stroke="${DEEP_LINE}" stroke-width=".6"/>`;
  }

  mechBodyCache = s;
  return s;
}

function mechDomeMarkup(phase) {
  const p = mechProjector;
  const centre = MECH.local(0, 0.6 + lean(45.6), 45.6);
  const r = 8.8;
  const outline = roundedPath(p.sphereOutline(centre, r, 28));
  const [dcx, dcy] = p(...centre);
  let d = `<path d="${outline}" fill="${DEEP_GLASS}" fill-opacity=".62" stroke="none"/>`;

  // Water line near the top of the dome.
  const waterH = 4.2 + Math.sin(phase * TAU) * 0.35;
  const waterR = Math.sqrt(r * r - waterH * waterH) * 0.96;
  const ring = [];
  for (let i = 0; i < 20; i++) {
    const a = (i * TAU) / 20;
    ring.push(p(centre[0] + waterR * Math.cos(a), centre[1] + waterR * Math.sin(a), centre[2] + waterH + 0.3 * Math.sin(a * 3 + phase * TAU * 2)));
  }
  d += `<polygon points="${points(ring)}" fill="${AQUA}" fill-opacity=".16" stroke="${AQUA}" stroke-width=".6" stroke-opacity=".7"/>`;

  for (let b = 0; b < 3; b++) {
    const u = (phase * 1.5 + b * 0.33) % 1;
    const [bx, by] = p(centre[0] + (b - 1) * 3 + Math.sin(u * TAU + b) * 0.9, centre[1] + (b % 2 ? 1.6 : -1.4), lerp(centre[2] - 6, centre[2] + 3.8, u));
    d += `<circle cx="${number(bx)}" cy="${number(by)}" r="${number(0.9 + (1 - u) * 0.4)}" fill="none" stroke="${AQUA}" stroke-width=".65" stroke-opacity="${number(0.85 - u * 0.5)}"/>`;
  }

  // The coral fish, nosing anxiously at the glass while the suit is repaired.
  const swim = phase * TAU;
  const fx = dcx + Math.cos(swim) * 4.6;
  const fy = dcy + 2.4 + Math.sin(swim * 2) * 2.0;
  const dir = Math.sin(swim) >= 0 ? -1 : 1;
  const wag = Math.sin(phase * TAU * 6) * 1.8;
  const k = 0.8;
  const body = [
    [7.4, 0], [2.6, -4.0], [-3.8, -2.4], [-6.2, -0.8 + wag * 0.3], [-9.8, -4.0 + wag], [-7.8, wag * 0.5],
    [-9.8, 4.0 + wag], [-6.2, 0.8 + wag * 0.3], [-3.8, 2.4], [2.6, 4.0],
  ].map(([u, v]) => [fx + dir * u * k, fy + v * k]);
  d += `<polygon points="${points(body)}" fill="${CORAL}" stroke="${PAPER}" stroke-width=".6"/>`;
  d += `<circle cx="${number(fx + dir * 3.6)}" cy="${number(fy - 0.7)}" r=".85" fill="${PAPER}" stroke="none"/>`;

  // Glass: a meridian, a hairline crack, a glint and the rim.
  const meridian = [];
  for (let i = 0; i <= 14; i++) {
    const phi = (i / 14) * Math.PI;
    meridian.push(p(...add3(centre, add3(mul3(MECH.right, r * Math.cos(phi) * 0.42), [0, 0, r * Math.sin(phi) * 0.98]))));
  }
  d += `<path d="M${meridian.map(pair).join(' L')}" fill="none" stroke="${DEEP_LINE}" stroke-width=".6" stroke-opacity=".5"/>`;
  const crack = [[0.62, 0.34], [0.44, 0.18], [0.5, -0.02], [0.3, -0.16], [0.36, -0.36]].map(([a, b]) => [dcx + a * r * 1.64, dcy + b * r * 1.64]);
  d += `<path d="M${crack.map(pair).join(' L')}" fill="none" stroke="${PAPER}" stroke-width=".7" stroke-opacity=".75"/>`;
  const glint = [];
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI * (1.08 + i * 0.05);
    glint.push([dcx + Math.cos(a) * r * 1.25, dcy + Math.sin(a) * r * 1.1]);
  }
  d += `<path d="M${glint.map(pair).join(' L')}" fill="none" stroke="${PAPER}" stroke-width="1.1" stroke-opacity=".55" stroke-linecap="round"/>`;
  d += `<path d="${outline}" fill="none" stroke="${AQUA}" stroke-width="1.2"/>`;
  return d;
}

const mechBackFrameCache = new Map();
const mechFrameCache = new Map();

// An engineer stands back behind the suit, one arm folded, hand at the chin, thinking it over.
function mechThinkerMarkup(step) {
  if (mechBackFrameCache.has(step)) return mechBackFrameCache.get(step);
  const phase = (step % 80) / 80;
  const [tx, ty] = [58, 58];
  const heading = Math.atan2(98 - tx, 80 - ty);
  const frame = mechFrame(tx, ty, heading);
  const ponder = Math.sin(phase * TAU);
  const out = human3DMarkup(mechProjector, {
    id: 'mech-thinker',
    x: tx,
    y: ty,
    scale: 0.76,
    heading: heading + 0.1 * ponder,
    lean: 0.3 + 0.12 * ponder,
    color: DEEP_LINE,
    fillPaper: DEEP_BG,
    shadowColor: DEEP_SHADE,
    leftTarget: frame.local(0.4, 3.8, 20.5),
    rightTarget: frame.local(0.8, 3.2, 26.6 + 0.3 * ponder),
  });
  mechBackFrameCache.set(step, out);
  return out;
}

function mechDynamicMarkup(step) {
  if (mechFrameCache.has(step)) return mechFrameCache.get(step);
  const phase = (step % 80) / 80;
  const p = mechProjector;
  const { local } = MECH;
  const near = MECH_NEAR;
  const facing = (x, y, tx, ty) => Math.atan2(tx - x, ty - y);

  let d = mechDomeMarkup(phase);

  // A stray spark now and then from the open hatch.
  const flicker = (phase * 5) % 1;
  if (flicker < 0.18) {
    const [hx, hy] = p(...local(1.6, 7.6 + lean(23), 23));
    d += `<circle cx="${number(hx)}" cy="${number(hy)}" r="${number(1.4 - flicker * 5)}" fill="${SPARK}" stroke="none"/>`;
  }

  // Welder at the open shoulder socket, torch on the joint.
  const weld = local(near * 11.4, lean(31.5) + 1.5, 31.5);
  const wx = weld[0] + MECH.right[0] * near * 11 + MECH.forward[0] * 4;
  const wy = weld[1] + MECH.right[1] * near * 11 + MECH.forward[1] * 4;
  const welderFrame = mechFrame(wx, wy, facing(wx, wy, weld[0], weld[1]));
  const weldOsc = Math.sin(phase * TAU * 2);
  const valve = p(...local(near * 26.5, -4.5, 15.6));
  const grip = p(...welderFrame.local(0, 5.0, 22.5 + weldOsc * 0.5));
  const sag = p(...local(near * 25.5, 4.0, 0.4));
  d += `<path d="M${pair(valve)} C${pair([valve[0], sag[1]])} ${pair(sag)} ${pair(grip)}" fill="none" stroke="${CORAL}" stroke-width=".9" stroke-opacity=".85"/>`;
  const welder = human3DMarkup(p, {
    id: 'mech-welder',
    x: wx,
    y: wy,
    scale: 0.78,
    heading: facing(wx, wy, weld[0], weld[1]),
    lean: 1.1 + 0.15 * weldOsc,
    color: CORAL,
    fillPaper: DEEP_BG,
    shadowColor: DEEP_SHADE,
    welderMask: true,
    leftTarget: welderFrame.local(-1.4, 6.0, 23.5 + weldOsc * 0.5),
    rightTarget: welderFrame.local(1.4, 6.0, 23.5 + weldOsc * 0.5),
    blowtorchTarget: weld,
    sparkPhase: phase,
  });

  // Researcher with a clipboard, scratching their head at what they're looking at.
  const [cx, cy] = [56, 108];
  const clipFrame = mechFrame(cx, cy, facing(cx, cy, 98, 82));
  const scratch = Math.sin(phase * TAU * 4);
  const scratcher = human3DMarkup(p, {
    id: 'mech-clipboard',
    x: cx,
    y: cy,
    scale: 0.78,
    heading: facing(cx, cy, 98, 82),
    lean: 0.4 + 0.12 * Math.sin(phase * TAU),
    color: CORAL,
    fillPaper: DEEP_BG,
    shadowColor: DEEP_SHADE,
    leftTarget: clipFrame.local(-3.4, 5.4, 20.5 + 0.5 * Math.sin(phase * TAU)),
    rightTarget: clipFrame.local(2.2 + scratch * 0.5, 0.4, 34.2 + Math.abs(scratch) * 0.6),
    holdingBoard: true,
  });

  const out = d + welder + scratcher;
  mechFrameCache.set(step, out);
  return out;
}

export function initRedesignersMech(stage) {
  const svg = stage?.querySelector('[data-redesigners-svg]');
  if (!svg) return () => {};

  svg.innerHTML = `<g stroke="${DEEP_LINE}" stroke-width=".9" stroke-linejoin="round" stroke-linecap="round">${mechBackMarkup()}<g data-mech-back></g>${mechBodyMarkup()}<g data-mech-dynamic></g></g>`;
  const back = svg.querySelector('[data-mech-back]');
  const dyn = svg.querySelector('[data-mech-dynamic]');
  let lastStep = -1;

  const render = (timeSeconds = 0, reducedMotion = false) => {
    const step = reducedMotion ? 22 : Math.floor((((timeSeconds * 0.22) % 1) + 1) % 1 * 80);
    if (step !== lastStep) {
      lastStep = step;
      back.innerHTML = mechThinkerMarkup(step);
      dyn.innerHTML = mechDynamicMarkup(step);
    }
  };
  render(0, false);
  return render;
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
    card1Card: stage.querySelector('[data-thesis-reveal="card1-card"]'),
    card1Heading: stage.querySelectorAll('[data-thesis-reveal="card1-heading"]'),
    card1Body: stage.querySelector('[data-thesis-reveal="card1-body"]'),
    card1Art: stage.querySelector('[data-thesis-reveal="card1-art"]'),
    card2Card: stage.querySelector('[data-thesis-reveal="card2-card"]'),
    card2Heading: stage.querySelectorAll('[data-thesis-reveal="card2-heading"]'),
    card2Body: stage.querySelector('[data-thesis-reveal="card2-body"]'),
    card2Art: stage.querySelector('[data-thesis-reveal="card2-art"]'),
  };

  let lastStep1 = -1;
  let lastStep2 = -1;

  const setReveal = (target, t) => {
    if (!target) return;
    const v = smooth(t);
    const op = v.toFixed(3);
    const tr = `translate3d(0,${((1 - v) * 14).toFixed(2)}px,0)`;
    if (typeof target.forEach === 'function') {
      target.forEach(el => {
        el.style.opacity = op;
        el.style.transform = tr;
      });
    } else {
      target.style.opacity = op;
      target.style.transform = tr;
    }
  };

  const clearReveal = target => {
    if (!target) return;
    if (typeof target.forEach === 'function') {
      target.forEach(el => {
        el.style.removeProperty('opacity');
        el.style.removeProperty('transform');
      });
    } else {
      target.style.removeProperty('opacity');
      target.style.removeProperty('transform');
    }
  };

  const render = (scrollProgress = 1, timeSeconds = 0, reducedMotion = false) => {
    if (reducedMotion) {
      stage.classList.remove('thesis-enhanced');
      Object.values(items).forEach(clearReveal);
      if (lastStep1 !== 34) {
        lastStep1 = 34;
        dyn1.innerHTML = card1DynamicMarkup(34);
      }
      if (lastStep2 !== 36) {
        lastStep2 = 36;
        dyn2.innerHTML = card2DynamicMarkup(36);
      }
      return;
    }

    stage.classList.add('thesis-enhanced');
    const p = clamp(scrollProgress);

    // Progressive 6-stage scroll fade-in:
    // Stage 1: Card 1 border + "01 / HUMAN JUDGEMENT & AI" + "Yesterday's ways of working..."
    // Stage 2: Card 1 body paragraphs
    // Stage 3: Card 1 3D conveyor relay animation
    // Stage 4: Card 2 border + "02 / RESEARCH & OPERATIONS" + "When the answer isn't known..."
    // Stage 5: Card 2 body paragraphs
    // Stage 6: Card 2 3D RadCam + Office courtyard animation
    setReveal(items.card1Card, (p - 0.01) / 0.15);
    setReveal(items.card1Heading, (p - 0.02) / 0.15);
    setReveal(items.card1Body, (p - 0.15) / 0.17);
    setReveal(items.card1Art, (p - 0.28) / 0.18);
    setReveal(items.card2Card, (p - 0.46) / 0.16);
    setReveal(items.card2Heading, (p - 0.48) / 0.16);
    setReveal(items.card2Body, (p - 0.62) / 0.17);
    setReveal(items.card2Art, (p - 0.76) / 0.18);

    const cycle1 = ((timeSeconds * 0.22) + p * 1.15) % 1;
    const cycle2 = ((timeSeconds * 0.18) + Math.max(0, p - 0.45) * 1.2) % 1;
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
