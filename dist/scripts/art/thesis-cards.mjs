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
    `<g fill="${color}" fill-opacity=".08" stroke="none">${allBodyPaths}</g>`;

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

  for (const side of [-1, 1]) {
    const shoulder = local(side * 4.25, lean * 0.92, shoulderZ - 0.3);
    const defaultHand = local(side * 5.2, -side * stride * 2.4 + 0.8, 18.5);
    const requested = (side < 0 ? leftTarget : rightTarget) || defaultHand;

    const delta = sub3(requested, shoulder);
    const dist = len3(delta);
    const upper = 8.4 * s;
    const lower = 8.4 * s;
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
      `<g fill="${color}" fill-opacity=".08" stroke="none">${armPaths}</g>`;

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
    const lh = solvedHands[0];
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

  return `${defs}<g data-human-3d="${id}">${shadow}${backArms.join('')}${unifiedBodyMarkup}${ frontArms.join('') }${propMarkup}${headMarkup}</g>`;
}

/**
 * Isometric 3D articulated blue SVG robot/agent with rotating torso and dual gripper arms.
 */
function robotMarkup(p, { x, y, z = 0, scale = 0.84, heading = 0, target = [x, y + 14, 24] } = {}) {
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

  for (const side of [-1, 1]) {
    const shoulder = local(side * 6.4, 0.2, 31.8);
    const hand = [
      target[0] + right[0] * side * 4.2 * s,
      target[1] + right[1] * side * 4.2 * s,
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
  const { polygon, line, planLine, surface, panelY, box } = card1Iso;
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

  s += box(110, 81, 12, 11, 11.5, PAPER, PAPER, SHADE, 0);
  s += surface(108, 79, 16, 15, 11.6, PAPER, `stroke="${CORAL}" stroke-width=".9"`);
  s += surface(111, 82, 10, 9, 11.75, CORAL, 'stroke="none" fill-opacity=".15"');

  for (const lx of [150, 178, 204]) {
    for (const ly of [77, 94]) s += box(lx, ly, 2.2, 2.2, 12.5, PAPER, PAPER, SHADE, 0);
  }
  s += box(144, 74, 68, 24, 3.0, PAPER, PAPER, SHADE, 12.5);
  s += surface(146, 77, 64, 18, 15.6, GLASS, 'fill-opacity=".52" stroke-opacity=".68" stroke-width=".75"');

  s += panelY(182, 73, 15.5, 26, 22, GLASS, 'fill-opacity=".34" stroke-width=".85"');
  s += panelY(192, 73, 15.5, 26, 22, GLASS, 'fill-opacity=".22" stroke-width=".85"');
  s += surface(182, 73, 10, 26, 37.5, PAPER, 'stroke-width=".9"');
  s += line(p(187, 73, 37.5), p(187, 99, 37.5), 'stroke-opacity=".5"');

  s += planLine([[187, 99, .4], [187, 124, .4], [100, 124, .4], [100, 99, .4]], 'stroke-dasharray="3 3" stroke-opacity=".42"');

  card1StaticCache = s;
  return s;
}

const card1FrameCache = new Map();
function card1DynamicMarkup(step) {
  if (card1FrameCache.has(step)) return card1FrameCache.get(step);
  const phase = (step % 80) / 80;
  const p = card1Projector;
  const { line } = card1Iso;
  let d = '';

  const beltShift = (phase * 12) % 12;
  for (let rx = 28 + beltShift; rx <= 86; rx += 12) {
    d += line(p(rx, 78, 15.75), p(rx, 94, 15.75), `stroke="${CORAL}" stroke-opacity=".35" stroke-width=".65"`);
  }
  for (let rx = 148 + beltShift; rx <= 208; rx += 12) {
    d += line(p(rx, 78, 15.75), p(rx, 94, 15.75), 'stroke-opacity=".35" stroke-width=".65"');
  }

  const incomingX = lerp(34, 60, phase);
  d += parcelBox(card1Iso, incomingX, 86, 15.8, { checked: false, agent: false });

  let activeBoxPos, boxChecked = false, boxAgent = false;
  let humanX = 99, humanHeading = 0, humanLean = 0.8, humanStride = 0;
  let leftTarget, rightTarget;
  let robotHeading, robotTarget;

  const boxSideHands = (bx, by, bz) => [
    [bx, by - 4.2, bz + 4.2],
    [bx, by + 4.2, bz + 4.2],
  ];

  if (phase < 0.36) {
    const u = smooth(phase / 0.36);
    humanX = lerp(94, 104, u);
    humanHeading = lerp(-Math.PI * 0.42, Math.PI * 0.42, u);
    humanLean = 1.1 - 0.35 * Math.sin(u * Math.PI);
    humanStride = Math.sin(u * Math.PI) * 0.45;
    activeBoxPos = [
      lerp(83, 114, u),
      86,
      lerp(15.8, 20.5, Math.sin(u * Math.PI * 0.55)),
    ];
    [leftTarget, rightTarget] = boxSideHands(...activeBoxPos);

    robotHeading = lerp(Math.PI * 0.44, -Math.PI * 0.46, u);
    robotTarget = [lerp(150, 122, u), 86, lerp(19.0, 21.0, u)];
  } else if (phase < 0.58) {
    const u = smooth((phase - 0.36) / 0.22);
    humanX = 104;
    humanHeading = Math.PI * 0.42;
    humanLean = 1.0;
    activeBoxPos = [
      lerp(114, 118, u),
      86,
      lerp(20.5, 21.2, Math.sin(u * Math.PI)),
    ];
    boxChecked = u > 0.3;
    [leftTarget, rightTarget] = boxSideHands(activeBoxPos[0] - 1.5, activeBoxPos[1], activeBoxPos[2]);

    robotHeading = -Math.PI * 0.46;
    robotTarget = [activeBoxPos[0] + 1.5, activeBoxPos[1], activeBoxPos[2] + 3.8];
  } else if (phase < 0.88) {
    const u = smooth((phase - 0.58) / 0.30);
    humanX = lerp(104, 94, u);
    humanHeading = lerp(Math.PI * 0.42, -Math.PI * 0.42, u);
    humanLean = 0.85 + 0.25 * u;
    humanStride = -Math.sin(u * Math.PI) * 0.4;
    activeBoxPos = [
      lerp(118, 154, u),
      86,
      lerp(21.2, 15.8, u),
    ];
    boxChecked = true;
    boxAgent = u > 0.2;

    const reachX = lerp(112, 83, u);
    const reachZ = lerp(20.0, 16.5, u);
    [leftTarget, rightTarget] = boxSideHands(reachX, 86, reachZ);

    robotHeading = lerp(-Math.PI * 0.46, Math.PI * 0.46, u);
    robotTarget = [activeBoxPos[0], activeBoxPos[1], activeBoxPos[2] + 3.8];
  } else {
    const u = smooth((phase - 0.88) / 0.12);
    humanX = 94;
    humanHeading = -Math.PI * 0.42;
    humanLean = 1.1;
    activeBoxPos = [lerp(154, 166, u), 86, 15.8];
    boxChecked = true;
    boxAgent = true;
    [leftTarget, rightTarget] = boxSideHands(83, 86, lerp(16.5, 15.8, u));

    robotHeading = Math.PI * 0.44;
    robotTarget = [lerp(154, 150, u), 86, 19.0];
  }

  const outX = lerp(166, 206, phase);
  d += parcelBox(card1Iso, outX, 86, 15.8, { checked: true, agent: true });

  const humanStr = human3DMarkup(p, {
    id: 'c1-human',
    x: humanX,
    y: 82,
    scale: 0.84,
    heading: humanHeading,
    lean: humanLean,
    stride: humanStride,
    color: CORAL,
    leftTarget,
    rightTarget,
  });
  const robotStr = robotMarkup(p, {
    x: 135,
    y: 84,
    scale: 0.82,
    heading: robotHeading,
    target: robotTarget,
  });
  const boxStr = parcelBox(card1Iso, activeBoxPos[0], activeBoxPos[1] + 2.5, activeBoxPos[2], { checked: boxChecked, agent: boxAgent });

  d += humanStr + robotStr + boxStr;

  const pulseX = lerp(187, 100, phase);
  const [fx, fy] = p(pulseX, 124, 0.6);
  d += `<circle cx="${fx}" cy="${fy}" r="2.4" fill="${CORAL}" stroke="${PAPER}" stroke-width=".75"/>`;

  card1FrameCache.set(step, d);
  return d;
}

// ============================================================================
// CARD 2: 3D Isometric Radcliffe Camera (Back-Left) + Modern Office (Back-Right)
//         + Open Central Courtyard Exchange
// ============================================================================
const card2Projector = makeProjector({ originX: 266, originY: 162, centerX: 86, centerY: 82, angle: -4, scale: 1.56, pitch: 0.44 });
const card2Iso = isoPrimitives(card2Projector);
let card2StaticCache = '';

function radcliffeCameraMarkup(p, iso) {
  const { polygon, line, planLine } = iso;
  const cx = 38, cy = 98;
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
      const isShaded = Math.cos(midAngle - 0.2) > 0.15;
      quads.push({ q, depth, fill: isShaded ? shadeFill : fill });
    }
    quads.sort((a, b) => a.depth - b.depth);
    let band = quads.map(({ q, fill: f }) => polygon(q.map(pt => p(...pt)), f, extra)).join('');
    band += polygon(top.map(pt => p(...pt)), PAPER, 'stroke-width=".8"');
    return band;
  };

  out += cylinderBand(26, 26, 0, 13, 16, PAPER, SHADE, 'stroke-width=".85"');
  out += cylinderBand(24, 24, 13, 16, 16, PAPER, SHADE, 'stroke-width=".75"');

  const doorAngle = 0.15;
  const da0 = doorAngle - 0.22, da1 = doorAngle + 0.22;
  out += polygon(
    [
      p(cx + 26.2 * Math.cos(da0), cy + 26.2 * Math.sin(da0), 0),
      p(cx + 26.2 * Math.cos(da1), cy + 26.2 * Math.sin(da1), 0),
      p(cx + 26.2 * Math.cos(da1), cy + 26.2 * Math.sin(da1), 11.5),
      p(cx + 26.2 * Math.cos(da0), cy + 26.2 * Math.sin(da0), 11.5),
    ],
    GLASS,
    'fill-opacity=".85" stroke-width=".95"'
  );

  out += cylinderBand(21.5, 21.5, 16, 38, 16, PAPER, SHADE, 'stroke-width=".75"');
  for (let i = 0; i < 16; i++) {
    const a = (i * TAU) / 16;
    if (Math.sin(a) + Math.cos(a) > -0.45) {
      const w0 = a + 0.09, w1 = a + (TAU / 16) - 0.09;
      if (Math.sin(w0) + Math.cos(w0) > -0.35) {
        out += polygon(
          [
            p(cx + 21.7 * Math.cos(w0), cy + 21.7 * Math.sin(w0), 19),
            p(cx + 21.7 * Math.cos(w1), cy + 21.7 * Math.sin(w1), 19),
            p(cx + 21.7 * Math.cos(w1), cy + 21.7 * Math.sin(w1), 34),
            p(cx + 21.7 * Math.cos(w0), cy + 21.7 * Math.sin(w0), 34),
          ],
          GLASS,
          'fill-opacity=".55" stroke-width=".55"'
        );
      }
      for (const da of [-0.042, 0.042]) {
        const x0 = cx + 22.3 * Math.cos(a + da), y0 = cy + 22.3 * Math.sin(a + da);
        out += line(p(x0, y0, 16), p(x0, y0, 37.5), 'stroke-width=".85"');
      }
    }
  }
  out += cylinderBand(23.0, 22.0, 38, 41.5, 16, PAPER, SHADE, 'stroke-width=".85"');

  const domeRings = [
    [20.8, 41.5],
    [19.2, 47.5],
    [16.2, 53.5],
    [11.6, 59.0],
    [5.8, 63.5],
  ];
  for (let r = 0; r < domeRings.length - 1; r++) {
    const [r0, z0] = domeRings[r];
    const [r1, z1] = domeRings[r + 1];
    out += cylinderBand(r0, r1, z0, z1, 16, PAPER, SHADE, 'stroke-width=".65" stroke-opacity=".75"');
  }
  for (let i = 0; i < 12; i++) {
    const a = (i * TAU) / 12;
    if (Math.sin(a) + Math.cos(a) > -0.4) {
      const rib = domeRings.map(([rad, z]) => [cx + rad * Math.cos(a), cy + rad * Math.sin(a), z]);
      out += planLine(rib, 'stroke-width=".75" stroke-opacity=".8"');
    }
  }

  out += cylinderBand(4.8, 4.8, 63.5, 71, 8, GLASS, SHADE, 'stroke-width=".8"');
  out += cylinderBand(5.0, 1.0, 71, 75, 8, PAPER, SHADE, 'stroke-width=".8"');
  out += line(p(cx, cy, 75), p(cx, cy, 80.5), 'stroke-width="1.1"');
  return out;
}

