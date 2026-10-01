const TAU = Math.PI * 2;
const INTERVAL = 6.1;
const SPEED = .78;
const BLUE = '36,78,255';
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const bell = x => Math.exp(-.5 * x * x);
const random = (a, b = 0) => {
  let n = Math.imul(a + 271, 374761393) ^ Math.imul(b + 137, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
function noise(x, seed) {
  const i = Math.floor(x), t = smooth(0, 1, x - i);
  return (random(i, seed) * (1 - t) + random(i + 1, seed) * t) * 2 - 1;
}

function triangulate(nodes) {
  const count = nodes.length;
  const points = nodes.map(p => [p.v, p.depth * .4]);
  points.push([-12, -8], [0, 15], [12, -8]);
  const circle = (a, b, c) => {
    const [ax, ay] = points[a], [bx, by] = points[b], [cx, cy] = points[c];
    const det = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(det) < 1e-12) return null;
    const aa = ax * ax + ay * ay, bb = bx * bx + by * by, cc = cx * cx + cy * cy;
    const x = (aa * (by - cy) + bb * (cy - ay) + cc * (ay - by)) / det;
    const y = (aa * (cx - bx) + bb * (ax - cx) + cc * (bx - ax)) / det;
    return { nodes: [a, b, c], x, y, r: (x - ax) ** 2 + (y - ay) ** 2 };
  };
  let open = [circle(count, count + 1, count + 2)];
  const closed = [];
  for (let i = 0; i < count; i++) {
    const [x, y] = points[i], next = [], boundary = new Map();
    for (const triangle of open) {
      const dx = x - triangle.x;
      if (dx > 0 && dx * dx > triangle.r) { closed.push(triangle); continue; }
      if (dx * dx + (y - triangle.y) ** 2 > triangle.r + 1e-12) { next.push(triangle); continue; }
      for (let j = 0; j < 3; j++) {
        const a = triangle.nodes[j], b = triangle.nodes[(j + 1) % 3];
        const key = Math.min(a, b) * (count + 3) + Math.max(a, b);
        if (boundary.has(key)) boundary.delete(key); else boundary.set(key, [a, b]);
      }
    }
    for (const [a, b] of boundary.values()) { const t = circle(a, b, i); if (t) next.push(t); }
    open = next;
  }
  return [...closed, ...open].filter(t => t.nodes.every(i => i < count)).map(t => t.nodes);
}

function makeSurface(compact) {
  const nodes = [], grid = new Map(), cell = .03;
  const spacing = compact ? .014 : .009;
  function add(v, depth, radius) {
    const x = v, y = depth * .4, gx = Math.floor(x / cell), gy = Math.floor(y / cell);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      for (const p of grid.get(`${gx + dx},${gy + dy}`) || []) {
        if ((x - p.v) ** 2 + (y - p.depth * .4) ** 2 < ((radius + p.radius) * .5) ** 2) return;
      }
    }
    const node = { v, depth, radius, seed: random(nodes.length, 721) };
    nodes.push(node);
    const key = `${gx},${gy}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(node);
  }
  // Unevenly spaced samples are denser in the lip and in broad, irregular
  // patches behind it. Triangulation has no rows, columns or fixed diagonals.
  for (let i = 0; i <= 210; i++) add(-1.24 + i / 210 * 2.48, 0, spacing * .6);
  for (let i = 0; i <= 120; i++) add(-1.24 + i / 120 * 2.48, 1, spacing);
  for (let i = 1; i < 24; i++) { add(-1.24, i / 24, spacing); add(1.24, i / 24, spacing); }
  for (let i = 0; i < (compact ? 26000 : 56000); i++) {
    const v = -1.24 + random(i, 137) * 2.48, depth = random(i, 311) ** 1.6;
    const density = .79 + .36 * noise(v * 3 + depth * 5, 811);
    const radius = spacing * (1 + depth * 1.4) * density;
    if (depth * .4 < radius * .6 || (1 - depth) * .4 < radius * .6 || Math.abs(v) > 1.24 - radius) continue;
    add(v, depth, radius);
  }
  nodes.sort((a, b) => a.v - b.v);
  const edges = [], lookup = new Map();
  const faces = triangulate(nodes).map((indices, i) => {
    const [a, b, c] = indices.map(j => nodes[j]);
    if ((b.v - a.v) * (c.depth - a.depth) - (b.depth - a.depth) * (c.v - a.v) < 0) [indices[1], indices[2]] = [indices[2], indices[1]];
    return { nodes: indices, depth:(a.depth + b.depth + c.depth) / 3, v:(a.v + b.v + c.v) / 3,
      seed: random(i, 81), edges: indices.map((a, j) => {
      const b = indices[(j + 1) % 3], low = Math.min(a, b), high = Math.max(a, b), key = low * nodes.length + high;
      if (!lookup.has(key)) { lookup.set(key, edges.length); edges.push([low, high]); }
      return lookup.get(key);
    }) };
  });
  return { nodes, faces, edges };
}
let desktop, mobile;

function travel(age) {
  const integral = x => x <= 0 ? 0 : x >= 1 ? x - .5 : x ** 3 - .5 * x ** 4;
  return -.26 + .10 * age + .11 * integral((age - 3.4) / 2);
}

function waterFrame(width, height, elapsed, pointer) {
  const compact = width < 760, time = elapsed * SPEED + 3.4;
  const mesh = compact ? (mobile ||= makeSurface(true)) : (desktop ||= makeSurface(false));
  const ox = width * (compact ? -.03 : .23), oy = height * (compact ? .47 : .79);
  const tx = width * 1.12, ty = height * (compact ? -.20 : -.28);
  const length = Math.hypot(tx - ox, ty - oy);
  const dx = (tx - ox) / length, dy = (ty - oy) / length, nx = -dy, ny = dx;
  const breadth = compact ? Math.min(width * .82, height * .42) : Math.min(width * .61, height * .94);
  const nearest = Math.floor(time / INTERVAL), surfaces = [];
  const pointerStrength = pointer && Number.isFinite(pointer.x) && Number.isFinite(pointer.y)
    && Number.isFinite(pointer.strength) ? clamp(pointer.strength) : 0;
  const pointerRadius = clamp(width * .12, 86, 190);
  for (let offset = -2; offset <= 1; offset++) {
    const index = nearest + offset, seed = index * 73;
    const age = time - index * INTERVAL - (random(index, 19) - .5) * 1.0;
    if (age < -.8 || age > 18) continue;
    const life = smooth(-.8, 1.2, age) * (1 - smooth(14.5, 18, age));
    const vertices = mesh.nodes.map(node => {
      const {depth, v} = node;
      const localAge = age - .48 * noise(v * 2.8, seed + 31) - .14 * noise(v * 8, seed + 97);
      const breaking = smooth(3.0, 5.7, localAge);
      const spreading = smooth(5.0, 9.5, localAge);
      const roughness = .023 * noise(v * 3.0, seed + 41) + .008 * noise(v * 9.3, seed + 103)
        + .003 * noise(v * 25 + localAge * .13, seed + 179);
      const fingers = .028 * spreading * noise(v * 7.2 - localAge * .10, seed + 233);
      const front = travel(localAge) + roughness + fingers;
      const depthScale = .20 + .18 * spreading;
      const compression = .016 * (1 - .40 * spreading) * bell((depth - .13) / .09);
      const drift = .003 * breaking * Math.sin(depth * 9 + v * 4 - localAge * .8) * depth;
      const s = front - depthScale * depth + compression + drift;
      const side = v * breadth + length * .0015 * breaking * Math.sin(v * 5 + depth * 8 - localAge * .7) * depth;
      let x = ox + dx * s * length + nx * side;
      let y = oy + dy * s * length + ny * side;
      if (pointerStrength) {
        const px = (x - pointer.x) / pointerRadius, py = (y - pointer.y) / pointerRadius;
        const amount = 7 * pointerStrength * Math.exp(-2.7 * (px * px + py * py));
        x += px * amount; y += py * amount;
      }
      const crestDepth = .11 - .060 * spreading;
      const crest = bell((depth - crestDepth) / (.045 + spreading * .018));
      const foamNoise = .62 * noise(v * 22 + depth * 15 - localAge * .37, seed + 401)
        + .38 * noise(v * 51 - depth * 48 + localAge * .72, seed + 577);
      const lace = smooth(-.37, .47, foamNoise);
      const foam = bell((depth - .19) / (.10 + .14 * spreading)) * breaking * lace;
      const wake = bell((depth - .58) / .27) * (.42 + .58 * spreading) * (.66 + .34 * lace);
      const edge = 1 - smooth(1.07, 1.24, Math.abs(v));
      const copy = compact ? 1 - smooth(height * .38, height * .53, y)
        : 1 - .982 * (1 - smooth(width * .32, width * .66, x)) * smooth(height * .30, height * .62, y);
      const visible = life * edge * copy * (1 - smooth(.74, 1, depth));
      return { x, y, seed:node.seed, crest, foam, wake, visible };
    });
    surfaces.push({mesh, vertices, age, seed, dx, dy, nx, ny, length});
  }
  return { surfaces, compact };
}

/** Overhead breaking surf. The irregular mesh itself forms the water. */
export function drawWave(ctx, width, height, seconds, { reducedMotion = false, pointer = null } = {}) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
  const elapsed = reducedMotion ? 2.3 / SPEED : Number.isFinite(seconds) ? seconds : 0;
  const { surfaces, compact } = waterFrame(width, height, elapsed, reducedMotion ? null : pointer);
  for (const {mesh, vertices, age, seed, dx, dy, nx, ny, length} of surfaces) {
  const fills = Array.from({ length: 22 }, () => []);
  const edgeWeights = new Float32Array(mesh.edges.length);
  const nodeWeights = new Float32Array(vertices.length);
  const fragments = [];
  for (const face of mesh.faces) {
    const [a, b, c] = face.nodes.map(index => vertices[index]);
    if ((a.x < -24 && b.x < -24 && c.x < -24) || (a.x > width + 24 && b.x > width + 24 && c.x > width + 24)
      || (a.y < -24 && b.y < -24 && c.y < -24) || (a.y > height + 24 && b.y > height + 24 && c.y > height + 24)) continue;
    const visible = (a.visible + b.visible + c.visible) / 3;
    if (visible < .012) continue;
    const crest = (a.crest + b.crest + c.crest) / 3;
    const foam = (a.foam + b.foam + c.foam) / 3;
    const wake = (a.wake + b.wake + c.wake) / 3;
    const texture = .78 + face.seed * .22;
    const fill = visible * (.008 + .14 * crest + .15 * foam + .04 * wake) * texture;
    // Small leading cells break away with the spilling lip. They are removed
    // from the parent mesh, carry its three vertices, then disperse and fade.
    const onset = 4.5 + .65 * noise(face.v * 5.2, seed + 617) + face.seed * .85;
    if (face.depth < .070 && face.seed > .48 && age > onset) {
      const release = (age - onset) / 2.65;
      if (release < 1) {
        const fade = 1 - smooth(.16, 1, release), spread = Math.sin(release * Math.PI);
        const forward = length * .025 * spread * (.55 + face.seed * .45);
        const across = length * .010 * spread * (face.seed - .5);
        const scale = 1 - .60 * smooth(0, 1, release), cx = (a.x + b.x + c.x) / 3, cy = (a.y + b.y + c.y) / 3;
        const points = [a, b, c].map(p => ({x:cx + (p.x - cx) * scale + dx * forward + nx * across,
          y:cy + (p.y - cy) * scale + dy * forward + ny * across}));
        const alpha = fill * fade;
        if (alpha >= .005) fills[Math.min(21, Math.floor(alpha * 100))].push(...points.flatMap(p => [p.x, p.y]));
        fragments.push({points, alpha:visible * (.12 + crest * .23) * fade});
      }
      continue;
    }
    if (fill >= .005) fills[Math.min(21, Math.floor(fill * 100))].push(a.x, a.y, b.x, b.y, c.x, c.y);
    const edge = visible * (.021 + .32 * crest + .20 * foam + .06 * wake);
    const node = visible * (.025 + .34 * crest + .40 * foam + .055 * wake);
    for (const index of face.edges) edgeWeights[index] = Math.max(edgeWeights[index], edge);
    for (const index of face.nodes) nodeWeights[index] = Math.max(nodeWeights[index], node);
  }
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let bucket = 0; bucket < fills.length; bucket++) {
    const positions = fills[bucket]; if (!positions.length) continue;
    ctx.fillStyle = `rgba(${BLUE},${((bucket + .5) / 100).toFixed(3)})`;
    ctx.beginPath();
    for (let i = 0; i < positions.length; i += 6) {
      ctx.moveTo(positions[i], positions[i + 1]); ctx.lineTo(positions[i + 2], positions[i + 3]);
      ctx.lineTo(positions[i + 4], positions[i + 5]); ctx.closePath();
    }
    ctx.fill();
  }
  const lines = Array.from({ length: 16 }, () => []);
  for (let i = 0; i < mesh.edges.length; i++) {
    const weight = edgeWeights[i]; if (weight < .018) continue;
    const [a, b] = mesh.edges[i], p = vertices[a], q = vertices[b];
    lines[Math.min(15, Math.floor(weight * 40))].push(p.x, p.y, q.x, q.y);
  }
  for (const {points, alpha} of fragments) {
    if (alpha < .018) continue;
    for (let i = 0; i < 3; i++) {
      const p = points[i], q = points[(i + 1) % 3];
      lines[Math.min(15, Math.floor(alpha * 40))].push(p.x, p.y, q.x, q.y);
    }
  }
  for (let bucket = 0; bucket < lines.length; bucket++) {
    const positions = lines[bucket]; if (!positions.length) continue;
    ctx.strokeStyle = `rgba(${BLUE},${((bucket + .5) / 40).toFixed(3)})`;
    ctx.lineWidth = compact ? .40 : .47;
    ctx.beginPath();
    for (let i = 0; i < positions.length; i += 4) { ctx.moveTo(positions[i], positions[i + 1]); ctx.lineTo(positions[i + 2], positions[i + 3]); }
    ctx.stroke();
  }
  const grains = Array.from({ length: 15 }, () => []);
  vertices.forEach((p, i) => {
    const alpha = Math.min(.73, nodeWeights[i] * 1.8);
    if (alpha < .05 || p.x < -2 || p.x > width + 2 || p.y < -2 || p.y > height + 2) return;
    const radius = (.38 + p.seed * .30 + p.foam * .19) * (compact ? .90 : 1);
    grains[Math.min(14, Math.floor(alpha * 20))].push(p.x, p.y, radius);
  });
  for (const {points, alpha} of fragments) {
    if (alpha < .03) continue;
    for (const p of points) grains[Math.min(14, Math.floor(alpha * 32))].push(p.x, p.y, compact ? .46 : .58);
  }
  for (let bucket = 0; bucket < grains.length; bucket++) {
    const positions = grains[bucket]; if (!positions.length) continue;
    ctx.fillStyle = `rgba(${BLUE},${((bucket + .5) / 20).toFixed(3)})`;
    ctx.beginPath();
    for (let i = 0; i < positions.length; i += 3) {
      ctx.moveTo(positions[i] + positions[i + 2], positions[i + 1]);
      ctx.arc(positions[i], positions[i + 1], positions[i + 2], 0, TAU);
    }
    ctx.fill();
  }
  ctx.restore();
  }
}
