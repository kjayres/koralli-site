import { REEF_GEOMETRY } from './reef-geometry.mjs';

const TAU = Math.PI * 2;
const WATER = [12, 22, 48];
const PALE = [143, 165, 255];
const CORAL = [255, 102, 85];
const FISH_GREY = [195, 195, 195];
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const mix = (a, b, t) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
function normal(a, b, c) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx;
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

function makeFish() {
  const vertices = [[24, 0, 0]], faces = [];
  for (const [x, width, height] of [[9, 5, 9], [-9, 6, 13], [-21, 1.5, 2]]) {
    for (let i = 0; i < 6; i += 1) vertices.push([x, width * Math.cos(i * TAU / 6), height * Math.sin(i * TAU / 6)]);
  }
  for (let i = 0; i < 6; i += 1) faces.push([0, 1 + i, 1 + (i + 1) % 6]);
  for (let row = 0; row < 2; row += 1) {
    for (let i = 0; i < 6; i += 1) {
      const a = 1 + row * 6 + i, b = 1 + row * 6 + (i + 1) % 6;
      faces.push([a, a + 6, b], [b, a + 6, b + 6]);
    }
  }
  vertices.push([-34, 0, 12], [-34, 0, -12], [-6, 0, 23], [-5, 0, -19]);
  faces.push([13, 19, 20], [3, 21, 9], [5, 11, 22]);
  return { vertices, faces, nodes: [0, 19, 20, 21], material: 'fish' };
}
const FISH = makeFish();

function mobileArrangement(source) {
  const colony = / colony (\d+)$/.exec(source.name);
  const substrate = /^Coral substrate (\d+)$/.exec(source.name);
  const number = Number(colony?.[1] || substrate?.[1]);
  if (!number) return source;
  if (number === 5) return null;
  const original = [[-185, 20], [20, 125], [175, -15], [-65, -135]][number - 1];
  const target = [[-170, 45], [-30, 150], [165, 25], [30, -175]][number - 1];
  const dz = floorHeight(...target) - floorHeight(...original);
  if (source.kind) return { ...source, origin: [target[0], target[1], source.origin[2] + dz],
    height: source.height * [1.04, 0.95, 0.95, 0.68][number - 1] };
  return { ...source, vertices: source.vertices.map(p => [p[0] + target[0] - original[0], p[1] + target[1] - original[1], p[2] + dz]) };
}

function floorHeight(x, y) {
  // The same height field as revision-06, extended as seafloor rather than a
  // displayed island slab. y here is the native artwork depth coordinate.
  return 20 + 58 * Math.exp(-(((x + 300) / 235) ** 2) - ((y + 5) / 190) ** 2)
    + 94 * Math.exp(-(((x - 230) / 250) ** 2) - ((y - 50) / 145) ** 2)
    + 12 * Math.sin(x * 0.017 + y * 0.013) + 7 * Math.cos(x * 0.029 - y * 0.02);
}

function extendedFloor(compact) {
  const columns = compact ? 25 : 39, rows = compact ? 29 : 37;
  const span = compact ? 730 : 1650, near = compact ? -980 : -2010, far = compact ? 2700 : 4600;
  const vertices = [], faces = [];
  for (let row = 0; row <= rows; row += 1) {
    const y = near + (far - near) * (row / rows) ** 1.7;
    for (let column = 0; column <= columns; column += 1) {
      const x = -span + column / columns * span * 2 + Math.sin(row * 7.1 + column * 2.3) * 9;
      const yy = y + Math.sin(row * 2.7 + column * 5.1) * 7;
      vertices.push([x, yy, floorHeight(x, yy / 3.1)]);
    }
  }
  for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
    const a = row * (columns + 1) + column, b = a + 1, c = a + columns + 1, d = c + 1;
    faces.push([a, b, d], [a, d, c]);
  }
  return { name: 'Continuous reef floor', material: 'terrain', vertices, faces, nodes: [],
    normals: faces.map(face => normal(vertices[face[0]], vertices[face[1]], vertices[face[2]])) };
}