function officeBuildingMarkup(p, iso) {
  const { surface, panelX, panelY, box, line } = iso;
  const ox = 104, oy = 20, ow = 44, od = 40;
  let out = '';

  const tiers = [
    { z0: 0, h: 19 },
    { z0: 19, h: 18 },
    { z0: 37, h: 18 },
  ];
  for (const { z0, h } of tiers) {
    out += box(ox, oy, ow, od, h, PAPER, PAPER, SHADE, z0, 'stroke-width=".9"');
    for (let col = 0; col < 3; col++) {
      const wx = ox + 3.8 + col * 13.0;
      out += panelX(wx, oy + od + .1, z0 + 2.6, 10.4, h - 4.8, GLASS, 'fill-opacity=".55" stroke-width=".65" stroke-opacity=".75"');
      out += line(p(wx, oy + od + .15, z0 + h * 0.55), p(wx + 10.4, oy + od + .15, z0 + h * 0.55), 'stroke-width=".5" stroke-opacity=".45"');
    }
    for (let col = 0; col < 3; col++) {
      const wy = oy + 3.5 + col * 11.8;
      out += panelY(ox + ow + .1, wy, z0 + 2.6, 9.4, h - 4.8, GLASS, 'fill-opacity=".42" stroke-width=".65" stroke-opacity=".75"');
    }
    out += box(ox - 0.8, oy - 0.8, ow + 1.6, od + 1.6, 1.5, PAPER, PAPER, SHADE, z0 + h - 0.7, 'stroke-width=".85"');
  }

  out += box(ox + 8, oy + 8, 28, 24, 9, PAPER, PAPER, SHADE, 55.8, 'stroke-width=".85"');
  out += panelX(ox + 12, oy + 32.1, 57.5, 20, 5.5, GLASS, 'fill-opacity=".55" stroke-width=".6"');
  out += surface(ox + 12, oy + 12, 20, 16, 65.0, PAPER, `stroke="${CORAL}" stroke-width=".95"`);

  out += panelX(ox + 14, oy + od + .2, 0, 14, 13.5, GLASS, `fill-opacity=".85" stroke="${CORAL}" stroke-width="1.0"`);
  out += box(ox + 12, oy + od - 0.4, 18, 5.0, 1.4, PAPER, PAPER, SHADE, 13.5, `stroke="${CORAL}" stroke-width=".85"`);
  return out;
}

