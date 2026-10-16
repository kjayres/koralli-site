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
  const px = new Float64Array(count + 3), py = new Float64Array(count + 3);
  for (let i = 0; i < count; i++) { px[i] = nodes[i].v; py[i] = nodes[i].depth * .4; }
  px[count] = -12; py[count] = -8;
  px[count + 1] = 0; py[count + 1] = 15;
  px[count + 2] = 12; py[count + 2] = -8;
  const circle = (a, b, c) => {
    const ax = px[a], ay = py[a], bx = px[b], by = py[b], cx = px[c], cy = py[c];
    const det = 2 * (ax * (by - cy) + bx * (cy - ay) + cc_ay_by(cx, ay, by));
    if (Math.abs(det) < 1e-12) return null;
    const aa = ax * ax + ay * ay, bb = bx * bx + by * by, cc = cx * cx + cy * cy;
    const x = (aa * (by - cy) + bb * (cy - ay) + cc * (ay - by)) / det;
    const y = (aa * (cx - bx) + bb * (ax - cx) + cc * (bx - ax)) / det;
    return { a, b, c, x, y, r: (x - ax) ** 2 + (y - ay) ** 2 };
  };
  const cc_ay_by = (cx, ay, by) => cx * (ay - by);
  const open = [circle(count, count + 1, count + 2)];
  const closed = [];
  const boundary = new Map();
  const stride = count + 3;
  for (let i = 0; i < count; i++) {
    const x = px[i], y = py[i];
    boundary.clear();
    let keep = 0;
    for (let t = 0; t < open.length; t++) {
      const triangle = open[t];
      const dx = x - triangle.x;
      if (dx > 0 && dx * dx > triangle.r) { closed.push(triangle); continue; }
      const dy = y - triangle.y;
      if (dx * dx + dy * dy > triangle.r + 1e-12) { open[keep++] = triangle; continue; }
      const n0 = triangle.a, n1 = triangle.b, n2 = triangle.c;
      const k0 = (n0 < n1 ? n0 : n1) * stride + (n0 < n1 ? n1 : n0);
      if (boundary.has(k0)) boundary.delete(k0); else boundary.set(k0, (n0 << 16) | n1);
      const k1 = (n1 < n2 ? n1 : n2) * stride + (n1 < n2 ? n2 : n1);
      if (boundary.has(k1)) boundary.delete(k1); else boundary.set(k1, (n1 << 16) | n2);
      const k2 = (n2 < n0 ? n2 : n0) * stride + (n2 < n0 ? n0 : n2);
      if (boundary.has(k2)) boundary.delete(k2); else boundary.set(k2, (n2 << 16) | n0);
    }
    open.length = keep;
    for (const edge of boundary.values()) {
      const t = circle(edge >>> 16, edge & 0xffff, i);
      if (t) open.push(t);
    }
  }
  const result = [];
  for (const list of [closed, open]) {
    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      if (t.a < count && t.b < count && t.c < count) result.push([t.a, t.b, t.c]);
    }
  }
  return result;
}