function prepare(source, index) {
  let vertices, faces, nodes;
  if (source.kind) {
    const geometry = REEF_GEOMETRY.corals[source.kind], angle = source.yaw * Math.PI / 180;
    const c = Math.cos(angle), s = Math.sin(angle), h = source.height;
    vertices = geometry.vertices.map(([x, y, z]) => [
      source.origin[0] + (x * c - y * s) * h,
      source.origin[1] + (x * s + y * c) * h,
      source.origin[2] + z * h,
    ]);
    faces = geometry.faces; nodes = geometry.nodes;
  } else { vertices = source.vertices; faces = source.faces; nodes = source.nodes || []; }
  // More space between the existing near/far colonies lets a low frontal
  // camera reveal depth. This keeps each coral's actual branch volume intact.
  const centreY = source.origin?.[1] ?? vertices.reduce((sum, p) => sum + p[1], 0) / vertices.length;
  vertices = vertices.map(p => [p[0], p[1] + centreY * 2.1, p[2]]);
  return {
    name: source.name, material: source.material, vertices, faces, nodes,
    index, base: source.origin?.[2] || 0, height: source.height || 1,
    coral: Boolean(source.kind),
    normals: faces.map(face => normal(vertices[face[0]], vertices[face[1]], vertices[face[2]])),
  };
}

function fishPose(time, index, compact) {
  const speed = 0.047 + index * 0.004;
  const angle = time * speed + index * 1.61 + 0.40;
  const span = compact ? 180 : 565;
  const ySpan = compact ? 260 : 490;
  const x = Math.sin(angle) * span;
  const y = Math.cos(angle) * ySpan + (index % 2 ? -48 : 45);
  const z = (compact ? 275 : 255) + Math.sin(angle * 2 + index) * (compact ? 65 : 76) - index * 15;
  const vx = Math.cos(angle) * span, vy = -Math.sin(angle) * ySpan;
  const vz = Math.cos(angle * 2 + index) * (compact ? 136 : 152);
  return {
    centre: [x, y, z], yaw: Math.atan2(vy, vx), pitch: Math.atan2(vz, Math.hypot(vx, vy)),
    bank: Math.sin(time * 0.7 + index) * 0.065, size: (compact ? 0.90 : 1.0) * (0.72 + index * 0.10),
  };
}

function movingFish(time, index, compact) {
  const pose = fishPose(time, index, compact);
  const cy = Math.cos(pose.yaw), sy = Math.sin(pose.yaw), cp = Math.cos(pose.pitch), sp = Math.sin(pose.pitch);
  const cb = Math.cos(pose.bank), sb = Math.sin(pose.bank);
  const vertices = FISH.vertices.map(([x, y, z]) => {
    const tail = Math.max(0, (7 - x) / 43);
    y += Math.sin(time * 5.1 + index * 1.7 - x * 0.09) * tail * tail * 2.2;
    const by = y * cb - z * sb, bz = y * sb + z * cb;
    const px = x * cp - bz * sp, pz = x * sp + bz * cp;
    return [pose.centre[0] + (px * cy - by * sy) * pose.size,
      pose.centre[1] + (px * sy + by * cy) * pose.size, pose.centre[2] + pz * pose.size];
  });
  return { ...FISH, name: `Fish ${index + 1}`, vertices,
    normals: FISH.faces.map(face => normal(vertices[face[0]], vertices[face[1]], vertices[face[2]])) };
}

function camera(width, height, time, compact) {
  // A slow change in the true camera yaw reveals front/back depth without
  // spinning the illustration. Perspective gives nearer terrain/fish scale.
  const yaw = Math.sin(time * 0.075) * 0.010;
  const elevation = 0.018;
  const distance = compact ? 1170 : 2260;
  const right = [Math.cos(yaw), -Math.sin(yaw), 0];
  const up = [Math.sin(yaw) * Math.sin(elevation), Math.cos(yaw) * Math.sin(elevation), Math.cos(elevation)];
  const eye = [-Math.sin(yaw) * Math.cos(elevation), -Math.cos(yaw) * Math.cos(elevation), Math.sin(elevation)];
  const scale = compact ? Math.min(width / 570, height / 590) : Math.min(width / 1470, height / 620);
  const target = [0, 0, compact ? 82 : 93];
  return {
    eye, distance,
    project(p) {
      const relative = [p[0] - target[0], p[1] - target[1], p[2] - target[2]];
      const z = distance - dot(relative, eye);
      const factor = scale * distance / z;
      return { x: width * 0.5 + dot(relative, right) * factor,
        y: height * (compact ? 0.63 : 0.68) - dot(relative, up) * factor, z };
    },
  };
}