function card2StaticMarkup() {
  if (card2StaticCache) return card2StaticCache;
  const p = card2Projector;
  const { polygon, surface, planLine, box, ruledNote } = card2Iso;
  let s = '';

  s += surface(4, 10, 156, 142, 0, PAPER);
  s += polygon([p(4, 152, 0), p(160, 152, 0), p(160, 152, -4.5), p(4, 152, -4.5)], SHADE);
  s += polygon([p(160, 10, 0), p(160, 152, 0), p(160, 152, -4.5), p(160, 10, -4.5)], SHADE);
  s += surface(11, 17, 142, 128, .2, 'none', 'stroke-opacity=".18"');

  s += radcliffeCameraMarkup(p, card2Iso);
  s += officeBuildingMarkup(p, card2Iso);

  s += planLine([[64, 98, .3], [84, 88, .3], [96, 104, .3]], 'stroke-dasharray="3 3" stroke-opacity=".48"');
  s += planLine([[121, 62, .3], [104, 78, .3], [116, 96, .3]], `stroke="${CORAL}" stroke-dasharray="3 3" stroke-opacity=".48"`);

  for (const [dx, dy] of [[2, 2], [26, 2], [2, 14], [26, 14]]) {
    s += box(94 + dx, 96 + dy, 1.8, 1.8, 13.0, PAPER, PAPER, SHADE, 0);
  }
  s += box(94, 96, 30, 18, 1.8, PAPER, PAPER, SHADE, 13.0);
  s += ruledNote(97, 99, 9.2, 7.2, 15.0, BLUE, false);
  s += ruledNote(111, 100, 9.2, 7.2, 15.0, CORAL, true);

  card2StaticCache = s;
  return s;
}