function makeSurface(compact) {
  const nodes = [], grid = new Map(), cell = .03;
  const spacing = compact ? .014 : .009;
  function add(v, depth, radius) {
    const x = v, y = depth * .4, gx = Math.floor(x / cell), gy = Math.floor(y / cell);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const bucket = grid.get(((gx + dx + 64) << 10) | (gy + dy + 64));
      if (!bucket) continue;
      for (let i = 0; i < bucket.length; i++) {
        const p = bucket[i];
        if ((x - p.v) ** 2 + (y - p.depth * .4) ** 2 < ((radius + p.radius) * .5) ** 2) return;
      }
    }
    const edgeFade = (1 - smooth(1.07, 1.24, Math.abs(v))) * (1 - smooth(.74, 1, depth));
    const node = { v, depth, radius, seed: random(nodes.length, 721), edgeFade };
    nodes.push(node);
    const key = ((gx + 64) << 10) | (gy + 64);
    let bucket = grid.get(key);
    if (!bucket) { bucket = []; grid.set(key, bucket); }
    bucket.push(node);
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
  const nodeCount = nodes.length;
  const slots = Array.from({ length: 4 }, () => ({
    seed: NaN,
    ageShift: new Float64Array(nodeCount),
    baseRough: new Float64Array(nodeCount),
    vx: new Float64Array(nodeCount),
    vy: new Float64Array(nodeCount),
    vCrest: new Float64Array(nodeCount),
    vFoam: new Float64Array(nodeCount),
    vWake: new Float64Array(nodeCount),
    vVisible: new Float64Array(nodeCount),
  }));
  const edgeWeights = new Float32Array(edges.length);
  const nodeWeights = new Float32Array(nodeCount);
  return { nodes, faces, edges, slots, edgeWeights, nodeWeights };
}
let desktop, mobile;
const fills = Array.from({ length: 22 }, () => []);
const lines = Array.from({ length: 16 }, () => []);
const grains = Array.from({ length: 15 }, () => []);
const FILL_STYLES = Array.from({ length: 22 }, (_, b) => `rgba(${BLUE},${((b + .5) / 100).toFixed(3)})`);
const LINE_STYLES = Array.from({ length: 16 }, (_, b) => `rgba(${BLUE},${((b + .5) / 40).toFixed(3)})`);
const GRAIN_STYLES = Array.from({ length: 15 }, (_, b) => `rgba(${BLUE},${((b + .5) / 20).toFixed(3)})`);

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
  const nodes = mesh.nodes, nodeCount = nodes.length;
  for (let offset = -2; offset <= 1; offset++) {
    const index = nearest + offset, seed = index * 73;
    const age = time - index * INTERVAL - (random(index, 19) - .5) * 1.0;
    if (age < -.8 || age > 18) continue;
    const life = smooth(-.8, 1.2, age) * (1 - smooth(14.5, 18, age));
    const slot = mesh.slots[offset + 2];
    const { ageShift, baseRough, vx, vy, vCrest, vFoam, vWake, vVisible } = slot;
    if (slot.seed !== seed) {
      slot.seed = seed;
      for (let i = 0; i < nodeCount; i++) {
        const v = nodes[i].v;
        ageShift[i] = .48 * noise(v * 2.8, seed + 31) + .14 * noise(v * 8, seed + 97);
        baseRough[i] = .023 * noise(v * 3.0, seed + 41) + .008 * noise(v * 9.3, seed + 103);
      }
    }
    for (let i = 0; i < nodeCount; i++) {
      const node = nodes[i];
      const depth = node.depth, v = node.v;
      const localAge = age - ageShift[i];
      const breaking = smooth(3.0, 5.7, localAge);
      const spreading = smooth(5.0, 9.5, localAge);
      const roughness = baseRough[i] + .003 * noise(v * 25 + localAge * .13, seed + 179);
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
      const copy = compact ? 1 - smooth(height * .38, height * .53, y)
        : 1 - .982 * (1 - smooth(width * .32, width * .66, x)) * smooth(height * .30, height * .62, y);
      vx[i] = x; vy[i] = y;
      vCrest[i] = crest; vFoam[i] = foam; vWake[i] = wake;
      vVisible[i] = life * node.edgeFade * copy;
    }
    surfaces.push({ mesh, slot, age, seed, dx, dy, nx, ny, length });
  }
  return { surfaces, compact };
}

