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
// Rounded solids for the diving suit, so the machine is drawn in the same
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
  torchPower = 1,
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
  // A projector can say how near a point is; otherwise nearer points sit lower on the page.
  const depthOf = p.depth || (pt => p(pt[0], pt[1], 0)[1] + 0.4 * pt[2]);

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
    // Between welds the flame drops back to a small pilot and the sparks stop.
    const flameEnd = add3(tip, mul3(dir, (3.6 + Math.sin(sparkPhase * TAU * 4) * 1.1) * (0.3 + 0.7 * torchPower) * s));
    const pGrip = p(...grip), pBody = p(...bodyEnd), pTip = p(...tip), pFlame = p(...flameEnd);
    propMarkup += `<path d="M${pair(pGrip)} L${pair(pBody)}" fill="none" stroke="${DEEP_LINE}" stroke-width="${number(3.2 * s)}" stroke-linecap="round"/>`;
    propMarkup += `<path d="M${pair(pBody)} L${pair(pTip)}" fill="none" stroke="${CORAL}" stroke-width="${number(1.8 * s)}" stroke-linecap="round"/>`;
    propMarkup += `<path d="M${pair(pTip)} L${pair(pFlame)}" fill="none" stroke="${AQUA}" stroke-width="${number(2.4 * s)}" stroke-linecap="round"/>`;
    // Radial welding sparks bursting from the weld point
    for (let k = 0; k < 6 && torchPower > 0.05; k++) {
      const u = ((sparkPhase * 3 + k * 0.17) % 1);
      const a = k * (TAU / 6) + 0.4;
      const sparkR = (2.0 + u * 8.5) * s;
      const sx = pFlame[0] + Math.cos(a) * sparkR;
      const sy = pFlame[1] + Math.sin(a) * sparkR * 0.75 - Math.sin(u * Math.PI) * 3.5 * s;
      const sx0 = pFlame[0] + Math.cos(a) * sparkR * 0.45;
      const sy0 = pFlame[1] + Math.sin(a) * sparkR * 0.35;
      propMarkup += `<path d="M${number(sx0)},${number(sy0)} L${number(sx)},${number(sy)}" fill="none" stroke="${k % 2 ? SPARK : CORAL}" stroke-width=".95" stroke-opacity="${number((1 - u * 0.75) * torchPower)}"/>`;
    }
    propMarkup += `<circle cx="${pFlame[0]}" cy="${pFlame[1]}" r="${number((1.8 + 0.6 * Math.sin(sparkPhase * TAU * 6)) * s * (0.35 + 0.65 * torchPower))}" fill="${SPARK}" stroke="none"/>`;
  }

  // Ground shadow under feet
  const [gx, gy] = p(x, y, z + 0.2);
  const shadow = `<ellipse cx="${number(gx)}" cy="${number(gy)}" rx="${number(6.8 * s)}" ry="${number(3.0 * s)}" fill="${shadowColor}" fill-opacity=".65" stroke="none"/>`;

  return `${defs}<g data-human-3d="${id}">${shadow}${backArms.join('')}${unifiedBodyMarkup}${held}${frontArms.join('')}${propMarkup}${headMarkup}</g>`;
}

/**
 * Isometric 3D articulated blue SVG robot/agent with rotating torso and dual gripper arms.
 */