const card2FrameCache = new Map();
function card2DynamicMarkup(step) {
  if (card2FrameCache.has(step)) return card2FrameCache.get(step);
  const phase = (step % 80) / 80;
  const p = card2Projector;
  const { ruledNote } = card2Iso;

  const pass = 0.5 - 0.5 * Math.cos(phase * TAU);
  const arc = Math.sin(phase * TAU);
  const sharedNoteX = lerp(102, 110, pass);
  const sharedNoteY = lerp(105, 102, pass);
  const sharedNote = ruledNote(sharedNoteX - 4.2, sharedNoteY - 3.2, 8.6, 6.8, 15.1, pass > 0.5 ? CORAL : BLUE, pass > 0.35);

  const resLead = human3DMarkup(p, {
    id: 'c2-res-lead',
    x: 86,
    y: 106,
    scale: 0.72,
    heading: Math.PI * 0.42,
    lean: 1.15 + 0.35 * (1 - pass),
    color: BLUE,
    leftTarget: [95, 101, 15.8 + Math.max(0, -arc) * 2.2],
    rightTarget: [lerp(96, 101, pass), lerp(107, 105, pass), 15.5 + Math.max(0, arc) * 2.8],
  });

  const opLead = human3DMarkup(p, {
    id: 'c2-op-lead',
    x: 131,
    y: 95,
    scale: 0.72,
    heading: -Math.PI * 0.58,
    lean: 1.15 + 0.35 * pass,
    color: CORAL,
    leftTarget: [lerp(116, 121, pass), lerp(102, 99, pass), 15.5 + Math.max(0, -arc) * 2.8],
    rightTarget: [121, 96, 15.8 + Math.max(0, arc) * 2.2],
  });

  const walk = 0.5 - 0.5 * Math.cos(phase * TAU);
  const stride = Math.sin(phase * TAU * 2) * 0.65 * (1 - walk * 0.6);
  const raise = smooth(Math.max(0, (walk - 0.3) / 0.7));

  const rwX = lerp(74, 83, walk);
  const rwY = lerp(92, 85, walk);
  const resWalker = human3DMarkup(p, {
    id: 'c2-res-walk',
    x: rwX,
    y: rwY,
    scale: 0.66,
    heading: Math.PI * 0.68,
    lean: 0.6 + raise * 0.4,
    stride,
    color: BLUE,
    leftTarget: [rwX + 3.5, rwY - 4.2, 14.5 + raise * 3.2],
    rightTarget: [rwX + 5.2, rwY - 1.5, 14.8 + raise * 3.6],
    holdingNote: BLUE,
  });

  const owX = lerp(112, 101, walk);
  const owY = lerp(66, 74, walk);
  const opWalker = human3DMarkup(p, {
    id: 'c2-op-walk',
    x: owX,
    y: owY,
    scale: 0.66,
    heading: -Math.PI * 0.32,
    lean: 0.6 + raise * 0.4,
    stride: -stride,
    color: CORAL,
    leftTarget: [owX - 3.5, owY + 4.2, 14.5 + raise * 3.2],
    rightTarget: [owX - 5.2, owY + 1.5, 14.8 + raise * 3.6],
    holdingNote: CORAL,
  });

  const markup = resWalker + opWalker + sharedNote + resLead + opLead;
  card2FrameCache.set(step, markup);
  return markup;
}

