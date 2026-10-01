const TAU = Math.PI * 2;
const ease = t => t * t * t * (t * (t * 6 - 15) + 10);

function normal(a, b, c) {
  const u = b.map((v, i) => v - a[i]), v = c.map((n, i) => n - a[i]);
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const length = Math.hypot(...n) || 1;
  return n.map(value => value / length);
}

function makeTurtle() {
  const vertices = [], faces = [], joints = [], nodes = [];
  const point = (p, joint = null) => { joints.push(joint); return vertices.push(p) - 1; };

  // Each part is a closed volume, so the depth buffer hides its far mesh.
  function volume(start, rings, end, joint = null) {
    const firstFace = faces.length, startIndex = point(start, joint);
    const ids = rings.map(ring => ring.map(p => point(p, joint))), count = ids[0].length;
    for (let j = 0; j < count; j++) faces.push([startIndex, ids[0][j], ids[0][(j + 1) % count]]);
    for (let row = 0; row < ids.length - 1; row++) for (let j = 0; j < count; j++) {
      const a = ids[row][j], b = ids[row + 1][j], c = ids[row + 1][(j + 1) % count], d = ids[row][(j + 1) % count];
      faces.push([a, b, c], [a, c, d]);
    }
    const endIndex = point(end, joint), last = ids.at(-1);
    for (let j = 0; j < count; j++) faces.push([endIndex, last[(j + 1) % count], last[j]]);
    let signedVolume = 0;
    for (let i = firstFace; i < faces.length; i++) {
      const [a, b, c] = faces[i].map(index => vertices[index]);
      signedVolume += a[0] * (b[1] * c[2] - b[2] * c[1])
        + a[1] * (b[2] * c[0] - b[0] * c[2]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
    }
    if (signedVolume < 0) for (let i = firstFace; i < faces.length; i++) faces[i].reverse();
  }

  // A low oval carapace, tapering aft, with a separate narrow lip and plastron.
  const shellRings = [[.22, 13.5], [.45, 12.4], [.66, 10.3], [.83, 7.1], [.94, 3.8], [1, .8],
    [1, -1.8], [.90, -5], [.66, -7], [.35, -8]].map(([r, z]) => Array.from({ length: 24 }, (_, j) => {
    const angle = j * TAU / 24, c = Math.cos(angle), s = Math.sin(angle);
    return [35 * r * c - 1.5 * r * r, 27 * r * s * (1 + .10 * c),
      z + (z > 0 ? .24 * r * Math.cos(angle * 5) : 0)];
  }));
  volume([0, 0, 14], shellRings, [0, 0, -8.3]);

  // The neck emerges under the forward rim. A small blunt head avoids the
  // large round head and beak that would make this read as a land tortoise.
  const neck = [[26, 4.4, 4.0, -3.0], [30, 4.8, 4.2, -2.4], [35, 5.0, 4.5, -1.5],
    [39, 6.2, 5.2, -.3], [43, 6.7, 5.4, -.2], [47, 5.8, 4.4, -.9], [51, 3.8, 3.0, -1.7]];
  volume([24, 0, -3], neck.map(([x, ry, rz, z]) => Array.from({ length: 10 }, (_, j) => {
    const angle = j * TAU / 10;
    return [x, Math.cos(angle) * ry, z + Math.sin(angle) * rz];
  })), [53, 0, -2]);
  nodes.push(point([46.2, 5.4, 1.2]), point([46.2, -5.4, 1.2]));

  function flipper(side, rear) {
    const origin = rear ? [-25, side * 15, -4] : [21, side * 18, -3];
    const joint = { origin, side, rear };
    // Stations follow the blade outwards. Cross-sections remain lenticular,
    // with a curved leading edge, swept trailing edge and narrow rounded tip.
    const stations = rear
      ? [[0, 0, 5.7, 1.3], [-5, 6, 7.2, 1.2], [-10, 12, 7.4, 1], [-14, 19, 5.2, .7], [-15, 24, 2.4, .4]]
      : [[0, 0, 7.2, 1.7], [1.5, 9, 10.5, 1.5], [.7, 19, 11.6, 1.35], [-2.5, 29, 10.3, 1.1],
        [-7, 39, 7.7, .85], [-12.5, 48, 4.8, .6], [-17, 55, 2.2, .32]];
    const segments = rear ? 6 : 8;
    const rings = stations.map(([x, span, chord, thickness]) => Array.from({ length: segments }, (_, j) => {
      const angle = j * TAU / segments;
      return [origin[0] + x + chord * Math.cos(angle), origin[1] + side * span,
        origin[2] - span * .045 + thickness * Math.sin(angle)];
    }));
    volume([origin[0], origin[1] - side * 1.5, origin[2]], rings,
      rear ? [-40.8, side * 41, -5.3] : [2, side * 76, -5.6], joint);
  }
  for (const side of [-1, 1]) { flipper(side, false); flipper(side, true); }
  volume([-30, 0, -4], [[-34, 2.3], [-39, 1.5], [-43, .7]].map(([x, radius]) =>
    Array.from({ length: 6 }, (_, j) => [x, Math.cos(j * TAU / 6) * radius, -4 + Math.sin(j * TAU / 6) * radius])), [-46, 0, -4.4]);
  return { vertices, faces, joints, nodes };
}

const TURTLE = makeTurtle();

// One unbroken loop, with both turns beyond the visible frame. The route
// follows the open foreground corridor rather than the planted rear bank.
export function turtlePose(time, compact = false) {
  const rate = compact ? .018 : .0125, angle = -.30 + time * rate;
  const span = compact ? 430 : 1080, depth = compact ? 14 : 8;
  const vx = Math.cos(angle) * span * rate, vy = -Math.sin(angle) * depth * rate;
  const yaw = Math.atan2(vy, vx);
  return {
    centre: [Math.sin(angle) * span, (compact ? -210 : -196) + Math.cos(angle) * depth,
      (compact ? 355 : 420) + Math.sin(time * .075) * 3],
    yaw, pitch: .025 + .015 * Math.sin(time * .075),
    bank: .15 * Math.cos(yaw) + .025 * Math.sin(time * .083), size: compact ? 1.08 : 1.16,
  };
}

function stroke(time) {
  const phase = ((time % 9.2) + 9.2) % 9.2;
  const glide = -.16;
  if (phase < 1.35) return glide + (-.48 - glide) * ease(phase / 1.35);
  if (phase < 2.65) return -.48 + (.22 + .48) * ease((phase - 1.35) / 1.30);
  if (phase < 3.5) return .22 + (glide - .22) * ease((phase - 2.65) / .85);
  // Slightly lowered blades stay visible at the low reef camera angle while
  // the turtle glides. Only the short recovery stroke lifts them past level.
  return glide;
}

export function movingTurtle(time, compact = false) {
  const pose = turtlePose(time, compact), flap = stroke(time);
  const cy = Math.cos(pose.yaw), sy = Math.sin(pose.yaw), cp = Math.cos(pose.pitch), sp = Math.sin(pose.pitch);
  const cb = Math.cos(pose.bank), sb = Math.sin(pose.bank);
  const vertices = TURTLE.vertices.map((point, i) => {
    let [x, y, z] = point;
    const joint = TURTLE.joints[i];
    if (joint) {
      const [ox, oy, oz] = joint.origin, angle = joint.side * (joint.rear ? -.08 + .035 * Math.sin(time * .45) : flap);
      const c = Math.cos(angle), s = Math.sin(angle), dy = y - oy, dz = z - oz;
      y = oy + dy * c - dz * s; z = oz + dy * s + dz * c;
      // A slight backward sweep accompanies the power stroke; the shoulder
      // remains fixed and the shell stays rigid throughout the stroke.
      if (!joint.rear) x = ox + (x - ox) - Math.max(0, -flap) * Math.abs(dy) * .10;
    }
    const by = y * cb - z * sb, bz = y * sb + z * cb;
    const px = x * cp - bz * sp, pz = x * sp + bz * cp;
    return [pose.centre[0] + (px * cy - by * sy) * pose.size,
      pose.centre[1] + (px * sy + by * cy) * pose.size, pose.centre[2] + pz * pose.size];
  });
  return { name: 'Sea turtle', material: 'fish', vertices, faces: TURTLE.faces, nodes: TURTLE.nodes,
    normals: TURTLE.faces.map(face => normal(...face.map(index => vertices[index]))) };
}
