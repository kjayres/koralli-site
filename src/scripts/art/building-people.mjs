// Building-local figures.
// Every joint and silhouette is projected from the room's world coordinates.
const PAPER = 'var(--building-paper, #F3F0E8)';
const CORAL = 'var(--building-coral, #FF6655)';
const TAU = Math.PI * 2;
const geometryCache = new Map();
const cachedGeometry = (key, create) => {
  if (!geometryCache.has(key)) {
    if (geometryCache.size >= 512) geometryCache.delete(geometryCache.keys().next().value);
    geometryCache.set(key, create());
  }
  return geometryCache.get(key);
};
const add = (a, b) => a.length === 2 ? [a[0] + b[0], a[1] + b[1]] : [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => a.length === 2 ? [a[0] - b[0], a[1] - b[1]] : [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => a.length === 2 ? [a[0] * s, a[1] * s] : [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const length = a => Math.hypot(a[0], a[1], a[2]);
const unit = a => mul(a, 1 / (length(a) || 1));
const mix = (a, b, t) => a.length === 2
  ? [a[0] * (1 - t) + b[0] * t, a[1] * (1 - t) + b[1] * t]
  : [a[0] * (1 - t) + b[0] * t, a[1] * (1 - t) + b[1] * t, a[2] * (1 - t) + b[2] * t];
const number = n => Math.round(n * 10) / 10;
const pair = point => `${number(point[0])},${number(point[1])}`;

function hull(points) {
  const sorted = points.map(p => [p[0], p[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const half = input => {
    const result = [];
    for (const point of input) {
      while (result.length > 1 && turn(result.at(-2), result.at(-1), point) <= 0) result.pop();
      result.push(point);
    }
    return result;
  };
  return [...half(sorted).slice(0, -1), ...half(sorted.slice().reverse()).slice(0, -1)];
}

function roundedPath(points) {
  const midpoint = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d = `M${pair(midpoint(points.at(-1), points[0]))}`;
  points.forEach((point, i) => { d += `Q${pair(point)} ${pair(midpoint(point, points[(i + 1) % points.length]))}`; });
  return d + 'Z';
}

function painted(d, shade = .065) {
  return `<path d="${d}" fill="${PAPER}" stroke="none"/><path d="${d}" fill="${CORAL}" fill-opacity="${shade}" stroke="${CORAL}" stroke-width=".72" stroke-linejoin="round"/>`;
}

export function humanParts({ project, x, y, heading = 0, pose = 'standing', kind = 'man', target } = {}) {
  if (typeof project !== 'function' || ![x, y, heading].every(Number.isFinite)) throw new TypeError('A figure needs project and finite world coordinates.');
  if (!['man', 'woman'].includes(kind)) throw new RangeError('Building figures must be human.');
  const aliases = { leaning: 'collaborating', reading: 'holding-records' };
  pose = aliases[pose] || pose;
  if (!['standing', 'pointing', 'collaborating', 'seated', 'holding-records'].includes(pose)) throw new RangeError('Unknown building pose: ' + pose);
  if (target && (!Array.isArray(target) || target.length !== 3 || !target.every(Number.isFinite))) throw new TypeError('A hand target must be a finite world [x,y,z] point.');
  const forward = [Math.sin(heading), Math.cos(heading), 0], right = [Math.cos(heading), -Math.sin(heading), 0];
  const local = (u, v, z) => [x + right[0] * u + forward[0] * v, y + right[1] * u + forward[1] * v, z];
  const projected = point => project(...point);
  const depth = point => .45 * (point[0] + point[1]) + .405 * point[2];
  const seated = pose === 'seated', lean = pose === 'collaborating';
  const hipZ = seated ? 13 : 21, shoulderZ = seated ? 26 : lean ? 32 : 34;
  const leanForward = seated ? 1 : lean ? 2.7 : 0;
  const headZ = seated ? 33.5 : lean ? 39.5 : 41.5;
  const parts = [], body = [];

  const ellipsoidGeometry = (centre, radii) => {
    const geometry = cachedGeometry(`ellipsoid:${centre}:${radii}:${heading}`, () => {
      const points = [];
      for (let latitude = 0; latitude <= 4; latitude++) {
        const phi = -Math.PI / 2 + Math.PI * latitude / 4;
        for (let longitude = 0; longitude < 8; longitude++) {
          const theta = TAU * longitude / 8;
          points.push(add(centre, add(add(mul(right, radii[0] * Math.cos(phi) * Math.cos(theta)), mul(forward, radii[1] * Math.cos(phi) * Math.sin(theta))), [0, 0, radii[2] * Math.sin(phi)])));
        }
      }
      return points;
    });
    const outline = hull(geometry.map(projected));
    return { d: roundedPath(outline), outline };
  };
  const ellipsoid = (centre, radii, shade = .065) => painted(ellipsoidGeometry(centre, radii).d, shade);

  const origin = projected([0, 0, 0]);
  const axes = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map(point => sub(projected(point), origin));
  const xx = axes.reduce((sum, a) => sum + a[0] * a[0], 0), yy = axes.reduce((sum, a) => sum + a[1] * a[1], 0), xy = axes.reduce((sum, a) => sum + a[0] * a[1], 0);
  const tilt = .5 * Math.atan2(2 * xy, xx - yy), spread = Math.hypot(xx - yy, 2 * xy);
  const major = Math.sqrt((xx + yy + spread) / 2), minor = Math.sqrt((xx + yy - spread) / 2);
  const sphereOutline = (centre, radius) => {
    const point = projected(centre), result = [];
    for (let sample = 0; sample < 8; sample++) {
      const theta = TAU * sample / 8, u = radius * major * Math.cos(theta), v = radius * minor * Math.sin(theta);
      result.push([point[0] + u * Math.cos(tilt) - v * Math.sin(tilt), point[1] + u * Math.sin(tilt) + v * Math.cos(tilt)]);
    }
    return result;
  };
  const limb = (joints, radii, shade = .065) => {
    const d = joints.slice(1).map((joint, i) => roundedPath(hull([...sphereOutline(joints[i], radii[i]), ...sphereOutline(joint, radii[i + 1])]))).join('');
    return `<path d="${d}" fill="${CORAL}" stroke="${CORAL}" stroke-width="1.44" stroke-linejoin="round"/><path d="${d}" fill="${PAPER}" stroke="none"/><path d="${d}" fill="${CORAL}" fill-opacity="${shade}" stroke="none"/>`;
  };

  for (const side of [-1, 1]) {
    const hip = local(side * 2.6, 0, hipZ), knee = local(side * 2.8, seated ? 8 : 0, 11.5), ankle = local(side * 3, seated ? 9 : .4, 1.5);
    body.push({ depth: depth(knee), markup: limb([hip, knee, ankle], [1.9, 1.55, 1.15], .075) });
    const foot = local(side * 3, seated ? 10.7 : 2, 1);
    body.push({ depth: depth(foot), markup: ellipsoid(foot, [1.45, 3, 1], .1) });
  }
  const { torso, torsoCentre } = cachedGeometry(`torso:${x}:${y}:${heading}:${pose}`, () => {
    const torso = [];
    for (const [z, uRadius, vRadius, v] of [[hipZ, 3.6, 2.3, 0], [hipZ + 5, 3.25, 2.2, leanForward * .4], [shoulderZ, 4.6, 2.4, leanForward], [shoulderZ + 1, 3.8, 2.1, leanForward]]) {
      for (let i = 0; i < 8; i++) {
        const theta = TAU * i / 8;
        torso.push(local(uRadius * Math.cos(theta), v + vRadius * Math.sin(theta), z));
      }
    }
    const torsoCentre = local(0, leanForward * .5, (hipZ + shoulderZ) / 2);
    return { torso, torsoCentre };
  });
  const torsoD = roundedPath(hull(torso.map(projected)));
  const torsoDepth = depth(torsoCentre);
  body.push({ depth: torsoDepth, markup: painted(torsoD, .075) });

  const defaultTarget = pose === 'pointing' ? local(8, 12, 34) : pose === 'seated' ? local(0, 13, 20.5) : pose === 'holding-records' ? local(0, 8, 25) : local(4, 12, 20.5);
  const centreTarget = target || defaultTarget;
  for (const side of [-1, 1]) {
    const reaching = pose === 'seated' || pose === 'holding-records' || (side === 1 && (pose === 'pointing' || pose === 'collaborating'));
    const shoulder = local(side * 4.25, leanForward, shoulderZ);
    const requested = reaching
      ? add(centreTarget, mul(right, (pose === 'seated' ? 2.8 : pose === 'holding-records' ? 3.7 : 0) * side))
      : local(side * 5.3, .5, seated ? 13 : 18);
    const delta = sub(requested, shoulder), distance = length(delta), reach = 17;
    const direction = distance > 1e-8 ? unit(delta) : [0, 0, -1], used = Math.max(1.01, Math.min(reach - .001, distance));
    const hand = add(shoulder, mul(direction, used));
    const bendHint = add(mul(right, side * .35), [0, 0, -1]);
    let bend = sub(bendHint, mul(direction, dot(bendHint, direction)));
    if (length(bend) < 1e-6) bend = right;
    bend = unit(bend);
    const upper = 9, lower = 8, along = (upper * upper - lower * lower + used * used) / (2 * used), across = Math.sqrt(Math.max(0, upper * upper - along * along));
    const elbow = add(add(shoulder, mul(direction, along)), mul(bend, across));
    const armName = side < 0 ? 'human-left-arm' : 'human-right-arm';
    const handMetadata = { requested, position: hand, clamped: Math.abs(used - distance) > 1e-6, distance, reach };
    const forearmAt = mix(elbow, hand, .5);
    const handMarkup = ellipsoid(hand, [.9, 1.05, .9], .055);
    const armMarkup = limb([shoulder, elbow, hand], [1.65, 1.3, .9], .075) + handMarkup;
    // When reaching forward towards the viewer over a desk in front of the person,
    // place the forearm/hand in contacts so it sits above the desk surface.
    // Otherwise layer the arm with the torso by viewing depth so the torso naturally occludes far arms.
    if (reaching && depth(forearmAt) > torsoDepth + 1.5) {
      body.push({ depth: depth(mix(shoulder, elbow, .5)), markup: limb([shoulder, elbow], [1.65, 1.3], .075) });
      parts.push({
        name: `${armName}-forearm`, x: forearmAt[0], y: forearmAt[1], z: forearmAt[2],
        depth: depth(forearmAt), role: 'reach',
        markup: limb([elbow, hand], [1.3, .9], .075) + handMarkup,
        hand: handMetadata
      });
    } else {
      const armDepth = Math.min(depth(mix(shoulder, elbow, .5)), depth(forearmAt), torsoDepth - .05);
      body.push({ depth: armDepth, markup: armMarkup });
    }
  }

  body.sort((a, b) => a.depth - b.depth);
  parts.unshift({
    name: 'human-body', x, y, z: (hipZ + headZ) / 2, role: 'body',
    markup: `<g data-figure="${kind}" data-pose="${pose}" data-human-geometry="world">${body.map(part => part.markup).join('')}</g>`
  });
  const neck = local(0, leanForward, shoulderZ + 2.7), head = local(0, leanForward + .2, headZ);
  parts.push({
    name: 'human-head', x: head[0], y: head[1], z: head[2], depth: depth(head), role: 'head',
    markup: ellipsoid(neck, [1.45, 1.4, 1.7], .065) + ellipsoid(head, [3.0, 3.25, 3.5], .045)
  });

  if (pose === 'holding-records') {
    const hands = parts.filter(part => part.role === 'reach' && part.hand).map(part => part.hand.position);
    if (hands.length === 2) {
      const centre = mix(hands[0], hands[1], .5);
      const corners = [add(hands[0], [0, 0, -4]), add(hands[1], [0, 0, -4]), add(hands[1], [0, 0, 4]), add(hands[0], [0, 0, 4])];
      const d = `M${corners.map(point => pair(projected(point))).join('L')}Z`;
      parts.push({ name: 'held-record', x: centre[0], y: centre[1], z: centre[2], role: 'document', markup: painted(d, .035) });
    }
  }
  return parts;
}