/** Overhead breaking surf. The irregular mesh itself forms the water. */
export function drawWave(ctx, width, height, seconds, { reducedMotion = false, pointer = null } = {}) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
  const elapsed = reducedMotion ? 2.3 / SPEED : Number.isFinite(seconds) ? seconds : 0;
  const { surfaces, compact } = waterFrame(width, height, elapsed, reducedMotion ? null : pointer);
  for (const { mesh, slot, age, seed, dx, dy, nx, ny, length } of surfaces) {
    const { vx, vy, vCrest, vFoam, vWake, vVisible } = slot;
    for (let i = 0; i < fills.length; i++) fills[i].length = 0;
    for (let i = 0; i < lines.length; i++) lines[i].length = 0;
    for (let i = 0; i < grains.length; i++) grains[i].length = 0;
    const edgeWeights = mesh.edgeWeights; edgeWeights.fill(0);
    const nodeWeights = mesh.nodeWeights; nodeWeights.fill(0);
    const fragments = [];
    const faces = mesh.faces;
    for (let f = 0; f < faces.length; f++) {
      const face = faces[f], fn = face.nodes;
      const ia = fn[0], ib = fn[1], ic = fn[2];
      const ax = vx[ia], bx = vx[ib], cx = vx[ic];
      if ((ax < -24 && bx < -24 && cx < -24) || (ax > width + 24 && bx > width + 24 && cx > width + 24)) continue;
      const ay = vy[ia], by = vy[ib], cy = vy[ic];
      if ((ay < -24 && by < -24 && cy < -24) || (ay > height + 24 && by > height + 24 && cy > height + 24)) continue;
      const visible = (vVisible[ia] + vVisible[ib] + vVisible[ic]) / 3;
      if (visible < .012) continue;
      const crest = (vCrest[ia] + vCrest[ib] + vCrest[ic]) / 3;
      const foam = (vFoam[ia] + vFoam[ib] + vFoam[ic]) / 3;
      const wake = (vWake[ia] + vWake[ib] + vWake[ic]) / 3;
      const texture = .78 + face.seed * .22;
      const fill = visible * (.008 + .14 * crest + .15 * foam + .04 * wake) * texture;
      // Small leading cells break away with the spilling lip. They are removed
      // from the parent mesh, carry its three vertices, then disperse and fade.
      if (face.depth < .070 && face.seed > .48) {
        const onset = 4.5 + .65 * noise(face.v * 5.2, seed + 617) + face.seed * .85;
        if (age > onset) {
          const release = (age - onset) / 2.65;
          if (release < 1) {
            const fade = 1 - smooth(.16, 1, release), spread = Math.sin(release * Math.PI);
            const forward = length * .025 * spread * (.55 + face.seed * .45);
            const across = length * .010 * spread * (face.seed - .5);
            const scale = 1 - .60 * smooth(0, 1, release), mcx = (ax + bx + cx) / 3, mcy = (ay + by + cy) / 3;
            const ox = dx * forward + nx * across, oy = dy * forward + ny * across;
            const p0x = mcx + (ax - mcx) * scale + ox, p0y = mcy + (ay - mcy) * scale + oy;
            const p1x = mcx + (bx - mcx) * scale + ox, p1y = mcy + (by - mcy) * scale + oy;
            const p2x = mcx + (cx - mcx) * scale + ox, p2y = mcy + (cy - mcy) * scale + oy;
            const alpha = fill * fade;
            if (alpha >= .005) fills[Math.min(21, Math.floor(alpha * 100))].push(p0x, p0y, p1x, p1y, p2x, p2y);
            fragments.push({ points: [{ x: p0x, y: p0y }, { x: p1x, y: p1y }, { x: p2x, y: p2y }], alpha: visible * (.12 + crest * .23) * fade });
          }
          continue;
        }
      }
      if (fill >= .005) fills[Math.min(21, Math.floor(fill * 100))].push(ax, ay, bx, by, cx, cy);
      const edge = visible * (.021 + .32 * crest + .20 * foam + .06 * wake);
      const node = visible * (.025 + .34 * crest + .40 * foam + .055 * wake);
      const fe = face.edges;
      if (edge > edgeWeights[fe[0]]) edgeWeights[fe[0]] = edge;
      if (edge > edgeWeights[fe[1]]) edgeWeights[fe[1]] = edge;
      if (edge > edgeWeights[fe[2]]) edgeWeights[fe[2]] = edge;
      if (node > nodeWeights[ia]) nodeWeights[ia] = node;
      if (node > nodeWeights[ib]) nodeWeights[ib] = node;
      if (node > nodeWeights[ic]) nodeWeights[ic] = node;
    }
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let bucket = 0; bucket < fills.length; bucket++) {
      const positions = fills[bucket]; if (!positions.length) continue;
      ctx.fillStyle = FILL_STYLES[bucket];
      ctx.beginPath();
      for (let i = 0; i < positions.length; i += 6) {
        ctx.moveTo(positions[i], positions[i + 1]); ctx.lineTo(positions[i + 2], positions[i + 3]);
        ctx.lineTo(positions[i + 4], positions[i + 5]); ctx.closePath();
      }
      ctx.fill();
    }
    const edges = mesh.edges;
    for (let i = 0; i < edges.length; i++) {
      const weight = edgeWeights[i]; if (weight < .018) continue;
      const e = edges[i], a = e[0], b = e[1];
      lines[Math.min(15, Math.floor(weight * 40))].push(vx[a], vy[a], vx[b], vy[b]);
    }
    for (const { points, alpha } of fragments) {
      if (alpha < .018) continue;
      const bucket = lines[Math.min(15, Math.floor(alpha * 40))];
      for (let i = 0; i < 3; i++) {
        const p = points[i], q = points[(i + 1) % 3];
        bucket.push(p.x, p.y, q.x, q.y);
      }
    }
    for (let bucket = 0; bucket < lines.length; bucket++) {
      const positions = lines[bucket]; if (!positions.length) continue;
      ctx.strokeStyle = LINE_STYLES[bucket];
      ctx.lineWidth = compact ? .40 : .47;
      ctx.beginPath();
      for (let i = 0; i < positions.length; i += 4) { ctx.moveTo(positions[i], positions[i + 1]); ctx.lineTo(positions[i + 2], positions[i + 3]); }
      ctx.stroke();
    }
    const nodes = mesh.nodes, radiusScale = compact ? .90 : 1;
    for (let i = 0; i < nodes.length; i++) {
      const alpha = Math.min(.73, nodeWeights[i] * 1.8);
      if (alpha < .05) continue;
      const px = vx[i], py = vy[i];
      if (px < -2 || px > width + 2 || py < -2 || py > height + 2) continue;
      const radius = (.38 + nodes[i].seed * .30 + vFoam[i] * .19) * radiusScale;
      grains[Math.min(14, Math.floor(alpha * 20))].push(px, py, radius);
    }
    for (const { points, alpha } of fragments) {
      if (alpha < .03) continue;
      const bucket = grains[Math.min(14, Math.floor(alpha * 32))], r = compact ? .46 : .58;
      for (const p of points) bucket.push(p.x, p.y, r);
    }
    for (let bucket = 0; bucket < grains.length; bucket++) {
      const positions = grains[bucket]; if (!positions.length) continue;
      ctx.fillStyle = GRAIN_STYLES[bucket];
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