// ============================================================================
// REDESIGNERS STAGE: "koralli is for the redesigners."
// 3D Isometric Fish-in-a-Mech-Suit Subsea Workshop:
// - Seated 3D Aquatic Mech Suit with water-filled glass dome cockpit & coral fish swimming inside
// - Human 1 holding a board and scratching his head while examining the mech
// - Human 2 wearing a welder mask with a blowtorch repairing the mech joint with sparks
// - Human 3 walking organically between the pressure telemetry stand and the mech
// ============================================================================
const mechProjector = makeProjector({ originX: 290, originY: 168, centerX: 98, centerY: 86, angle: -10, scale: 1.82, pitch: 0.43 });
const mechIso = isoPrimitives(mechProjector, { paper: DEEP_BG, shade: DEEP_SHADE });
let mechStaticCache = '';

function mechStaticMarkup() {
  if (mechStaticCache) return mechStaticCache;
  const p = mechProjector;
  const { polygon, line, planLine, surface, panelX, panelY, box } = mechIso;
  let s = '';

  // 1. Subsea Engineering Deck Platform (x = 16..184, y = 36..136)
  s += surface(16, 36, 168, 100, 0, DEEP_BG);
  s += polygon([p(16, 136, 0), p(184, 136, 0), p(184, 136, -4.5), p(16, 136, -4.5)], DEEP_SHADE);
  s += polygon([p(184, 36, 0), p(184, 136, 0), p(184, 136, -4.5), p(184, 36, -4.5)], DEEP_SHADE);
  s += surface(23, 43, 154, 86, .2, 'none', 'stroke-opacity=".24"');

  // 2. Back-Left Deep-Water Pressure Telemetry Console (x = 24..38, y = 44..58)
  s += box(24, 44, 14, 14, 18, DEEP_BG, DEEP_BG, DEEP_SHADE, 0);
  s += panelX(26, 58.2, 4, 10, 10, DEEP_GLASS, 'fill-opacity=".65" stroke-width=".75"');
  s += line(p(28, 58.3, 10), p(34, 58.3, 12), `stroke="${AQUA}" stroke-width=".85"`);
  s += line(p(28, 58.3, 7), p(33, 58.3, 7), `stroke="${CORAL}" stroke-width=".85"`);

  // Back-Right Subsea Calibration Bench (x = 154..170, y = 46..58)
  s += box(154, 46, 16, 12, 12, DEEP_BG, DEEP_BG, DEEP_SHADE, 0);
  s += surface(156, 48, 12, 8, 12.15, DEEP_GLASS, 'fill-opacity=".55" stroke-width=".7"');

  // Hydraulic umbilical conduits across the deck to the central Mech Cradle
  s += planLine([[38, 52, .3], [66, 62, .3], [82, 72, .3]], 'stroke-dasharray="3 3" stroke-opacity=".48"');
  s += planLine([[154, 54, .3], [132, 62, .3], [114, 74, .3]], `stroke="${CORAL}" stroke-dasharray="3 3" stroke-opacity=".48"`);

  // 3. Central Mech Docking Seat / Fabrication Cradle (x = 82..114, y = 62..88, z = 0..13)
  s += box(80, 60, 36, 30, 3.5, DEEP_BG, DEEP_BG, DEEP_SHADE, 0);
  s += box(85, 63, 26, 20, 10.5, DEEP_BG, DEEP_BG, DEEP_SHADE, 3.5);
  // Rear gantry frame behind the seated mech
  s += box(88, 56, 4, 4, 42, DEEP_BG, DEEP_BG, DEEP_SHADE, 3.5);
  s += box(104, 56, 4, 4, 42, DEEP_BG, DEEP_BG, DEEP_SHADE, 3.5);
  s += box(87, 55, 22, 6, 3.5, DEEP_BG, DEEP_BG, DEEP_SHADE, 45.5);

  // 4. Seated 3D Aquatic Mech Suit Chassis (sitting on the cradle at x = 98, y = 76)
  // Pelvis block on seat (z = 14..19)
  s += box(87, 68, 22, 16, 5.5, DEEP_BG, DEEP_BG, DEEP_SHADE, 14.0);
  // Seated Left & Right Mechanical Thighs extending forward (+y = 82..98, z = 14.5..19.5)
  for (const lx of [87.5, 101.5]) {
    s += box(lx, 82, 7.0, 15.0, 5.2, DEEP_BG, DEEP_BG, DEEP_SHADE, 14.2);
    // Lower armored shins dropping vertically down from knees (y = 93..100, z = 3.0..15.0)
    s += box(lx + 0.5, 93, 6.0, 6.8, 11.8, DEEP_BG, DEEP_BG, DEEP_SHADE, 3.0);
    // Articulated hydro-fin dive boots resting flat on the deck (y = 93..107, z = 0..3.2)
    s += box(lx, 93, 7.0, 13.5, 3.2, DEEP_BG, DEEP_BG, DEEP_SHADE, 0.2, `stroke="${AQUA}" stroke-width=".85"`);
    // Knee servo drum ring
    const [kx, ky] = p(lx + 3.5, 96.5, 15.5);
    s += `<circle cx="${kx}" cy="${ky}" r="4.2" fill="${DEEP_SHADE}" stroke="${DEEP_LINE}" stroke-width=".95"/>`;
    s += `<circle cx="${kx}" cy="${ky}" r="1.6" fill="${CORAL}" stroke="none"/>`;
  }

  // Main Pressurized Dive Torso (x = 85..111, y = 66..86, z = 19.5..35.5)
  s += box(85, 66, 26, 20, 16.0, DEEP_BG, DEEP_BG, DEEP_SHADE, 19.5, 'stroke-width="1.0"');
  // Chest viewport plate & depth pressure ribs
  s += panelX(89, 86.2, 22.5, 18, 10.0, DEEP_GLASS, 'fill-opacity=".55" stroke-width=".8"');
  s += line(p(89, 86.3, 27.5), p(107, 86.3, 27.5), 'stroke-width=".75" stroke-opacity=".75"');
  // Brass/Coral neck seal collar ring at z = 35.5..38.0 supporting the water dome
  s += box(88, 69, 20, 14, 2.6, DEEP_SHADE, DEEP_SHADE, DEEP_SHADE, 35.5, `stroke="${CORAL}" stroke-width=".95"`);

  // Left & Right Heavy Mechanical Arms in Seated Calibration Pose
  // Left Mech Arm (x = 79..85)
  s += box(79.5, 70, 5.5, 8.0, 6.5, DEEP_BG, DEEP_BG, DEEP_SHADE, 28.5);
  s += box(80.0, 72, 4.5, 6.0, 9.0, DEEP_BG, DEEP_BG, DEEP_SHADE, 19.5);
  s += box(80.0, 76, 4.8, 13.0, 4.5, DEEP_BG, DEEP_BG, DEEP_SHADE, 18.5);
  // Right Mech Arm (x = 111..116.5 — being calibrated/repaired by the Welder!)
  s += box(111.0, 70, 5.5, 8.0, 6.5, DEEP_BG, DEEP_BG, DEEP_SHADE, 28.5);
  s += box(111.5, 72, 4.5, 6.0, 9.0, DEEP_BG, DEEP_BG, DEEP_SHADE, 19.5);
  s += box(111.2, 76, 4.8, 13.5, 4.5, DEEP_BG, DEEP_BG, DEEP_SHADE, 18.5, `stroke="${CORAL}" stroke-width=".95"`);

  mechStaticCache = s;
  return s;
}

