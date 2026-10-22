// An anchor whose rope is hitched round a full-width line. It is lowered as the page scrolls and
// comes to rest on the seabed at the foot of the page; pressing it returns to the top. The page
// names the line and the seabed in data-line and data-seabed on the anchor's root. CSS sticky positioning does the lowering. This module sets the length of the rope's
// run, draws the anchor as a small solid in 3D, and plays the landing: dust in proportion to the
// speed of arrival, a slackening rope, and chips of rock when it comes down hard.

const BLUE = [36, 78, 255];
const PALE = [183, 198, 255];
const SILT = [196, 205, 228];
const LIGHT = [-.35, -.6, .72];
const HITCH = 8;               // .sea-anchor sits this far above the line so the hitch can wrap it
const LINK_MARGIN = 24;        // .sea-anchor-link margin-bottom: room for dust below the seabed
const ROPE_TAIL = 6;           // from the rope's join at the link's top to the ring
const MODEL_HEIGHT = 42.4;     // ring top to crown, outline included, at scale 1
const SINK = .6;               // how far a resting anchor beds into the sand
const REST_YAW = .62;
const REST_ROLL = -.42;
const PITCH = .3;
const FOCAL = 170;
const YAW_DRIVE = .0024;       // radians per second of twist per pixel of rope paid out
const SWAY_DRIVE = .05;

const ARM_Y = 25, ARM_R = 14.5, TIP = 105 * Math.PI / 180, DEPTH = 1.3, STOCK_Y = 12.5;

const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const lightLength = Math.hypot(...LIGHT);
const shade = normal => .25 + .75 * Math.max(0, dot(normal, LIGHT) / lightLength);

// Landing speed in px/ms to a 0–1 impact. A gentle scroll barely stirs the sand; a flick lands hard.
export const landingImpact = speed => clamp((speed - .2) / 3.6);

// The arms are heaviest at the crown and taper towards the flukes.
const armWidth = phi => 4.6 - 2.2 * (Math.abs(phi) / TIP) ** 1.2;
const armEdge = (phi, side) => {
  const r = ARM_R + side * armWidth(phi) / 2;
  return [r * Math.sin(phi), ARM_Y + r * Math.cos(phi)];
};

// A barbed fluke at the end of each arm, listed in the order the outline passes it.
function fluke(side) {
  const phi = side * TIP;
  const end = [ARM_R * Math.sin(phi), ARM_Y + ARM_R * Math.cos(phi)];
  const onward = [side * Math.cos(phi), -side * Math.sin(phi)], outward = [Math.sin(phi), Math.cos(phi)];
  const at = (along, across) => [end[0] + onward[0] * along + outward[0] * across, end[1] + onward[1] * along + outward[1] * across];
  const points = [at(-1.4, -4.1), at(5.2, 0), at(-1.4, 4.1)];
  return side > 0 ? points : points.reverse();
}

// The anchor's flat silhouette in model units (CSS pixels at scale 1): the ring's top at the origin,
// y down. Shank, arms and flukes form one outline, which is then given thickness.
export function anchorOutline(steps = 14) {
  const topHalf = 1.35, footHalf = 1.95, shankTop = 7.6;
  const join = Math.asin(footHalf / (ARM_R - armWidth(0) / 2));
  const points = [[-topHalf, shankTop], [topHalf, shankTop]];
  for (let i = 0; i <= steps; i++) points.push(armEdge(join + (TIP - join) * i / steps, -1));
  points.push(...fluke(1));
  for (let i = 0; i <= steps * 2; i++) points.push(armEdge(TIP - TIP * i / steps, 1));
  points.push(...fluke(-1));
  for (let i = 0; i <= steps; i++) points.push(armEdge(-TIP + (TIP - join) * i / steps, -1));
  return points;
}

