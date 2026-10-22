// The hard diving suit from "koralli is for the redesigners", built as closed triangle meshes
// like the reef's animals and drawn the same way: each face filled barely lighter than the water
// with a fine pale edge. The suit sits on the floor with its knees up, one arm resting across a
// knee and the other hanging loose while its shoulder is welded. Units match the stage: the
// floor is z = 0, x runs across, y runs into the scene and the suit faces -y.
const TAU = Math.PI * 2;

const add = (a, b) => a.map((v, i) => v + b[i]);
const sub = (a, b) => a.map((v, i) => v - b[i]);
const scale = (a, s) => a.map(v => v * s);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const length = a => Math.hypot(...a);
const unit = a => scale(a, 1 / (length(a) || 1));
const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

// The suit is turned three-quarters towards the researcher, so its seated pose reads from the
// side, its thrusters show and the welder can reach the near shoulder.
export const SUIT_YAW = -0.55;
export const yawed = ([x, y, z]) => {
  const c = Math.cos(SUIT_YAW), s = Math.sin(SUIT_YAW);
  return [x * c - y * s, x * s + y * c, z];
};

export const SUIT_JOINTS = {
  shoulder: side => [side * 17.2, 1.5, 31.6],
  dome: [0, -9.8, 33.6],
  domeRadius: 8.4,
};

