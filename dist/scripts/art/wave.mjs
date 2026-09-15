const TAU = Math.PI * 2;
const PERIOD = 18;
const BLUE = '36,78,255';
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const random = (a, b = 0) => {
  let n = Math.imul(a + 271, 374761393) ^ Math.imul(b + 137, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
};
function noise(x, seed) {
  const i = Math.floor(x), t = smooth(0, 1, x - i);
  return (random(i, seed) * (1 - t) + random(i + 1, seed) * t) * 2 - 1;
}

function makeSurface(rowCount, density) {
  const nodes = [], faces = [], rows = [];
  for (let row = 0; row < rowCount; row += 1) {
    const indices = [], count = density + Math.round(random(row, 3) * 8);
    for (let j = 0; j <= count; j += 1) {
      const seed = random(row + 103, j + 701);
      const depth = 1 - (row + (row > 0 && row < rowCount - 1 ? (seed - 0.5) * 0.50 : 0)) / (rowCount - 1);
      const v = -1.26 + (j + (random(j + 317, row) - 0.5) * 0.70) / count * 2.52;
      indices.push(nodes.length);
      nodes.push({ depth, v, seed, row });
    }
    rows.push(indices);
  }
  for (let row = 0; row < rows.length - 1; row += 1) {
    const a = rows[row], b = rows[row + 1]; let i = 0, j = 0;
    while (i < a.length - 1 || j < b.length - 1) {
      if (j === b.length - 1 || (i < a.length - 1 && nodes[a[i + 1]].v < nodes[b[j + 1]].v)) {
        faces.push({ nodes: [a[i], b[j], a[i + 1]], foam: false }); i += 1;
      } else {
        faces.push({ nodes: [a[i], b[j], b[j + 1]], foam: row === rowCount - 2 }); j += 1;
      }
    }
  }
  const edges = [], lookup = new Map();
  faces.forEach((face, index) => {
    face.seed = random(index + 389, 71);
    face.edges = face.nodes.map((a, i) => {
      const b = face.nodes[(i + 1) % 3], low = Math.min(a, b), high = Math.max(a, b);
      const key = low * nodes.length + high;
      if (!lookup.has(key)) { lookup.set(key, edges.length); edges.push([low, high]); }
      return lookup.get(key);
    });
  });
  return { nodes, faces, edges };
}
const DESKTOP = makeSurface(35, 111);
const MOBILE = makeSurface(29, 52);

/**
 * One broad triangulated water surface, viewed from above. Every fill, edge
 * and node comes from the same vertices. Small breaking fragments are actual
 * front triangles separating from that surface, not another decorative layer.
 * Caller owns clearing, DPR, RAF and offscreen lifecycle. Pointer coordinates
 * are local CSS pixels with strength 0..1. Reduced motion ignores the pointer.
 */
export function drawWave(ctx, width, height, seconds, { reducedMotion = false, pointer = null } = {}) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
  const compact = width < 760;
  const time = reducedMotion ? 8.25 : Number.isFinite(seconds) ? ((seconds % PERIOD) + PERIOD) % PERIOD : 0;
  const cycle = time / PERIOD, angle = cycle * TAU;
  const progress = -0.025 + cycle * 1.16;
  const life = smooth(0.004, 0.13, cycle) * (1 - smooth(0.84, 0.998, cycle));
  const ox = width * (compact ? -0.015 : 0.255), oy = height * (compact ? 0.47 : 0.69);
  const tx = width * 1.14, ty = height * (compact ? -0.035 : -0.16);
  const length = Math.hypot(tx - ox, ty - oy);
  if (!Number.isFinite(length) || length <= 0) return;
  const dx = (tx - ox) / length, dy = (ty - oy) / length, nx = -dy, ny = dx;
  const breadth = compact ? Math.min(width * 0.79, height * 0.43) : Math.min(width * 0.61, height * 0.92);
  const bodyDepth = length * (compact ? 0.255 : 0.238);
  const pointerStrength = !reducedMotion && pointer && Number.isFinite(pointer.x)
    && Number.isFinite(pointer.y) && Number.isFinite(pointer.strength) ? clamp(pointer.strength) : 0;
  const pointerRadius = clamp(width * 0.12, 86, 190);
  const mesh = compact ? MOBILE : DESKTOP;

  function visibility(x, y, v) {
    const edge = 1 - smooth(1.01, 1.26, Math.abs(v));
    const copy = compact ? 1 - smooth(height * 0.38, height * 0.53, y)
      : 1 - 0.978 * (1 - smooth(width * 0.32, width * 0.65, x)) * smooth(height * 0.29, height * 0.59, y);
    return edge * copy * smooth(-height * 0.06, height * 0.025, y);
  }

  const vertices = mesh.nodes.map(node => {
    const { depth, v, seed } = node;
    // Coherent irregularity at three scales makes one changing surf front.
    const front = progress * length + length * (
      0.030 * noise(v * 2.8 + 0.10 * Math.sin(angle), 21)
      + 0.0095 * noise(v * 10.4 + 0.28 * Math.sin(angle * 2), 74)
      + 0.0038 * noise(v * 28.3 + 0.34 * Math.sin(angle), 117));
    const lip = Math.exp(-depth / 0.085);
    // Short, differently phased run-ups disturb only the fine waterline. The
    // broader front stays coherent while neighbouring tongues advance/relax.
    const runup = length * lip * (
      0.0048 * Math.sin(v * 17.3 + angle * 4 + noise(v * 5.2, 91))
      + 0.0022 * Math.sin(v * 39.2 - angle * 7)
      + 0.0020 * noise(v * 56.4 + 0.7 * Math.sin(angle * 3), 143));
    const roll = 1.21 + 0.27 * smooth(0.16, 0.80, cycle)
      + 0.11 * Math.sin(v * 5.1 + angle);
    const localPhase = cycle - 0.10 * smooth(-1, 1, v) + 0.025 * noise(v * 4, 67);
    const building = smooth(0.04, 0.38, localPhase);
    const spilling = smooth(0.37, 0.75, localPhase);
    const shoulder = Math.exp(-0.5 * ((depth - (0.18 - 0.07 * spilling)) / 0.125) ** 2);
    // A shoulder gathers behind the lip, folds forwards, then relaxes as the
    // local front spills. These shifts deform the very same surface vertices.
    const fold = bodyDepth * 0.019 * building * (1 - 0.65 * spilling)
      * depth / (depth + 0.10) * shoulder;
    const surge = bodyDepth * 0.022 * building * (1 - 0.9 * spilling) * Math.exp(-depth / 0.11);
    const q = -bodyDepth * depth ** roll + fold + surge + runup;
    const side = (1 - depth) * (compact ? 2.3 : 5.8) * Math.sin(v * 16 + angle + seed * 0.45)
      + (compact ? 1.5 : 3.5) * spilling * Math.exp(-depth / 0.14) * Math.sin(v * 27 + angle * 0.5);
    const drift = Math.sin(angle * 2 + seed * TAU) * (compact ? 0.7 : 1.5) * depth * (1 - depth);
    let x = ox + dx * (front + q + drift) + nx * (v * breadth + side);
    let y = oy + dy * (front + q + drift) + ny * (v * breadth + side);
    if (pointerStrength) {
      const px = (x - pointer.x) / pointerRadius, py = (y - pointer.y) / pointerRadius;
      const distance = Math.hypot(px, py);
      if (distance < 2.3) {
        const response = Math.exp(-2.7 * distance * distance) * (1 - smooth(1.5, 2.3, distance));
        const amount = 12 * pointerStrength * response * (0.85 + 0.25 * Math.sin(distance * 7.2 - angle * 3));
        x += px * amount; y += py * amount;
      }
    }
    const crest = Math.exp(-0.5 * ((depth - (0.14 - 0.06 * spilling)) / 0.14) ** 2)
      * (1 - lip * (0.07 + 0.08 * smooth(-0.45, 0.7, noise(v * 13.5 + 0.22 * Math.sin(angle * 2), 176))));
    const swell = 0.32 * Math.exp(-0.5 * ((depth - 0.43) / 0.23) ** 2);
    const trailing = 0.10 * Math.exp(-0.5 * ((depth - 0.81) / 0.055) ** 2);
    const energy = clamp(crest * (1 - 0.45 * spilling)
      + swell * (1 + 0.2 * building) * (1 - 0.12 * spilling)
      + trailing * (1 + 0.8 * spilling));
    const fade = 1 - smooth(0.82, 1, depth);
    return { x, y, v, seed, energy, visible: life * fade * visibility(x, y, v) };
  });

  const fillBuckets = Array.from({ length: 20 }, () => []);
  const edgeWeights = new Float32Array(mesh.edges.length);
  const nodeWeights = new Float32Array(vertices.length);
  const foam = [];

  function fillTriangle(points, alpha) {
    if (alpha < 0.004) return false;
    const bucket = Math.min(19, Math.floor(alpha * 100));
    fillBuckets[bucket].push(points[0].x, points[0].y, points[1].x, points[1].y, points[2].x, points[2].y);
    return true;
  }

  for (const face of mesh.faces) {
    const points = face.nodes.map(index => vertices[index]);
    const visible = Math.min(...points.map(p => p.visible));
    if (visible < 0.01) continue;
    const energy = points.reduce((sum, p) => sum + p.energy, 0) / 3;
    const texture = 0.88 + 0.12 * face.seed;
    const fillAlpha = visible * (0.014 + 0.15 * energy) * texture;
    if (fillAlpha < 0.004) continue;

    // Only real front faces can break free. Their vertices move together and
    // all three matching edges fade with the triangle, so no bare edges extend
    // ahead of an independently painted crest.
    const along = (points[0].v + points[1].v + points[2].v) / 3;
    const onset = 0.29 + 0.20 * smooth(-1, 1, along) + 0.07 * face.seed
      + 0.032 * noise(along * 16.5, 204);
    const age = (cycle - onset) / 0.19;
    if (face.foam && face.seed > 0.64 && age > 0) {
      if (age < 1) {
        const opacity = 1 - smooth(0.18, 1, age);
        const travel = (compact ? 11 : 23) * (0.68 + face.seed * 0.48) * age ** 1.2;
        const across = (face.seed - 0.5) * (compact ? 7 : 14) * age;
        const shrink = 1 - 0.56 * smooth(0.06, 1, age);
        const centre = { x: points.reduce((s,p) => s+p.x,0)/3, y: points.reduce((s,p) => s+p.y,0)/3 };
        const moved = points.map(p => ({ ...p,
          x: centre.x + (p.x-centre.x)*shrink + dx * travel + nx * across,
          y: centre.y + (p.y-centre.y)*shrink + dy * travel + ny * across }));
        if (fillTriangle(moved, fillAlpha * opacity)) {
          foam.push({ points: moved, alpha: visible * (0.12 + energy * 0.23) * opacity });
        }
      }
      continue;
    }

    fillTriangle(points, fillAlpha);
    const weight = visible * (0.025 + energy * 0.29);
    for (const edge of face.edges) edgeWeights[edge] = Math.max(edgeWeights[edge], weight);
    for (const index of face.nodes) nodeWeights[index] = Math.max(nodeWeights[index], weight);
  }

  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // Batching retains identical vertex coordinates while keeping the fine
  // triangulation practical to animate. Every subpath is a surface triangle.
  for (let bucket = 0; bucket < fillBuckets.length; bucket += 1) {
    const positions = fillBuckets[bucket]; if (!positions.length) continue;
    ctx.fillStyle = `rgba(${BLUE},${((bucket + 0.5) / 100).toFixed(3)})`;
    ctx.beginPath();
    for (let i = 0; i < positions.length; i += 6) {
      ctx.moveTo(positions[i], positions[i + 1]); ctx.lineTo(positions[i + 2], positions[i + 3]); ctx.lineTo(positions[i + 4], positions[i + 5]); ctx.closePath();
    }
    ctx.fill();
  }

  const edgeBuckets = Array.from({ length: 12 }, () => []);
  for (let i = 0; i < mesh.edges.length; i += 1) {
    const weight = edgeWeights[i]; if (weight < 0.012) continue;
    const [a, b] = mesh.edges[i], p = vertices[a], q = vertices[b];
    const bucket = Math.min(11, Math.floor(weight * 35));
    edgeBuckets[bucket].push(p.x, p.y, q.x, q.y);
  }
  for (const fragment of foam) {
    if (fragment.alpha < 0.012) continue;
    const bucket = Math.min(11, Math.floor(fragment.alpha * 35));
    fragment.points.forEach((p, i) => {
      const q = fragment.points[(i + 1) % 3];
      edgeBuckets[bucket].push(p.x, p.y, q.x, q.y);
    });
  }
  for (let bucket = 0; bucket < edgeBuckets.length; bucket += 1) {
    const positions = edgeBuckets[bucket]; if (!positions.length) continue;
    ctx.strokeStyle = `rgba(${BLUE},${((bucket + 0.5) / 35).toFixed(3)})`;
    ctx.lineWidth = compact ? 0.38 : 0.45;
    ctx.beginPath();
    for (let i = 0; i < positions.length; i += 4) { ctx.moveTo(positions[i], positions[i + 1]); ctx.lineTo(positions[i + 2], positions[i + 3]); }
    ctx.stroke();
  }

  function dot(p, weight) {
    if (weight < 0.027) return;
    ctx.fillStyle = `rgba(${BLUE},${Math.min(0.67, weight * 1.7).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, (0.38 + p.seed * 0.35 + p.energy * 0.14) * (compact ? 0.83 : 1), 0, TAU); ctx.fill();
  }
  vertices.forEach((p, i) => dot(p, nodeWeights[i]));
  foam.forEach(fragment => fragment.points.forEach(p => dot(p, fragment.alpha)));
  ctx.restore();
}