function stockHalf(z0, z1) {
  const x = 1, y0 = STOCK_Y - 1.05, y1 = STOCK_Y + 1.05;
  return {
    front: z0 > 0,
    faces: [
      { normal: [0, -1, 0], points: [[-x, y0, z0], [x, y0, z0], [x, y0, z1], [-x, y0, z1]] },
      { normal: [0, 1, 0], points: [[-x, y1, z0], [x, y1, z0], [x, y1, z1], [-x, y1, z1]] },
      { normal: [-1, 0, 0], points: [[-x, y0, z0], [-x, y1, z0], [-x, y1, z1], [-x, y0, z1]] },
      { normal: [1, 0, 0], points: [[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]] },
    ],
    ball: [0, STOCK_Y, z0 > 0 ? 11.4 : -11.4],
  };
}

// The stock crosses the arms at right angles, as on a real anchor, so turning shows its depth.
export function anchorModel() {
  const outline = anchorOutline();
  let area = 0;
  outline.forEach((p, i) => { const q = outline[(i + 1) % outline.length]; area += p[0] * q[1] - q[0] * p[1]; });
  const turn = Math.sign(area);
  return {
    front: outline.map(([x, y]) => [x, y, DEPTH]),
    back: outline.map(([x, y]) => [x, y, -DEPTH]),
    sides: outline.map((p, i) => {
      const q = outline[(i + 1) % outline.length], dx = q[0] - p[0], dy = q[1] - p[1], length = Math.hypot(dx, dy) || 1;
      return [turn * dy / length, -turn * dx / length, 0];
    }),
    ring: Array.from({ length: 25 }, (_, i) => {
      const a = i / 24 * Math.PI * 2;
      return [Math.sin(a) * 3.3, 4.4 - Math.cos(a) * 3.3, 0];
    }),
    stocks: [stockHalf(-11, -DEPTH), stockHalf(DEPTH, 11)],
  };
}

function rotate(x, y, px, py, angle) {
  const c = Math.cos(angle), s = Math.sin(angle), dx = x - px, dy = y - py;
  return [px + dx * c - dy * s, py + dx * s + dy * c];
}

// Turns about the shank, tips towards a slightly raised eye, then sways about the ring and rolls
// about the crown. Directions turn the same way without the pivots.
function orient([x0, y0, z0], { yaw, sway, roll }, pivots = true) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  let x = x0 * cy + z0 * sy, z = -x0 * sy + z0 * cy;
  const centre = pivots ? 21 : 0, yc = y0 - centre, cp = Math.cos(PITCH), sp = Math.sin(PITCH);
  let y = centre + yc * cp + z * sp;
  z = -yc * sp + z * cp;
  [x, y] = rotate(x, y, 0, 0, sway);
  [x, y] = rotate(x, y, 0, pivots ? 41.8 : 0, roll);
  return [x, y, z];
}

export function project(point, state) {
  const [x, y, z] = orient(point, state), k = FOCAL / (FOCAL - z), scale = state.scale ?? 1;
  return [x * k * scale, (21 + (y - 21) * k) * scale, z, k * scale];
}

// One landing's worth of sediment. Positions are relative to the contact point on the seabed.
export function landingBurst(impact, random = Math.random, { rocks = true } = {}) {
  const particles = [];
  for (let i = 0, n = 2 + Math.round(impact * 2); i < n; i++) particles.push({
    kind: 'cloud', x: (random() - .5) * 10, y: -2, vx: (random() - .5) * (10 + 30 * impact), vy: -3 - 6 * random(),
    r0: 3, r1: 10 + 20 * impact * (.6 + random() * .4), alpha: .07 + .11 * impact, life: 1.4 + impact * .8 + random() * .4, age: 0,
  });
  for (let i = 0, n = 7 + Math.round(impact * 30); i < n; i++) {
    const side = random() < .5 ? -1 : 1, speed = (12 + 70 * impact) * (.4 + random() * .8);
    particles.push({
      kind: 'dust', x: (random() - .5) * 14, y: -random() * 2, vx: side * speed * (.6 + random() * .4), vy: -4 - (6 + 40 * impact) * random(),
      r: .5 + random() * 1.1, alpha: .5, life: 1 + random() * 1.2 + impact * .6, age: 0,
    });
  }
  if (rocks && impact > .55) for (let i = 0, n = 2 + Math.round((impact - .55) / .45 * 5); i < n; i++) {
    const side = random() < .5 ? -1 : 1;
    particles.push({
      kind: 'rock', x: side * (3 + random() * 8), y: -1, vx: side * (25 + random() * 70) * impact, vy: -(70 + random() * 110) * impact,
      size: 1.6 + random() * 1.8, angle: random() * Math.PI, spin: (random() - .5) * 14, life: 1.8 + random() * .8, age: 0,
    });
  }
  return particles;
}