function style(material, faceNormal, depth, distance) {
  const colour = material === 'fish' ? FISH_GREY : material === 'coral' ? CORAL : PALE;
  const light = Math.abs(dot(faceNormal, [-0.303, -0.505, 0.808]));
  const fogKey = Math.round(clamp(1 - Math.max(0, depth - distance + 85) / 1250, 0.52, 1) * 64);
  const fog = fogKey / 64;
  const cache = faceNormal.styles || (faceNormal.styles = []);
  if (cache[fogKey]) return cache[fogKey];
  let fill, edge, width;
  if (material === 'terrain') { fill = 0.014 + (1 - light) * 0.040; edge = 0.18; width = 0.45; }
  else if (material === 'rock') { fill = 0.038 + (1 - light) * 0.072; edge = 0.35; width = 0.55; }
  else if (material === 'fish') { fill = 0.044 + (1 - light) * 0.058; edge = 0.55; width = 0.65; }
  else { fill = 0.070 + (1 - light) * 0.105; edge = material === 'coral' ? 0.73 : 0.72; width = 0.60; }
  // Opaque blends hide the rear surface while retaining very light shading.
  const stroke = material === 'fish' ? `rgb(${Array(3).fill(Math.round(183 * fog * 0.78)).join(',')})` : mix(WATER, colour, edge * fog);
  return (cache[fogKey] = { fill: mix(WATER, colour, fill * fog), stroke, width });
}

export class Reef {
  props = { fish: true };

  seedReef(s) {
    if (!(s.w > 0 && s.h > 0)) return;
    s.reefCompact = s.w < 760;
    const layout = s.reefCompact ? REEF_GEOMETRY.mobile.map(mobileArrangement).filter(Boolean) : REEF_GEOMETRY.desktop;
    s.reefScene = [extendedFloor(s.reefCompact), ...layout.filter(source => source.material !== 'terrain').map(prepare)];
    s.reefGeometryStats = {
      meshes: s.reefScene.length,
      vertices: s.reefScene.reduce((sum, object) => sum + object.vertices.length, 0),
      triangles: s.reefScene.reduce((sum, object) => sum + object.faces.length, 0),
    };
  }

  stepReef(s) { this.drawReef(s); }