function robotMarkup(p, { x, y, z = 0, scale = 0.84, heading = 0, target = [x, y + 14, 24], held = '', stride = 0 } = {}) {
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
  for (const side of [-2.4, 2.4]) {
    // Legs swing in opposition; the forward foot lifts as it passes under the hip.
    const swing = (side < 0 ? 1 : -1) * stride, reach = swing * 3.2, lift = Math.max(0, swing) * 1.6;
    const knee = local(side, reach * .5 + .4, 10.5 + lift * .5);
    out += prism(side - 1.3, -1.8 + reach, lift, 2.6, 4.0, 2.4, PAPER, PAPER, SHADE);
    out += seg(local(side, reach, 2.4 + lift), knee, 'stroke-width="1.8"');
    out += node(knee, 1.55);
    out += seg(knee, local(side, 0, 18.2), 'stroke-width="1.8"');
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



  card1StaticCache = s;
  return s;
}

// The scanner over the outgoing belt: an entry curtain, an exit curtain and a roof. It is
// drawn with the moving parcels so each one passes between the curtains, not over them.
const SCANNER_IN = 182, SCANNER_OUT = 192;
function card1ScannerBack() {
  return card1Iso.panelY(SCANNER_IN, 73, 15.5, 26, 22, GLASS, 'fill-opacity=".34" stroke-width=".85"');
}
function card1ScannerFront() {
  const p = card1Projector, { panelY, surface, line } = card1Iso;
  return panelY(SCANNER_OUT, 73, 15.5, 26, 22, GLASS, 'fill-opacity=".22" stroke-width=".85"') +
    surface(SCANNER_IN, 73, SCANNER_OUT - SCANNER_IN, 26, 37.5, PAPER, 'stroke-width=".9"') +
    line(p(187, 73, 37.5), p(187, 99, 37.5), 'stroke-opacity=".5"');
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
  const outX = placeAt + BELT_SPEED * (1 - placed) + BELT_SPEED * phase;
  const outgoing = parcelBox(card1Iso, outX, PARCEL_Y, BELT_TOP, { checked: true, agent: true });
  const back = card1ScannerBack(), front = card1ScannerFront();
  d += outX < SCANNER_IN ? outgoing + back + front : outX < SCANNER_OUT ? back + outgoing + front : back + front + outgoing;

  // Person: lifts the parcel, turns and steps towards the agent, hands it over, turns back.
  const HUMAN_PATH = [[0, 94], [0.16, 94], [0.32, 103], [0.5, 103], [0.7, 95], [1, 94]];
  const humanX = keyframes(phase, HUMAN_PATH);
  const humanHeading = keyframes(phase, [[0, -Math.PI * 0.42], [0.1, -Math.PI * 0.42], [0.3, Math.PI * 0.42], [0.5, Math.PI * 0.42], [0.68, -Math.PI * 0.42], [1, -Math.PI * 0.42]]);
  // The person steps too: legs cycle with distance covered (a stride per 5.4 units at this
  // scale), so they walk between belt and agent rather than gliding, and stand still at each end.
  const humanSpeed = Math.abs(keyframes(Math.min(1, phase + .004), HUMAN_PATH) - keyframes(Math.max(0, phase - .004), HUMAN_PATH)) / .008;
  const humanStride = Math.sin(humanX * TAU / 5.4) * .7 * clamp(humanSpeed / 25);
  const humanLean = keyframes(phase, [[0, 1.2], [0.1, 0.8], [0.32, 0.9], [0.44, 1.2], [0.56, 0.7], [0.9, 0.9], [1, 1.2]]);
  const holding = keyframes(phase, [[0, 1], [0.42, 1], [0.5, 0], [0.9, 0], [1, 1]]);

  // Agent: walks over to the person, takes the parcel, turns and walks back to the outgoing belt.
  const ROBOT_PATH = [[0, 128], [0.32, 117.5], [0.5, 117.5], [0.72, 135], [0.86, 135], [1, 128]];
  const robotX = keyframes(phase, ROBOT_PATH);
  const robotHeading = keyframes(phase, [[0, -Math.PI * 0.46], [0.48, -Math.PI * 0.46], [0.6, Math.PI * 0.46], [0.86, Math.PI * 0.46], [1, -Math.PI * 0.46]]);
  const robotHold = keyframes(phase, [[0, 0], [0.38, 0], [0.44, 1], [0.8, 1], [0.86, 0], [1, 0]]);
  // Walking: the legs cycle with distance covered (one stride every 6.4 units), so the feet
  // never slide, and they settle together whenever the agent stands still.
  const speed = Math.abs(keyframes(Math.min(1, phase + .004), ROBOT_PATH) - keyframes(Math.max(0, phase - .004), ROBOT_PATH)) / .008;
  const walking = clamp(speed / 30);
  const robotStride = Math.sin(robotX * TAU / 6.4) * walking;

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
    y: 84,
    z: (1 - Math.abs(robotStride)) * .35 * walking,
    stride: robotStride,
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
      if (f.i === RADCAM.door) return d + arch(f, 26.15, .26, .74, 1.6, 8.6, 3.2, GLASS, 'fill-opacity=".9" stroke-width="1.0"');
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
 * Modern office in the operators' coral throughout: glazed lobby behind slim columns,
 * entrance and canopy, four floors of ribbon glazing over solid spandrels, a parapet
 * and a louvred plant room.
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
  out += panelX(ox + 18, fy - 1.85, 0, 8, 7.4, GLASS, `fill-opacity=".95" stroke="${CORAL}" stroke-width=".95"`);
  out += line(p(ox + 22, fy - 1.8, 0), p(ox + 22, fy - 1.8, 7.4), `stroke="${CORAL}" stroke-width=".7"`);
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
  out += box(ox + 15, fy - 1, 14, 6, 0.9, PAPER, PAPER, SHADE, lobby - 1.4, `stroke="${CORAL}" stroke-width=".9"`);

  // Parapet, roof deck, plant room with louvres and a roof light.
  out += box(ox, oy, w, d, 1.6, PAPER, PAPER, SHADE, top, 'stroke-width=".85"');
  out += surface(ox + 1.4, oy + 1.4, w - 2.8, d - 2.8, top + 1.0, SHADE, 'stroke-width=".55"');
  out += box(ox + 8, oy + 6, 18, 14, 6.5, PAPER, PAPER, SHADE, top + 1.0, 'stroke-width=".8"');
  for (let z = top + 2.6; z < top + 7; z += 1.2) out += line(p(ox + 9.5, oy + 20.05, z), p(ox + 24.5, oy + 20.05, z), 'stroke-width=".45" stroke-opacity=".7"');
  out += surface(ox + 30, oy + 22, 8, 10, top + 1.1, GLASS, `stroke="${CORAL}" stroke-width=".9"`);
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
  const R = { id: 'c2-res-walk', colour: BLUE, home: [73, 92], meet: [82, 85] };
  const O = { id: 'c2-op-walk', colour: CORAL, home: [127, 72], meet: [90.5, 79.5] };
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
// Seen straight on, with the floor as a single line. A shallow-water fish is being given a
// deep-sea diving suit, the same suit that swims through Views from the Reef. The suit sits on
// the floor facing us, its hull a light mesh, while a researcher stands back with a clipboard
// scratching their head and a welder fuses the suit's shoulder.
// ============================================================================
// The suit is drawn like the reef's wire meshes: a body barely lighter than the water, fine
// outlines and faint seams, with coral kept for a few marks.
const SUIT_FILL = '#0F1D3C';
const SUIT_STYLE = { fill: SUIT_FILL, stroke: DEEP_LINE, width: .75, extra: 'stroke-opacity=".85"' };
const SEAM = `stroke="${DEEP_LINE}" stroke-width=".42" stroke-opacity=".3"`;
const STAGE_FLOOR = 284;
const STAGE_STEPS = 160;   // frames in the eight-second loop
// The scene's frame, cropped to the people and the suit; the floor runs its full width.
const STAGE_VIEW = { x: 78, y: 70, w: 424, h: 220 };

// x runs across, z up and y into the scene. A slight downward look lets the rounded parts read
// as round while the floor stays a line.
function frontProjector({ originX, originY, scale, pitch }) {
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const project = (x, y, z = 0) => [number(originX + scale * x), number(originY - scale * (z * cp + y * sp))];
  project.sphereOutline = (centre, radius, samples = 18) => {
    const [cx, cy] = project(...centre);
    return Array.from({ length: samples }, (_, i) => [cx + radius * scale * Math.cos((TAU * i) / samples), cy + radius * scale * Math.sin((TAU * i) / samples)]);
  };
  project.depth = ([, y, z]) => -y * cp + z * sp;
  project.scale = scale;
  return project;
}
const stage = frontProjector({ originX: 330, originY: STAGE_FLOOR, scale: 3.8, pitch: 0.12 });

const suitCapsule = (a, rA, b, rB, opts) => capsule(stage, a, rA, b, rB, { ...SUIT_STYLE, ...opts });
const path = (pts, extra) => `<path d="M${pts.map(pt => pair(stage(...pt))).join(' L')}" fill="none" ${extra}/>`;

// A sphere with its equator and a meridian traced on it, like the joints of a hard diving suit.
function meshBall(c, r) {
  const [cx, cy] = stage(...c), R = r * stage.scale;
  return `<circle cx="${cx}" cy="${cy}" r="${number(R)}" fill="${SUIT_FILL}" stroke="${DEEP_LINE}" stroke-width=".75" stroke-opacity=".85"/>`
    + `<ellipse cx="${cx}" cy="${cy}" rx="${number(R)}" ry="${number(R * .34)}" fill="none" ${SEAM}/>`
    + `<ellipse cx="${cx}" cy="${cy}" rx="${number(R * .34)}" ry="${number(R)}" fill="none" ${SEAM}/>`;
}

// A rotary joint ring across a limb at c, the limb running from a to b.
function jointRing(a, b, c, r, extra = SEAM) {
  const [ax, ay] = stage(...a), [bx, by] = stage(...b), [cx, cy] = stage(...c);
  const angle = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI + 90;
  return `<ellipse cx="${cx}" cy="${cy}" rx="${number(r * stage.scale)}" ry="${number(r * stage.scale * .3)}" transform="rotate(${number(angle)} ${cx} ${cy})" fill="none" ${extra}/>`;
}

// A limb from a to b, ringed at its joints.
function limb(a, rA, b, rB, rings = [.5]) {
  let out = suitCapsule(a, rA, b, rB);
  for (const t of rings) out += jointRing(a, b, mix3(a, b, t), lerp(rA, rB, t));
  return out;
}

// The barrel hull, an ellipsoid sat on the suit's seat.
const HULL = { z: 21, a: 14, b: 11, h: 13.5 };
const hullPoint = (lat, lon) => [HULL.a * Math.cos(lat) * Math.sin(lon), -HULL.b * Math.cos(lat) * Math.cos(lon), HULL.z + HULL.h * Math.sin(lat)];
const degrees = d => (d * Math.PI) / 180;
const latitude = (lat, from = -90, to = 90) =>
  Array.from({ length: 25 }, (_, i) => hullPoint(degrees(lat), degrees(from + ((to - from) * i) / 24)));
const meridian = lon => Array.from({ length: 25 }, (_, i) => hullPoint(degrees(-90 + (180 * i) / 24), degrees(lon)));

// Shoulder, elbow and wrist of each arm; the claw rests on the floor.
const ARM = side => ({
  shoulder: [side * 15.2, -1, 29],
  elbow: [side * 19.2, -1.5, 18.6],
  wrist: [side * 20.6, -2.5, 9.2],
});
const WELD = [18.4, -2.6, 30.4];
const DOME = { c: [0, 0, 44.8], r: 10.6 };

function clawMarkup(side, grip) {
  const { elbow, wrist } = ARM(side);
  const dir = unit3(sub3(wrist, elbow));
  const spread = [1, 0, 0];
  let out = '';
  for (const jaw of [1, -1]) {
    const base = add3(wrist, mul3(dir, 1.2));
    const knuckle = add3(add3(wrist, mul3(dir, 4.4)), mul3(spread, jaw * (1.2 + grip * 1.8)));
    const tip = add3(add3(wrist, mul3(dir, 7.6)), mul3(spread, jaw * (0.4 + grip * 0.9)));
    out += suitCapsule(base, 1.15, knuckle, 1.0);
    out += suitCapsule(knuckle, 1.0, tip, 0.6);
  }
  return out;
}

function armMarkup(side) {
  const { shoulder, elbow, wrist } = ARM(side);
  let out = limb(shoulder, 2.4, elbow, 2.3, [.45]);
  out += limb(elbow, 2.3, wrist, 2.7, [.4]);
  out += meshBall(elbow, 2.7);
  // A coral band at the wrist.
  out += jointRing(elbow, wrist, add3(wrist, mul3(unit3(sub3(elbow, wrist)), 1.4)), 2.8, `stroke="${CORAL}" stroke-width=".8" stroke-opacity=".8"`);
  out += clawMarkup(side, 0.3);
  out += meshBall(shoulder, 4.4);
  return out;
}

// Seated with the legs out towards us, so the fins stand up in front like a diver's soles.
function legMarkup(side) {
  const hip = [side * 7.4, -2, 4.8], knee = [side * 7.9, -13, 5.4], ankle = [side * 8.2, -22, 4.8];
  // Each fin splays outwards a little, broadening to a ribbed, scalloped tip.
  const splay = side * 0.24, foot = [ankle[0], ankle[2] - 2.2];
  const fin2d = ([dx, z]) => [foot[0] + dx * Math.cos(splay) + z * Math.sin(splay), foot[1] + z * Math.cos(splay) - dx * Math.sin(splay)];
  const finAt = pts => pts.map(pt => { const [fx, fz] = fin2d(pt); return stage(fx, -24.5, fz); });
  const fin = finAt([[-2.2, 0.6], [2.2, 0.6], [5.0, 12.4], [2.6, 11.2], [0, 12.6], [-2.6, 11.2], [-5.0, 12.4]]);
  let out = limb(hip, 3.4, knee, 3.0, []);
  out += limb(knee, 2.9, ankle, 2.5, []);
  out += meshBall(add3(knee, [0, -1.4, 0.6]), 2.4);
  out += `<polygon points="${points(fin)}" fill="${SUIT_FILL}" stroke="none"/>`;
  out += `<polygon points="${points(fin)}" fill="${DEEP_LINE}" fill-opacity=".05" stroke="${DEEP_LINE}" stroke-width=".7" stroke-opacity=".75"/>`;
  for (const rib of [[[-1.1, 1.4], [-2.6, 10.8]], [[1.1, 1.4], [2.6, 10.8]], [[0, 1.4], [0, 11.8]]]) {
    out += `<path d="M${finAt(rib).map(pair).join(' L')}" fill="none" ${SEAM}/>`;
  }
  return out;
}

let suitCache = '';

// Everything that holds still: floor, shadows and the suit itself, up to the dome's collar.
function suitMarkup() {
  if (suitCache) return suitCache;
  const p = stage;
  let s = '';

  // The floor, fading out at both ends, and soft shadows where things meet it.
  s += `<path d="M${STAGE_VIEW.x},${STAGE_FLOOR} H${STAGE_VIEW.x + STAGE_VIEW.w}" fill="none" stroke="url(#redesigners-floor)" stroke-width=".8"/>`;
  for (const [x, w] of [[0, 30], [-55, 8], [34, 8]]) {
    const [cx, cy] = p(x, 0, 0);
    s += `<ellipse cx="${cx}" cy="${number(cy + 1.2)}" rx="${number(w * p.scale)}" ry="1.8" fill="${DEEP_SHADE}" fill-opacity=".55" stroke="none"/>`;
  }

  s += suitCapsule([-8, -1, 5], 5, [8, -1, 5], 5);

  // The hull: an outline, a fine mesh, the coral depth stripe and a headlamp.
  const outline = [];
  for (let i = 0; i <= 12; i++) for (let j = 0; j < 24; j++) outline.push(p(...hullPoint(degrees(-90 + 15 * i), degrees(15 * j))));
  s += `<path d="${roundedPath(hull(outline))}" fill="${SUIT_FILL}" stroke="${DEEP_LINE}" stroke-width=".85" stroke-opacity=".9"/>`;
  for (const lat of [-62, -40, -22, 14, 32, 52]) s += path(latitude(lat), SEAM);
  for (const lon of [-68, -46, -23, 0, 23, 46, 68]) s += path(meridian(lon), SEAM);
  s += path(latitude(-4), `stroke="${CORAL}" stroke-width="1" stroke-opacity=".75"`);
  const [lx, ly] = p(...hullPoint(degrees(36), degrees(-30)));
  s += `<circle cx="${lx}" cy="${ly}" r="2.6" fill="${SUIT_FILL}" stroke="${DEEP_LINE}" stroke-width=".55" stroke-opacity=".8"/><circle cx="${lx}" cy="${ly}" r="1.2" fill="#A9D8F0" fill-opacity=".55" stroke="none"/>`;

  s += armMarkup(-1);
  s += armMarkup(1);
  s += legMarkup(-1);
  s += legMarkup(1);

  // The collar that seats the dome.
  const collar = (r, depth, z) => Array.from({ length: 32 }, (_, i) => p(r * Math.cos((TAU * i) / 32), -depth * Math.sin((TAU * i) / 32), z));
  s += `<polygon points="${points(collar(8.8, 7.2, 34.4))}" fill="${SUIT_FILL}" stroke="${CORAL}" stroke-width=".85" stroke-opacity=".75"/>`;

  suitCache = s;
  return s;
}

const windowed = (t, from, to, edge = 0.025) => smooth((t - from) / edge) * (1 - smooth((t - to) / edge));
// The welder works in two bursts, lifting the torch between them.
const weldPower = phase => Math.max(windowed(phase, 0, 0.38), windowed(phase, 0.5, 0.84));
// The seam glows while the torch is on and cools after it lifts.
const seamHeat = phase => Math.max(...Array.from({ length: 8 }, (_, i) => weldPower((phase - i * 0.012 + 1) % 1) * (1 - i * 0.11)));

function domeMarkup(phase) {
  const p = stage;
  const [dcx, dcy] = p(...DOME.c);
  const r = DOME.r * p.scale;
  let d = `<circle cx="${dcx}" cy="${dcy}" r="${number(r)}" fill="${DEEP_GLASS}" fill-opacity=".38" stroke="none"/>`;

  // Water to near the top, its surface moving a little.
  const waterY = dcy - r * 0.62;
  const half = Math.sqrt(r * r - (r * 0.62) ** 2);
  const surface = Array.from({ length: 13 }, (_, i) => {
    const u = i / 12;
    return [dcx - half + 2 * half * u, waterY + Math.sin(phase * TAU * 2 + u * 3.4) * 0.9];
  });
  d += `<path d="M${surface.map(pair).join(' L')} A${number(r)},${number(r)} 0 1 1 ${pair(surface[0])}Z" fill="${AQUA}" fill-opacity=".05" stroke="none"/>`;
  d += `<path d="M${surface.map(pair).join(' L')}" fill="none" stroke="${AQUA}" stroke-width=".5" stroke-opacity=".45"/>`;
  for (let b = 0; b < 3; b++) {
    const u = (phase * 2 + b / 3) % 1;
    const bx = dcx + (b - 1) * r * 0.42 + Math.sin(u * TAU + b) * 2;
    const by = lerp(dcy + r * 0.7, waterY + 3, u);
    d += `<circle cx="${number(bx)}" cy="${number(by)}" r="${number(1.1 + (1 - u) * 0.6)}" fill="none" stroke="${AQUA}" stroke-width=".5" stroke-opacity="${number(0.55 - u * 0.35)}"/>`;
  }

  // The coral fish, drawn as a fine mesh, swimming from side to side inside the glass.
  const swim = phase * TAU * 2;
  const fx = dcx + Math.sin(swim) * r * 0.36;
  const fy = dcy + r * 0.12 + Math.sin(swim * 2) * r * 0.08;
  const dir = Math.cos(swim) >= 0 ? 1 : -1;
  // Turning at each side of the dome, the fish narrows but never vanishes edge-on.
  const turn = 0.38 + 0.62 * Math.min(1, Math.abs(Math.cos(swim)) * 3.5);
  const wag = Math.sin(phase * TAU * 14) * 2.2;
  const k = 1.55;
  const at = (u, v) => [fx + dir * turn * u * k, fy + v * k];
  const body = [[8.6, 0], [5.4, -3.9], [0, -5], [-4.6, -3], [-7.2, -0.9], [-11, -4.6 + wag], [-9, wag * 0.5], [-11, 4.6 + wag], [-7.2, 0.9], [-4.6, 3], [0, 5], [5.4, 3.9]].map(([u, v]) => at(u, v));
  d += `<polygon points="${points(body)}" fill="${CORAL}" fill-opacity=".22" stroke="${CORAL}" stroke-width=".8"/>`;
  const rib = u => { const h = 5 * Math.sqrt(Math.max(0, 1 - ((u - 0.4) / 8.6) ** 2)); return [at(u, -h * .96), at(u + 0.8, 0), at(u, h * .96)]; };
  for (const u of [-3.4, 0, 3.6]) d += `<path d="M${rib(u).map(pair).join(' L')}" fill="none" stroke="${CORAL}" stroke-width=".55" stroke-opacity=".8"/>`;
  d += `<path d="M${[at(7.6, 0), at(0, 0.4), at(-7, 0)].map(pair).join(' L')}" fill="none" stroke="${CORAL}" stroke-width=".55" stroke-opacity=".8"/>`;
  const [ex, ey] = at(5.2, -1.1);
  d += `<circle cx="${number(ex)}" cy="${number(ey)}" r="1.1" fill="${PAPER}" stroke="none"/>`;

  // A glint, the rim, and the front of the collar over the dome's base.
  d += `<path d="M${pair([dcx - r * 0.72, dcy - r * 0.28])} A${number(r * 0.78)},${number(r * 0.78)} 0 0 1 ${pair([dcx - r * 0.3, dcy - r * 0.72])}" fill="none" stroke="${PAPER}" stroke-width=".9" stroke-opacity=".32" stroke-linecap="round"/>`;
  d += `<circle cx="${dcx}" cy="${dcy}" r="${number(r)}" fill="none" stroke="#A9C6F5" stroke-width=".85" stroke-opacity=".9"/>`;
  const front = Array.from({ length: 17 }, (_, i) => p(8.8 * Math.cos(Math.PI * i / 16), -7.2 * Math.sin(Math.PI * i / 16), 34.4));
  d += `<path d="M${front.map(pair).join(' L')}" fill="none" stroke="${CORAL}" stroke-width=".85" stroke-opacity=".75"/>`;
  return d;
}

function seamMarkup(phase) {
  const heat = seamHeat(phase), power = weldPower(phase);
  const { shoulder } = ARM(1);
  const [cx, cy] = stage(...shoulder), r = 4.7 * stage.scale;
  const glow = mix3([255, 102, 85], [255, 209, 102], heat).map(Math.round);
  let out = `<path d="M${pair([cx + r * Math.cos(-1.15), cy + r * Math.sin(-1.15)])} A${number(r)},${number(r)} 0 0 1 ${pair([cx + r * Math.cos(1.0), cy + r * Math.sin(1.0)])}" fill="none" stroke="rgb(${glow.join(',')})" stroke-width="${number(0.7 + heat * 0.7)}" stroke-opacity="${number(0.25 + heat * 0.55)}" stroke-linecap="round"/>`;
  if (power > 0.02) {
    const [wx, wy] = stage(...WELD);
    const flicker = 0.8 + 0.2 * Math.sin(phase * TAU * 40);
    out += `<circle cx="${wx}" cy="${wy}" r="${number(18 * (0.7 + 0.3 * flicker))}" fill="url(#redesigners-glow)" opacity="${number(0.75 * power * flicker)}" stroke="none"/>`;
  }
  return out;
}

// The researcher's free hand goes up to scratch their head, then back down to the clipboard.
const CLIPBOARD_KEYS = [[0, 'head'], [0.36, 'head'], [0.44, 'board'], [0.9, 'board'], [0.98, 'head'], [1, 'head']];

function researcherMarkup(phase) {
  const x = -55, y = 0, heading = Math.PI / 2 + 0.95;
  const frame = bodyFrame(x, y, heading);
  const scratch = Math.sin(phase * TAU * 18);
  const tap = Math.max(0, Math.sin(phase * TAU * 10));
  const poses = {
    head: frame.local(1.8 + scratch * 0.5, 0.2, 44.4 + Math.abs(scratch) * 0.6),
    board: frame.local(-0.4, 6.6, 27.6 + tap * 0.9),
  };
  const leans = { head: 0.3, board: 0.75 };
  let i = 0;
  while (CLIPBOARD_KEYS[i + 1][0] < phase) i++;
  const [t0, from] = CLIPBOARD_KEYS[i], [t1, to] = CLIPBOARD_KEYS[i + 1];
  const t = smooth((phase - t0) / Math.max(1e-6, t1 - t0));
  return human3DMarkup(stage, {
    id: 'redesigner-clipboard',
    x, y,
    scale: 1,
    heading: heading + 0.06 * Math.sin(phase * TAU),
    lean: lerp(leans[from], leans[to], t),
    color: CORAL,
    fillPaper: DEEP_BG,
    shadowColor: 'none',
    leftTarget: frame.local(-2.6, 6.2, 26.4),
    rightTarget: mix3(poses[from], poses[to], t),
    holdingBoard: true,
  });
}

function welderMarkup(phase) {
  const power = weldPower(phase);
  const x = 34, y = -3, heading = -(Math.PI / 2 + 0.5);
  const frame = bodyFrame(x, y, heading);
  const sway = Math.sin(phase * TAU * 4) * 0.4 * power;
  // Between bursts the torch lifts away from the seam.
  const target = add3(WELD, [3.2 * (1 - power), -1 * (1 - power), 3.4 * (1 - power)]);
  return human3DMarkup(stage, {
    id: 'redesigner-welder',
    x, y,
    scale: 1,
    heading,
    lean: 0.75 + 0.35 * power,
    color: CORAL,
    fillPaper: DEEP_BG,
    shadowColor: 'none',
    welderMask: true,
    leftTarget: frame.local(-1.4, 6.6, 29.6 + sway),
    rightTarget: frame.local(1.4, 6.6, 29.6 + sway),
    blowtorchTarget: target,
    sparkPhase: phase * 6,
    torchPower: power,
  });
}

const redesignersFrames = new Map();

function redesignersMarkup(step) {
  if (redesignersFrames.has(step)) return redesignersFrames.get(step);
  const phase = step / STAGE_STEPS;
  const out = researcherMarkup(phase) + domeMarkup(phase) + seamMarkup(phase) + welderMarkup(phase);
  redesignersFrames.set(step, out);
  return out;
}

export function initRedesigners(stageElement) {
  const svg = stageElement?.querySelector('[data-redesigners-svg]');
  if (!svg) return () => {};

  const defs = '<defs>'
    + `<linearGradient id="redesigners-floor" x1="0" x2="1"><stop offset="0" stop-color="${DEEP_LINE}" stop-opacity="0"/><stop offset=".14" stop-color="${DEEP_LINE}" stop-opacity=".55"/><stop offset=".86" stop-color="${DEEP_LINE}" stop-opacity=".55"/><stop offset="1" stop-color="${DEEP_LINE}" stop-opacity="0"/></linearGradient>`
    + `<radialGradient id="redesigners-glow"><stop offset="0" stop-color="${SPARK}" stop-opacity=".5"/><stop offset=".45" stop-color="${CORAL}" stop-opacity=".14"/><stop offset="1" stop-color="${CORAL}" stop-opacity="0"/></radialGradient>`
    + '</defs>';
  svg.setAttribute('viewBox', `${STAGE_VIEW.x} ${STAGE_VIEW.y} ${STAGE_VIEW.w} ${STAGE_VIEW.h}`);
  svg.setAttribute('preserveAspectRatio', 'xMinYMax meet');
  stageElement.style.setProperty('--stage-ratio', `${STAGE_VIEW.w} / ${STAGE_VIEW.h}`);
  svg.innerHTML = `${defs}<g stroke="${DEEP_LINE}" stroke-width=".9" stroke-linejoin="round" stroke-linecap="round">${suitMarkup()}<g data-redesigners-dynamic></g></g>`;
  const dynamic = svg.querySelector('[data-redesigners-dynamic]');
  let lastStep = -1;

  const render = (timeSeconds = 0, reducedMotion = false) => {
    const step = reducedMotion ? 22 : Math.floor((((timeSeconds / 8) % 1) + 1) % 1 * STAGE_STEPS);
    if (step !== lastStep) {
      lastStep = step;
      dynamic.innerHTML = redesignersMarkup(step);
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