// Advances one particle; returns false once it has faded. y is measured up from the seabed (negative).
export function stepParticle(p, dt) {
  p.age += dt;
  if (p.age >= p.life) return false;
  if (p.kind === 'rock') {
    p.vy += 600 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.angle += p.spin * dt;
    if (p.y > -p.size / 2) {
      p.y = -p.size / 2;
      p.vy = Math.abs(p.vy) < 24 ? 0 : -p.vy * .32;
      p.vx *= .6; p.spin *= .5;
    }
  } else {
    const drag = Math.exp(-(p.kind === 'cloud' ? 1.6 : 2.6) * dt);
    p.vx *= drag;
    p.vy = p.vy * drag + 14 * dt;
    p.x += p.vx * dt;
    p.y = Math.min(p.y + p.vy * dt, 0);
  }
  return true;
}

export function initSeaAnchor(root, { darkAt = () => false } = {}) {
  const link = root.querySelector('.sea-anchor-link');
  const canvas = root.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const line = document.querySelector(root.dataset.line), lineEdge = root.dataset.lineEdge || 'bottom';
  const seabed = document.querySelector(root.dataset.seabed), inset = Number(root.dataset.seabedInset) || 0;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const model = anchorModel();
  let reduced = motion.matches;
  let ready = false, frame = 0, lastFrame = 0, hovered = false;
  let width = 0, height = 0, dpr = 1, joinX = 0, joinY = 0, hangTop = 0;
  let linkHeight = 54, scale = 1, rope = '#8e9ac0', ropeShade = '#68749c', ropeWidth = 3, ropeTail = -1;
  let lastY = scrollY, lastT = performance.now(), speed = 0;
  let resting = false, distance = Infinity;
  let yaw = REST_YAW, yawVel = 0, sway = 0, swayVel = 0;
  let rest = 0, restVel = 0, slack = 0, slackVel = 0, slackTarget = 0, bounce = 0, bounceVel = 0;
  let colour = 0, colourTarget = 0, shadow = 0;
  let particles = [];

  function layout() {
    const top = line.getBoundingClientRect()[lineEdge] + scrollY - HITCH;
    const floor = seabed.getBoundingClientRect().bottom + scrollY - inset;
    root.style.top = `${top}px`;
    root.style.height = `${Math.max(0, floor + LINK_MARGIN - top)}px`;
    root.hidden = false;
    dpr = Math.min(2, devicePixelRatio || 1);
    width = canvas.clientWidth; height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    const box = canvas.getBoundingClientRect(), anchor = link.getBoundingClientRect();
    joinX = anchor.left + anchor.width / 2 - box.left;
    joinY = anchor.top - box.top;
    linkHeight = anchor.height;
    scale = (linkHeight - ROPE_TAIL) / MODEL_HEIGHT;
    hangTop = parseFloat(getComputedStyle(link).top) || 0;
    const style = getComputedStyle(root);
    rope = style.getPropertyValue('--rope').trim() || rope;
    ropeShade = style.getPropertyValue('--rope-shade').trim() || ropeShade;
    ropeWidth = parseFloat(style.getPropertyValue('--rope-w')) || ropeWidth;
  }

  // A curved length of rope, with its lay crossing it at the CSS rope's angle and spacing.
  function drawRope(points) {
    const at = t => points[0].map((_, k) => (1 - t) ** 3 * points[0][k] + 3 * (1 - t) ** 2 * t * points[1][k] + 3 * (1 - t) * t ** 2 * points[2][k] + t ** 3 * points[3][k]);
    ctx.beginPath(); ctx.moveTo(...points[0]); ctx.bezierCurveTo(...points[1], ...points[2], ...points[3]);
    ctx.lineCap = 'butt'; ctx.lineWidth = ropeWidth; ctx.strokeStyle = rope; ctx.stroke();
    const half = ropeWidth / 2;
    let previous = points[0], travelled = 0, next = 2;
    ctx.beginPath();
    for (let i = 1; i <= 64; i++) {
      const point = at(i / 64), dx = point[0] - previous[0], dy = point[1] - previous[1], length = Math.hypot(dx, dy);
      travelled += length;
      if (length && travelled >= next) {
        const tx = dx / length, ty = dy / length, nx = ty, ny = -tx;
        ctx.moveTo(point[0] + (nx - tx) * half, point[1] + (ny - ty) * half);
        ctx.lineTo(point[0] - (nx - tx) * half, point[1] - (ny - ty) * half);
        next += 4;
      }
      previous = point;
    }
    ctx.lineWidth = .83; ctx.strokeStyle = ropeShade; ctx.stroke();
  }

  function settleNow() {
    yaw = REST_YAW; yawVel = sway = swayVel = restVel = slackVel = bounce = bounceVel = 0;
    rest = resting ? 1 : 0; slack = slackTarget; colour = colourTarget;
    shadow = resting ? 1 : clamp(1 - distance / 140) ** 2;
    particles = [];
  }

  function land(arrival) {
    const impact = landingImpact(arrival);
    slackTarget = .3 + .7 * impact;
    if (reduced || !ready) return;
    bounceVel = -(14 + 70 * impact);
    swayVel *= .3;
    particles.push(...landingBurst(impact));
  }

  function liftOff(departure) {
    slackTarget = 0;
    if (reduced || !ready) return;
    particles.push(...landingBurst(clamp(departure / 4) * .35, Math.random, { rocks: false }));
  }

  function update() {
    const now = performance.now(), y = scrollY, dy = y - lastY;
    const previous = speed;
    speed = speed * .5 + dy / Math.max(1, now - lastT) * .5;
    lastY = y; lastT = now;
    const box = root.getBoundingClientRect(), anchor = link.getBoundingClientRect();
    distance = Math.max(0, box.bottom - LINK_MARGIN - anchor.bottom);
    const landed = distance <= .75;
    if (!reduced && ready && !landed && Math.abs(anchor.top - hangTop) < 1) {
      yawVel += dy * YAW_DRIVE;
      swayVel += (speed - previous) * SWAY_DRIVE;
    }
    if (landed !== resting) {
      resting = landed;
      if (landed) land(Math.max(0, speed)); else liftOff(Math.max(0, -speed));
    }
    colourTarget = darkAt(anchor.top + anchor.height / 2) ? 1 : 0;
    root.classList.toggle('on-deep', colourTarget === 1);
    // Only the hitch's loop would show above a line sitting on the bottom edge of the screen.
    root.classList.toggle('line-hidden', box.top + HITCH >= innerHeight - 2);
    if (!ready || reduced) settleNow();
    wake();
  }

  function spring(value, velocity, target, stiffness, damping, dt) {
    velocity += (stiffness * (target - value) - damping * velocity) * dt;
    return [value + velocity * dt, velocity];
  }

  function step(dt) {
    [yaw, yawVel] = spring(yaw, yawVel, REST_YAW, resting ? 30 : 2.2, resting ? 12 : 2.4, dt);
    [sway, swayVel] = spring(sway, swayVel, 0, 9, resting ? 9 : 1.6, dt);
    [rest, restVel] = spring(rest, restVel, resting ? 1 : 0, 70, 10, dt);
    [slack, slackVel] = spring(slack, slackVel, slackTarget, 40, 5.5, dt);
    [bounce, bounceVel] = spring(bounce, bounceVel, 0, 320, 22, dt);
    colour += clamp((colourTarget - colour) * dt * 4, -1, 1);
    const shadowTarget = resting ? 1 : clamp(1 - distance / 140) ** 2;
    shadow += (shadowTarget - shadow) * clamp(dt * 8);
    particles = particles.filter(p => stepParticle(p, dt));
    return Math.abs(yaw - REST_YAW) > .002 || Math.abs(yawVel) > .002 || Math.abs(sway) > .0008 || Math.abs(swayVel) > .001
      || Math.abs(rest - (resting ? 1 : 0)) > .001 || Math.abs(restVel) > .001 || Math.abs(slack - slackTarget) > .002 || Math.abs(slackVel) > .002
      || Math.abs(bounce) > .05 || Math.abs(bounceVel) > .05 || particles.length > 0
      || Math.abs(colour - colourTarget) > .005 || Math.abs(shadow - shadowTarget) > .005;
  }

  function polygon(points, ox, oy) {
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(ox + x, oy + y) : ctx.moveTo(ox + x, oy + y));
    ctx.closePath();
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const ink = mix(BLUE, PALE, colour).join(',');
    const state = { yaw, sway, roll: REST_ROLL * rest, scale };
    const front = model.front.map(p => project(p, state)), back = model.back.map(p => project(p, state));
    const ring = model.ring.map(p => project(p, state));
    const stocks = model.stocks.map(half => ({
      ...half,
      faces: half.faces.map(face => ({ normal: orient(face.normal, state, false), points: face.points.map(p => project(p, state)) })),
      ball: project(half.ball, state),
    }));
    let lowest = -Infinity;
    for (const p of [...front, ...back, ...ring]) lowest = Math.max(lowest, p[1]);
    for (const half of stocks) lowest = Math.max(lowest, half.ball[1] + 1.85 * half.ball[3]);
    const ox = joinX, oy = joinY + ROPE_TAIL + clamp(rest) * (linkHeight - ROPE_TAIL + SINK - lowest - .6) + bounce;
    const floor = joinY + linkHeight;
    const outline = Math.min(1.2, scale) * 1.15, lift = hovered ? .08 : 0;

    if (shadow > .01) {
      ctx.fillStyle = `rgba(4,9,24,${(.34 * shadow).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(ox - 6 * clamp(rest), floor + .5, 19 - 4 * shadow, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const p of particles) if (p.kind === 'cloud') {
      // Clouds billow up from the seabed rather than spreading below it.
      const t = p.age / p.life, r = p.r0 + (p.r1 - p.r0) * (1 - (1 - t) ** 3), cx = ox + p.x, cy = floor + p.y - r * .4;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      gradient.addColorStop(0, `rgba(${SILT.join(',')},${(p.alpha * (1 - t) ** 1.4).toFixed(3)})`);
      gradient.addColorStop(1, `rgba(${SILT.join(',')},0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath(); ctx.ellipse(cx, cy, r, r * .62, 0, 0, Math.PI * 2); ctx.fill();
    }

    // While the rope hangs straight, the CSS rope runs on to the ring; once it slackens the canvas
    // draws the last stretch as a curve. Either way it ends under the ring's top, which covers it.
    const rx = ox + ring[0][0], ry = oy + ring[0][1] + .6 * scale, s = Math.max(0, slack);
    const taut = s < .01 && Math.abs(rx - joinX) < .3;
    const tail = taut ? Math.round((ry - joinY) * 2) / 2 : 0;
    if (tail !== ropeTail) { link.style.setProperty('--rope-tail', `${tail}px`); ropeTail = tail; }
    if (!taut) {
      const c1x = joinX + (rx - joinX) / 3, c1y = Math.min(floor - 1, joinY + (ry - joinY) / 3 + 26 * s);
      const c2x = joinX + (rx - joinX) * 2 / 3 + 7 * s, c2y = Math.min(floor - 1, joinY + (ry - joinY) * 2 / 3 + 14 * s);
      drawRope([[joinX, joinY - .5], [c1x, c1y], [c2x, c2y], [rx, ry]]);
    }

    const drawStock = half => {
      for (const face of half.faces) {
        if (face.normal[2] <= 0) continue;
        polygon(face.points, ox, oy);
        ctx.fillStyle = `rgba(${ink},${(.32 + .45 * shade(face.normal) + lift).toFixed(3)})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${ink},.9)`; ctx.lineWidth = outline * .8; ctx.stroke();
      }
      const [bx, by, , bk] = half.ball;
      ctx.beginPath(); ctx.arc(ox + bx, oy + by, 1.85 * bk, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${ink},${(.55 + lift).toFixed(3)})`; ctx.fill();
      ctx.strokeStyle = `rgba(${ink},.95)`; ctx.lineWidth = outline * .8; ctx.stroke();
    };

    const plateNormal = orient([0, 0, 1], state, false);
    const facing = plateNormal[2] >= 0;
    const near = facing ? front : back, far = facing ? back : front;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const half of stocks) if (half.front !== facing) drawStock(half);

    // The far face's edge, then the anchor's thickness, then the face towards the viewer.
    polygon(far, ox, oy);
    ctx.strokeStyle = `rgba(${ink},.32)`; ctx.lineWidth = outline * .8; ctx.stroke();
    const walls = [];
    model.sides.forEach((side, i) => {
      const normal = orient(side, state, false);
      if (normal[2] <= 0) return;
      const j = (i + 1) % near.length;
      walls.push({ normal, points: [near[i], near[j], far[j], far[i]], z: near[i][2] + near[j][2] + far[i][2] + far[j][2] });
    });
    walls.sort((a, b) => a.z - b.z);
    for (const wall of walls) {
      polygon(wall.points, ox, oy);
      ctx.fillStyle = `rgba(${ink},${(.3 + .4 * shade(wall.normal) + lift).toFixed(3)})`;
      ctx.fill();
    }
    polygon(near, ox, oy);
    ctx.fillStyle = `rgba(${ink},${(.14 + .22 * shade(facing ? plateNormal : plateNormal.map(v => -v)) + lift).toFixed(3)})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${ink},.95)`; ctx.lineWidth = outline; ctx.stroke();

    ctx.beginPath();
    ring.forEach(([x, y], i) => i ? ctx.lineTo(ox + x, oy + y) : ctx.moveTo(ox + x, oy + y));
    ctx.strokeStyle = `rgba(${ink},.95)`; ctx.lineWidth = 2.3 * Math.min(1.2, scale); ctx.stroke();
    for (const half of stocks) if (half.front === facing) drawStock(half);

    for (const p of particles) {
      const fade = 1 - p.age / p.life;
      if (p.kind === 'dust') {
        ctx.fillStyle = `rgba(${SILT.join(',')},${(p.alpha * fade ** 1.5).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(ox + p.x, floor + p.y, p.r * (1 + p.age * .6), 0, Math.PI * 2); ctx.fill();
      } else if (p.kind === 'rock') {
        const a = Math.min(1, fade * 2.5), x = ox + p.x, y = floor + p.y;
        ctx.beginPath();
        for (let k = 0; k < 3; k++) {
          const angle = p.angle + k * 2.2;
          ctx[k ? 'lineTo' : 'moveTo'](x + Math.cos(angle) * p.size, y + Math.sin(angle) * p.size * .8);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(20,32,62,${(.85 * a).toFixed(3)})`;
        ctx.strokeStyle = `rgba(${SILT.join(',')},${(.6 * a).toFixed(3)})`;
        ctx.lineWidth = .7;
        ctx.fill(); ctx.stroke();
      }
    }
  }

  function tick(time) {
    frame = 0;
    const dt = Math.min(1 / 30, Math.max(0, (time - lastFrame) / 1000) || 1 / 60);
    lastFrame = time;
    const moving = reduced ? false : step(dt);
    draw();
    if (moving) frame = requestAnimationFrame(tick);
  }

  function wake() {
    if (frame) return;
    lastFrame = performance.now();
    frame = requestAnimationFrame(tick);
  }

  link.addEventListener('click', event => {
    event.preventDefault();
    scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    // From the keyboard, carry on from the top of the page; a pointer leaves no focus behind.
    if (event.detail === 0) document.querySelector('.site-header a')?.focus({ preventScroll: true });
    else link.blur();
  });
  link.addEventListener('pointerenter', () => { hovered = true; wake(); });
  link.addEventListener('pointerleave', () => { hovered = false; wake(); });
  motion.addEventListener('change', () => { reduced = motion.matches; if (reduced) settleNow(); wake(); });

  const relayout = () => { layout(); update(); };
  new ResizeObserver(relayout).observe(document.body);
  addEventListener('load', relayout, { once: true });
  document.fonts?.ready.then(relayout);
  layout();
  update();
  ready = true;
  return update;
}