export function divingSuitMesh() {
  const vertices = [], faces = [], materials = [];
  const point = p => vertices.push(yawed(p)) - 1;

  // A closed volume from a start point, through rings, to an end point, wound outwards.
  function volume(start, rings, end, material = 'suit') {
    const first = faces.length, s = point(start);
    const ids = rings.map(ring => ring.map(point)), count = ids[0].length;
    for (let j = 0; j < count; j++) faces.push([s, ids[0][j], ids[0][(j + 1) % count]]);
    for (let row = 0; row < ids.length - 1; row++) for (let j = 0; j < count; j++) {
      const a = ids[row][j], b = ids[row + 1][j], c = ids[row + 1][(j + 1) % count], d = ids[row][(j + 1) % count];
      faces.push([a, b, c], [a, c, d]);
    }
    const e = point(end), last = ids.at(-1);
    for (let j = 0; j < count; j++) faces.push([e, last[(j + 1) % count], last[j]]);
    let signed = 0;
    for (let i = first; i < faces.length; i++) {
      const [a, b, c] = faces[i].map(index => vertices[index]);
      signed += a[0] * (b[1] * c[2] - b[2] * c[1]) + a[1] * (b[2] * c[0] - b[0] * c[2]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
    }
    if (signed < 0) for (let i = first; i < faces.length; i++) faces[i].reverse();
    const pick = typeof material === 'function' ? material : () => material;
    for (let i = first; i < faces.length; i++) {
      const centre = scale(faces[i].reduce((sum, index) => add(sum, vertices[index]), [0, 0, 0]), 1 / 3);
      materials.push(pick(centre));
    }
  }

  // Rings around an axis from a to b, with a radius profile along it.
  function along(a, b, profile, sides = 10, flatten = 1) {
    const dir = unit(sub(b, a));
    const u = unit(cross(dir, Math.abs(dir[2]) > .9 ? [1, 0, 0] : [0, 0, 1])), v = cross(dir, u);
    return profile.map(([t, r]) => {
      const c = lerp(a, b, t);
      return Array.from({ length: sides }, (_, j) => {
        const angle = (j / sides) * TAU;
        return add(c, add(scale(u, Math.cos(angle) * r), scale(v, Math.sin(angle) * r * flatten)));
      });
    });
  }

  function sphere(c, r, material = 'suit', rows = 5, sides = 10) {
    const rings = Array.from({ length: rows - 1 }, (_, i) => {
      const lat = -Math.PI / 2 + ((i + 1) / rows) * Math.PI;
      return Array.from({ length: sides }, (_, j) => {
        const angle = (j / sides) * TAU;
        return [c[0] + Math.cos(lat) * Math.cos(angle) * r, c[1] + Math.cos(lat) * Math.sin(angle) * r, c[2] + Math.sin(lat) * r];
      });
    });
    volume([c[0], c[1], c[2] - r], rings, [c[0], c[1], c[2] + r], material);
  }

  // One bulging limb segment, rounded at both ends like the shells of a hard suit.
  function bulge(a, b, r, material = 'suit', sides = 8) {
    const dir = unit(sub(b, a)), reach = length(sub(b, a));
    const profile = [[0, r * .66], [.22, r * .95], [.78, r * .95], [1, r * .66]];
    volume(sub(a, scale(dir, reach * .04)), along(a, b, profile, sides), add(b, scale(dir, reach * .04)), material);
  }

  // A limb from a to b in rounded shells, with a narrower rotary joint between each.
  function limb(a, b, r, shells = 2) {
    for (let k = 0; k < shells; k++) {
      const s0 = lerp(a, b, k / shells + .03), s1 = lerp(a, b, (k + 1) / shells - .03);
      bulge(s0, s1, r);
      if (k < shells - 1) {
        const j = lerp(a, b, (k + 1) / shells);
        const dir = unit(sub(b, a));
        volume(sub(j, scale(dir, .9)), along(sub(j, scale(dir, .7)), add(j, scale(dir, .7)), [[0, r * .74], [1, r * .74]], 8), add(j, scale(dir, .9)));
      }
    }
  }

  function claw(wrist, dir, open) {
    const d = unit(dir), across = cross(d, [0, 0, 1]), side = length(across) > .2 ? unit(across) : [1, 0, 0];
    sphere(add(wrist, scale(d, .6)), 2.3, 'suit', 4, 8);
    for (const k of [-1, 1]) {
      const base = add(wrist, scale(d, 1.6));
      const knuckle = add(add(wrist, scale(d, 4.2)), scale(side, k * (1.3 + open)));
      const tip = add(add(wrist, scale(d, 7)), scale(side, k * (.5 + open * .4)));
      bulge(base, knuckle, 1.2, 'suit', 6);
      bulge(knuckle, tip, .9, 'suit', 6);
    }
  }

  // One armoured cabin: the glazing replaces the front of the upper hull, so its
  // sill, pillars and brow are continuous with the chassis. There is no separate head.
  const hull = [[2, 7.6, 6.4], [6, 10.6, 8.4], [14, 12.8, 10.2],
    [18.8, 14, 11], [20.4, 14, 11], [25, 15.2, 12],
    [27, 15.4, 12.2], [34, 15.4, 12.2], [41, 14, 11.2],
    [43, 12.8, 10.2], [45, 8.6, 7.2]];
  const hullRings = hull.map(([z, rx, ry]) => Array.from({ length: 18 }, (_, j) => {
    const angle = (j / 18) * TAU;
    return [Math.cos(angle) * rx, 1.4 + Math.sin(angle) * ry - (z - 2) * .05, z];
  }));
  volume([0, 1.4, 1], hullRings, [0, 0, 45.8], c => {
    const localY = -c[0] * Math.sin(SUIT_YAW) + c[1] * Math.cos(SUIT_YAW);
    if (c[2] > 27 && c[2] < 41 && localY < -6.8) return 'glass';
    return c[2] > 18.9 && c[2] < 20.3 ? 'coral' : 'suit';
  });
  sphere([-8.4, -10.8, 24], 1.15, 'lamp', 4, 8);

  // Twin thrusters rise behind the armoured cabin.
  for (const side of [-1, 1]) {
    volume([side * 9, 14.6, 12.4], along([side * 9, 14.6, 12.8], [side * 9, 14.6, 40.6], [[0, 2.8], [.06, 3.3], [.94, 3.3], [1, 2.6]], 10), [side * 9, 14.6, 41]);
  }

  // Legs: knees drawn up, feet flat, with a fin lying forward from each heel.
  for (const side of [-1, 1]) {
    const hip = [side * 6.2, -3, 6.2], knee = [side * 8.2, -14.6, 14.2], ankle = [side * 8.8, -21.4, 4.4];
    sphere(hip, 4.2);
    limb(hip, knee, 3.7, 1);
    sphere(knee, 3.6);
    limb(knee, ankle, 3.1, 1);
    sphere(ankle, 2.8);
    const heel = [side * 8.9, -21, 1.4], tip = [side * 10.2, -31.5, 7.4];
    volume(heel, along(lerp(heel, tip, .05), tip, [[0, 2.4], [.55, 3.9], [1, 4.8]], 4, .2), add(tip, [side * .2, -.8, .6]), 'fin');
  }

  // Shoulders, then the arms: one forearm laid across the knee, the other hanging to the floor.
  for (const side of [-1, 1]) sphere(SUIT_JOINTS.shoulder(side), 4.8, 'suit', 5, 10);
  const restShoulder = SUIT_JOINTS.shoulder(-1), restElbow = [-21, -3.6, 20.2], restWrist = [-10.6, -16.4, 19.8];
  limb(add(restShoulder, [-1.6, -.6, -3]), restElbow, 3.1, 1);
  sphere(restElbow, 3.2);
  limb(restElbow, restWrist, 3, 1);
  claw(restWrist, sub([-8.4, -20.6, 15.4], restWrist), .2);
  const hangShoulder = SUIT_JOINTS.shoulder(1), hangElbow = [22, -.8, 18.4], hangWrist = [22.6, -2.8, 7.2];
  limb(add(hangShoulder, [1.6, -.4, -3]), hangElbow, 3.1, 1);
  sphere(hangElbow, 3.2);
  limb(hangElbow, hangWrist, 3, 1);
  claw(hangWrist, sub([20.9, -3.6, 0.6], hangWrist), .5);

  // Glazing uses the hull's own vertices; every edge meets the surrounding armour.
  const glass = { vertices, faces: faces.filter((_, i) => materials[i] === 'glass') };

  return { vertices, faces, materials, glass };
}

export function faceNormal(vertices, face) {
  const [a, b, c] = face.map(index => vertices[index]);
  return unit(cross(sub(b, a), sub(c, a)));
}