const mechFrameCache = new Map();
function mechDynamicMarkup(step) {
  if (mechFrameCache.has(step)) return mechFrameCache.get(step);
  const phase = (step % 80) / 80;
  const p = mechProjector;

  let d = '';

  // 1. Water-Filled Spherical Glass Dome Cockpit (centered at cx = 98, cy = 76, cz = 46.5, r = 11.2)
  //    with the Coral Reef Fish swimming in a smooth 3D orbit inside the water!
  const domeCenter = [98, 76, 46.5];
  const domeOutline = roundedPath(p.sphereOutline(domeCenter, 11.2, 24));
  const [dcx, dcy] = p(...domeCenter);

  // Translucent water fill inside the cockpit dome
  d += `<path d="${domeOutline}" fill="${DEEP_GLASS}" fill-opacity=".58" stroke="${AQUA}" stroke-width="1.15"/>`;

  // Elliptical water surface ripple near the top of the dome + rising bubbles
  const waterZ = 52.8 + Math.sin(phase * TAU) * 0.4;
  const waterRing = [];
  for (let i = 0; i < 16; i++) {
    const a = (i * TAU) / 16;
    waterRing.push(p(98 + 8.6 * Math.cos(a), 76 + 8.6 * Math.sin(a), waterZ + 0.35 * Math.sin(a * 3 + phase * TAU * 2)));
  }
  d += `<polygon points="${points(waterRing)}" fill="${AQUA}" fill-opacity=".18" stroke="${AQUA}" stroke-width=".65" stroke-opacity=".75"/>`;

  // Rising air bubbles inside the water cockpit
  for (let b = 0; b < 3; b++) {
    const bu = ((phase * 1.5 + b * 0.33) % 1);
    const bx = 98 + (b - 1) * 3.8 + Math.sin(bu * TAU + b) * 1.1;
    const by = 76 + (b % 2 ? 2.2 : -2.0);
    const bz = lerp(40.5, 52.0, bu);
    const [sbx, sby] = p(bx, by, bz);
    d += `<circle cx="${sbx}" cy="${sby}" r="${number(1.1 + (1 - bu) * 0.5)}" fill="none" stroke="${AQUA}" stroke-width=".7" stroke-opacity="${number(0.85 - bu * 0.5)}"/>`;
  }

  // Coral Reef Fish (#FF6655) swimming happily inside the water-filled cockpit!
  const swimAngle = phase * TAU;
  const fx = dcx + Math.cos(swimAngle) * 7.2;
  const fy = dcy + 1.5 + Math.sin(swimAngle * 2) * 3.2;
  const dir = Math.sin(swimAngle) >= 0 ? -1 : 1;
  const wag = Math.sin(phase * TAU * 4) * 2.2;
  const fishBody = [
    [fx + dir * 7.4, fy],
    [fx + dir * 2.6, fy - 4.0],
    [fx - dir * 3.8, fy - 2.4],
    [fx - dir * 6.2, fy - 0.8 + wag * 0.3],
    [fx - dir * 9.8, fy - 4.0 + wag],
    [fx - dir * 7.8, fy + wag * 0.5],
    [fx - dir * 9.8, fy + 4.0 + wag],
    [fx - dir * 6.2, fy + 0.8 + wag * 0.3],
    [fx - dir * 3.8, fy + 2.4],
    [fx + dir * 2.6, fy + 4.0],
  ];
  d += `<polygon points="${points(fishBody)}" fill="${CORAL}" stroke="${PAPER}" stroke-width=".65"/>`;
  d += `<circle cx="${number(fx + dir * 4.4)}" cy="${number(fy - 0.8)}" r="1.0" fill="${PAPER}" stroke="none"/>`;

  // Front geodesic glass meridian arch & specular highlight over the dome
  const meridian = [];
  for (let i = 0; i <= 12; i++) {
    const phi = (i / 12) * Math.PI;
    meridian.push(p(98 + 11.2 * Math.cos(phi) * 0.7, 76 + 11.2 * Math.cos(phi) * 0.7, 46.5 + 11.2 * Math.sin(phi)));
  }
  d += `<path d="${meridian.map((pt, i) => `${i ? 'L' : 'M'}${pair(pt)}`).join(' ')}" fill="none" stroke="${DEEP_LINE}" stroke-width=".75" stroke-opacity=".68"/>`;
  d += `<path d="${domeOutline}" fill="none" stroke="${DEEP_LINE}" stroke-width="1.15"/>`;

  // 2. Human 1 (Front-Left at x = 60, y = 104):
  //    Holding an inspection board in his left hand & scratching his head with his right hand!
  const scratchOsc = Math.sin(phase * TAU * 3);
  const thinker = human3DMarkup(p, {
    id: 'mech-thinker',
    x: 60,
    y: 104,
    scale: 0.78,
    heading: Math.PI * 0.30,
    lean: 0.45 + 0.2 * Math.sin(phase * TAU),
    color: CORAL,
    fillPaper: DEEP_BG,
    shadowColor: DEEP_SHADE,
    leftTarget: [65.5, 98.5, 22.0 + 0.6 * Math.sin(phase * TAU)],
    rightTarget: [59.2 + scratchOsc * 0.8, 104.2 - scratchOsc * 0.8, 33.8 + Math.abs(scratchOsc) * 1.1],
    holdingBoard: true,
  });

  // 3. Human 2 (Front-Right at x = 136, y = 96):
  //    Wearing a 3D Welder Mask & holding a Blowtorch with sparks repairing the mech's right joint!
  const weldOsc = Math.sin(phase * TAU * 2);
  const welder = human3DMarkup(p, {
    id: 'mech-welder',
    x: 136,
    y: 96,
    scale: 0.78,
    heading: -Math.PI * 0.42,
    lean: 1.25 + 0.2 * weldOsc,
    color: CORAL,
    fillPaper: DEEP_BG,
    shadowColor: DEEP_SHADE,
    welderMask: true,
    leftTarget: [122.5, 90.5, 20.2 + weldOsc * 0.6],
    rightTarget: [123.5, 93.5, 20.6 + weldOsc * 0.6],
    blowtorchTarget: [115.5, 87.5, 20.5 + weldOsc * 0.5],
    sparkPhase: phase,
  });

  // 4. Human 3 (Upper-Right Walkway at x = 132..144, y = 56..64):
  //    Organically walking back and forth between the calibration bench and the mech with natural stride & arm swing
  const walk = 0.5 - 0.5 * Math.cos(phase * TAU);
  const stride = Math.sin(phase * TAU * 2) * 0.72;
  const wx = lerp(142, 128, walk);
  const wy = lerp(56, 64, walk);
  const walker = human3DMarkup(p, {
    id: 'mech-walker',
    x: wx,
    y: wy,
    scale: 0.72,
    heading: -Math.PI * 0.38,
    lean: 0.55,
    stride,
    color: DEEP_LINE,
    fillPaper: DEEP_BG,
    shadowColor: DEEP_SHADE,
    leftTarget: [wx - 5.5, wy + 2.5, 19.5 + walk * 3.0],
    rightTarget: [wx - 3.5, wy - 3.5, 16.5 + Math.max(0, stride) * 2.2],
  });

  const out = walker + d + welder + thinker;
  mechFrameCache.set(step, out);
  return out;
}

export function initRedesignersMech(stage) {
  const svg = stage?.querySelector('[data-redesigners-svg]');
  if (!svg) return () => {};

  svg.innerHTML = `<g stroke="${DEEP_LINE}" stroke-width=".9" stroke-linejoin="round" stroke-linecap="round">${mechStaticMarkup()}<g data-mech-dynamic></g></g>`;
  const dyn = svg.querySelector('[data-mech-dynamic]');
  let lastStep = -1;

  const render = (timeSeconds = 0, reducedMotion = false) => {
    const step = reducedMotion ? 22 : Math.floor((((timeSeconds * 0.22) % 1) + 1) % 1 * 80);
    if (step !== lastStep) {
      lastStep = step;
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