  drawReef(s) {
    if (!s.ctx || !Number.isFinite(s.w) || !Number.isFinite(s.h) || s.w <= 0 || s.h <= 0) return;
    if (!s.reefScene || s.reefCompact !== (s.w < 760)) this.seedReef(s);
    const { ctx } = s, time = Number.isFinite(s.t) ? s.t / 60 : 0;
    const cam = camera(s.w, s.h, time, s.reefCompact), triangles = [], landmarks = [];
    const objects = s.reefScene.map(object => {
      if (!object.coral) return object;
      const sx = Math.sin(time * 0.34 + object.index * 1.7) * 1.65;
      const sy = Math.cos(time * 0.27 + object.index) * 0.85;
      return { ...object, vertices: object.vertices.map(p => {
        const amount = ((p[2] - object.base) / object.height) ** 2;
        return [p[0] + sx * amount, p[1] + sy * amount, p[2]];
      }) };
    });
    if (this.props.fish ?? true) {
      for (let i = 0; i < (s.reefCompact ? 3 : 5); i += 1) objects.push(movingFish(time, i, s.reefCompact));
    }

    for (const object of objects) {
      const points = object.vertices.map(p => cam.project(p));
      object.faces.forEach((face, faceIndex) => {
        const a = points[face[0]], b = points[face[1]], c = points[face[2]];
        const xmin = Math.min(a.x, b.x, c.x), xmax = Math.max(a.x, b.x, c.x);
        const ymin = Math.min(a.y, b.y, c.y), ymax = Math.max(a.y, b.y, c.y);
        if (xmax < -2 || xmin > s.w + 2 || ymax < -2 || ymin > s.h + 2) return;
        const depth = (a.z + b.z + c.z) / 3;
        const shade = style(object.material, object.normals[faceIndex], depth, cam.distance);
        triangles.push({ a, b, c, depth, xmin, xmax, ymin, ymax, ...shade });
      });
      for (const index of object.nodes) landmarks.push({ ...points[index], material: object.material });
    }

    triangles.sort((a, b) => b.depth - a.depth);
    ctx.save(); ctx.clearRect(0, 0, s.w, s.h);
    ctx.fillStyle = '#0C1630'; ctx.fillRect(0, 0, s.w, s.h);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const triangle of triangles) {
      ctx.fillStyle = triangle.fill; ctx.strokeStyle = triangle.stroke; ctx.lineWidth = triangle.width;
      ctx.beginPath(); ctx.moveTo(triangle.a.x, triangle.a.y); ctx.lineTo(triangle.b.x, triangle.b.y); ctx.lineTo(triangle.c.x, triangle.c.y); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }

    // A spatial index makes perspective-correct landmark occlusion cheap.
    // Hidden rear nodes/fish do not shine through nearer branches or rocks.
    const cell = 54, columns = Math.ceil(s.w / cell), bins = new Map();
    triangles.forEach(triangle => {
      const x0 = Math.max(0, Math.floor(triangle.xmin / cell)), x1 = Math.min(columns - 1, Math.floor(triangle.xmax / cell));
      const y0 = Math.max(0, Math.floor(triangle.ymin / cell)), y1 = Math.min(Math.ceil(s.h / cell) - 1, Math.floor(triangle.ymax / cell));
      for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) {
        const key = y * columns + x;
        if (!bins.has(key)) bins.set(key, []);
        bins.get(key).push(triangle);
      }
    });
    let visibleNodes = 0;
    for (const point of landmarks) {
      if (point.x < 0 || point.x > s.w || point.y < 0 || point.y > s.h) continue;
      const nearby = bins.get(Math.floor(point.y / cell) * columns + Math.floor(point.x / cell)) || [];
      const hidden = nearby.some(({ a, b, c, xmin, xmax, ymin, ymax }) => {
        if (point.x < xmin || point.x > xmax || point.y < ymin || point.y > ymax) return false;
        const den = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
        if (Math.abs(den) < 1e-8) return false;
        const u = ((b.y - c.y) * (point.x - c.x) + (c.x - b.x) * (point.y - c.y)) / den;
        const v = ((c.y - a.y) * (point.x - c.x) + (a.x - c.x) * (point.y - c.y)) / den;
        if (u < -0.0001 || v < -0.0001 || u + v > 1.0001) return false;
        const depth = 1 / (u / a.z + v / b.z + (1 - u - v) / c.z);
        return depth < point.z - 0.55;
      });
      if (hidden) continue;
      const fog = clamp(1 - Math.max(0, point.z - cam.distance + 85) / 1250, 0.5, 1);
      ctx.fillStyle = point.material === 'fish' ? `rgb(${Array(3).fill(Math.round(195 * fog)).join(',')})`
        : mix(WATER, point.material === 'coral' ? CORAL : PALE, fog * 0.90);
      ctx.beginPath(); ctx.arc(point.x, point.y, point.material === 'fish' ? 1.05 : s.reefCompact ? 1.15 : 1.45, 0, TAU); ctx.fill();
      visibleNodes += 1;
    }
    ctx.restore();
    s.reefFrameStats = { triangles: triangles.length, visibleNodes, fish: this.props.fish === false ? 0 : s.reefCompact ? 3 : 5 };
  }
}
