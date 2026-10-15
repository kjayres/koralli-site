const MAX_PIXELS = 6_000_000;
const littleEndian = new Uint8Array(new Uint32Array([0x01020304]).buffer)[0] === 4;

function rgba32(colour) {
  const values = colour.match(/[\d.]+/g)?.map(Number);
  if (!colour.startsWith('rgb') || !values || values.length < 3) {
    throw new TypeError(`Expected an RGB reef colour, received ${colour}`);
  }
  const [r, g, b] = values.map(value => Math.max(0, Math.min(255, Math.round(value))));
  return littleEndian ? (255 << 24) | (b << 16) | (g << 8) | r
    : (r << 24) | (g << 16) | (b << 8) | 255;
}

function clipLine(a, b, width, height) {
  const dx = b.x - a.x, dy = b.y - a.y;
  let lo = 0, hi = 1;
  for (const [p, q] of [[-dx, a.x], [dx, width - a.x], [-dy, a.y], [dy, height - a.y]]) {
    if (p === 0) { if (q < 0) return null; continue; }
    const t = q / p;
    if (p < 0) lo = Math.max(lo, t);
    else hi = Math.min(hi, t);
    if (lo > hi) return null;
  }
  return [lo, hi];
}

function midpoint(a, b) {
  const total = a.z + b.z;
  return { x: (a.x * a.z + b.x * b.z) / total,
    y: (a.y * a.z + b.y * b.z) / total, z: total / 2 };
}

// This runs only when the static reef cache is rebuilt. Inverse depth is
// linear across a projected triangle, unlike ordinary camera-space depth.
export function paintReefSurface(ctx, triangles, width, height) {
  const steps = reefSurfaceSteps(ctx, triangles, width, height);
  let result = steps.next();
  while (!result.done) result = steps.next();
  return result.value;
}

export function* reefSurfaceSteps(ctx, triangles, width, height) {
  if (!(width > 0 && height > 0 && Number.isFinite(width + height))) return null;
  const transform = ctx.getTransform?.();
  const requested = transform ? Math.max(Math.hypot(transform.a, transform.b), Math.hypot(transform.c, transform.d)) : 1;
  const dpr = Math.min(2, Math.max(1, requested || 1), Math.sqrt(MAX_PIXELS / (width * height)), 8192 / Math.max(width, height));
  const rasterWidth = Math.max(1, Math.ceil(width * dpr)), rasterHeight = Math.max(1, Math.ceil(height * dpr));
  const surface = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(rasterWidth, rasterHeight)
    : ctx.canvas.ownerDocument.createElement('canvas');
  surface.width = rasterWidth; surface.height = rasterHeight;
  const paint = surface.getContext('2d'), image = paint.createImageData(rasterWidth, rasterHeight);
  const pixels = new Uint32Array(image.data.buffer, image.data.byteOffset, rasterWidth * rasterHeight);
  const depth = new Float32Array(rasterWidth * rasterHeight), colours = new Map();
  const edges = new Map(), vertexIds = new WeakMap(), positions = new Map();
  let nextId = 0, triangleCount = 0;
  function vertexId(point) {
    if (vertexIds.has(point)) return vertexIds.get(point);
    const key = `${point.x.toFixed(5)},${point.y.toFixed(5)},${point.z.toFixed(5)}`;
    let id = positions.get(key);
    if (id === undefined) { id = nextId++; positions.set(key, id); }
    vertexIds.set(point, id);
    return id;
  }
  function addEdge(a, b, triangle, slope, lineWidth = triangle.width) {
    const ai = vertexId(a), bi = vertexId(b), key = ai < bi ? `${ai}:${bi}` : `${bi}:${ai}`;
    const previous = edges.get(key);
    if (previous) { previous.slope = Math.max(previous.slope, slope); return; }
    edges.set(key, { a, b, stroke: triangle.stroke, width: lineWidth, slope });
  }
  let processed = 0;
  for (const triangle of triangles) {
    if (++processed % 256 === 0) yield;
    const { a, b, c } = triangle;
    if (![a, b, c].every(p => p && Number.isFinite(p.x + p.y + p.z) && p.z > 0)) continue;
    const ax = a.x * dpr, ay = a.y * dpr, bx = b.x * dpr, by = b.y * dpr, cx = c.x * dpr, cy = c.y * dpr;
    const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (Math.abs(den) < 1e-8) continue;
    const left = Math.max(0, Math.floor(Math.min(ax, bx, cx))), right = Math.min(rasterWidth - 1, Math.floor(Math.max(ax, bx, cx)));
    const top = Math.max(0, Math.floor(Math.min(ay, by, cy))), bottom = Math.min(rasterHeight - 1, Math.floor(Math.max(ay, by, cy)));
    if (left > right || top > bottom) continue;
    const ux = (by - cy) / den, uy = (cx - bx) / den, vx = (cy - ay) / den, vy = (ax - cx) / den;
    const za = 1 / a.z, zb = 1 / b.z, zc = 1 / c.z;
    const dx = ux * (za - zc) + vx * (zb - zc), dy = uy * (za - zc) + vy * (zb - zc);
    let colour = colours.get(triangle.fill);
    if (colour === undefined) { colour = rgba32(triangle.fill); colours.set(triangle.fill, colour); }
    for (let y = top; y <= bottom; y++) {
      let u = ux * (left + .5 - cx) + uy * (y + .5 - cy);
      let v = vx * (left + .5 - cx) + vy * (y + .5 - cy);
      let inverse = u * za + v * zb + (1 - u - v) * zc;
      let index = y * rasterWidth + left;
      for (let x = left; x <= right; x++, index++, u += ux, v += vx, inverse += dx) {
        if (u >= -1e-7 && v >= -1e-7 && u + v <= 1.0000001 && inverse > depth[index]) {
          depth[index] = inverse; pixels[index] = colour;
        }
      }
    }
    // Allow for the offset from an edge sample to the depth pixel's centre.
    const slope = .55 * (Math.abs(dx) + Math.abs(dy));
    addEdge(a, b, triangle, slope); addEdge(b, c, triangle, slope); addEdge(c, a, triangle, slope);
    if (triangle.subdivide) {
      const ab = midpoint(a, b), bc = midpoint(b, c), ca = midpoint(c, a);
      addEdge(ab, bc, triangle, slope, .24); addEdge(bc, ca, triangle, slope, .24); addEdge(ca, ab, triangle, slope, .24);
    }
    triangleCount++;
  }
  paint.putImageData(image, 0, 0);
  ctx.save();
  ctx.drawImage(surface, 0, 0, rasterWidth, rasterHeight, 0, 0, width, height);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const groups = new Map();
  for (const edge of edges.values()) {
    if (++processed % 1024 === 0) yield;
    if (!(Number.isFinite(edge.width) && edge.width > 0)) continue;
    const key = `${edge.stroke}:${edge.width}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(edge);
  }
  let visibleEdges = 0, visibleSegments = 0;
  for (const group of groups.values()) {
    ctx.strokeStyle = group[0].stroke; ctx.lineWidth = group[0].width;
    ctx.beginPath();
    let pathCount = 0;
    for (const { a, b, slope } of group) {
      if (++processed % 256 === 0) yield;
      const clip = clipLine(a, b, width, height);
      if (!clip) continue;
      const [lo, hi] = clip, dx = b.x - a.x, dy = b.y - a.y;
      const za = 1 / a.z, dz = 1 / b.z - za;
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) * (hi - lo) * dpr / .6));
      let start = null, wasVisible = false;
      function finish(end) {
        ctx.moveTo(a.x + dx * start, a.y + dy * start);
        ctx.lineTo(a.x + dx * end, a.y + dy * end);
        visibleSegments++; pathCount++; wasVisible = true; start = null;
        if (pathCount >= 4096) { ctx.stroke(); ctx.beginPath(); pathCount = 0; }
      }
      for (let i = 0; i < steps; i++) {
        const t = lo + (hi - lo) * (i + .5) / steps;
        const x = Math.min(rasterWidth - 1, Math.max(0, Math.floor((a.x + dx * t) * dpr)));
        const y = Math.min(rasterHeight - 1, Math.max(0, Math.floor((a.y + dy * t) * dpr)));
        const inverse = za + dz * t;
        const visible = inverse + slope + inverse * .00002 >= depth[y * rasterWidth + x];
        if (visible && start === null) start = lo + (hi - lo) * i / steps;
        if (!visible && start !== null) finish(lo + (hi - lo) * i / steps);
      }
      if (start !== null) finish(hi);
      if (wasVisible) visibleEdges++;
    }
    if (pathCount) ctx.stroke();
  }
  ctx.restore();
  return { triangles: triangleCount, edges: edges.size, visibleEdges, visibleSegments,
    rasterWidth, rasterHeight, dpr, depthBuffer: depth };
}

export function reefInverseDepthAt(surface, x, y) {
  if (!surface?.depthBuffer) return 0;
  const ix = Math.floor(x * surface.dpr), iy = Math.floor(y * surface.dpr);
  if (ix < 0 || iy < 0 || ix >= surface.rasterWidth || iy >= surface.rasterHeight) return 0;
  return surface.depthBuffer[iy * surface.rasterWidth + ix];
}

function actorWorkspace(ctx, width, height) {
  const rasterWidth = Math.ceil(width), rasterHeight = Math.ceil(height);
  const surface = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(rasterWidth, rasterHeight)
    : ctx.canvas.ownerDocument.createElement('canvas');
  surface.width = rasterWidth; surface.height = rasterHeight;
  const paint = surface.getContext('2d'), image = paint.createImageData(rasterWidth, rasterHeight);
  return { width, height, rasterWidth, rasterHeight, dpr: 1, surface, paint, image,
    pixels: new Uint32Array(image.data.buffer, image.data.byteOffset, rasterWidth * rasterHeight),
    depthBuffer: new Float32Array(rasterWidth * rasterHeight), baseDepth: new Float32Array(rasterWidth * rasterHeight),
    colours: new Map(), groups: new Map(), edges: [], edgeLookup: new Map(),
    // Inverse camera depth: larger means nearer, zero means no surface.
    depthAt(x, y) {
      if (x < 0 || y < 0 || x >= this.width || y >= this.height) return 0;
      return Math.max(this.depthBuffer[Math.floor(y) * this.rasterWidth + Math.floor(x)], this.staticDepthAt(x, y));
    },
    staticDepthAt(x, y) {
      if (!this.underlay) return 0;
      const ix = Math.min(this.underlay.rasterWidth - 1, Math.max(0, Math.floor(x * this.staticScaleX)));
      const iy = Math.min(this.underlay.rasterHeight - 1, Math.max(0, Math.floor(y * this.staticScaleY)));
      return this.underlay.depthBuffer[iy * this.underlay.rasterWidth + ix];
    },
  };
}

// Moving geometry is a small transparent layer over the cached reef. Reuse the
// returned workspace on every frame; the static underlay may have a higher DPR.
export function* reefActorPreparationSteps(ctx, width, height, underlay = null, workspace = null) {
  if (!(width > 0 && height > 0 && Number.isFinite(width + height))) return null;
  const work = workspace?.width === width && workspace?.height === height ? workspace : actorWorkspace(ctx, width, height);
  const {rasterWidth,rasterHeight,baseDepth}=work;
  if (work.underlay !== underlay || work.underlayBuffer !== underlay?.depthBuffer) {
    work.underlay = underlay; work.underlayBuffer = underlay?.depthBuffer;
    work.staticScaleX = underlay ? underlay.rasterWidth / width : 1;
    work.staticScaleY = underlay ? underlay.rasterHeight / height : 1;
    for (let y = 0; y < rasterHeight; y++) {
      if(y%16===0)yield;
      for (let x = 0; x < rasterWidth; x++) {
      let nearest = 0;
      if (underlay) {
        const x0 = Math.floor(x * work.staticScaleX), x1 = Math.min(underlay.rasterWidth - 1, Math.ceil((x + 1) * work.staticScaleX) - 1);
        const y0 = Math.floor(y * work.staticScaleY), y1 = Math.min(underlay.rasterHeight - 1, Math.ceil((y + 1) * work.staticScaleY) - 1);
        for (let sy = y0; sy <= y1; sy++) for (let sx = x0; sx <= x1; sx++) {
          nearest = Math.max(nearest, underlay.depthBuffer[sy * underlay.rasterWidth + sx]);
        }
      }
      // Conservative downsampling prevents a rear actor leaking through the
      // half-pixel boundary of a foreground branch at the higher static DPR.
      baseDepth[y * rasterWidth + x] = nearest;
      }
    }
  }
  return work;
}

export function paintReefActors(ctx, triangles, width, height, { underlay = null, workspace = null } = {}) {
  const steps=reefActorPreparationSteps(ctx,width,height,underlay,workspace);
  let prepared=steps.next();while(!prepared.done)prepared=steps.next();
  const work=prepared.value;
  if(!work)return null;
  const { rasterWidth, rasterHeight, pixels, depthBuffer: depth, baseDepth, colours, groups, edges, edgeLookup } = work;
  pixels.fill(0); depth.set(baseDepth);
  for (const widths of groups.values()) for (const group of widths.values()) group.count = 0;
  edgeLookup.clear();
  const vertexIds = new WeakMap();
  let nextVertex = 1;
  function vertexId(point) {
    let id = vertexIds.get(point);
    if (id === undefined) { id = nextVertex++; vertexIds.set(point, id); }
    return id;
  }
  let edgeCount = 0, triangleCount = 0;
  function addEdge(a, b, ai, bi, slope, group) {
    const key = ai < bi ? ai * 67108864 + bi : bi * 67108864 + ai;
    const existing = edgeLookup.get(key);
    if (existing) { existing.slope = Math.max(existing.slope, slope); return; }
    const edge = edges[edgeCount] || (edges[edgeCount] = {});
    edge.a = a; edge.b = b; edge.slope = slope;
    edgeLookup.set(key, edge);
    group.indices[group.count++] = edgeCount++;
  }
  for (const triangle of triangles) {
    const { a, b, c } = triangle;
    if (!a || !b || !c || !Number.isFinite(a.x + a.y + a.z + b.x + b.y + b.z + c.x + c.y + c.z)
      || a.z <= 0 || b.z <= 0 || c.z <= 0) continue;
    const den = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
    if (Math.abs(den) < 1e-8) continue;
    const left = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x))), right = Math.min(rasterWidth - 1, Math.floor(Math.max(a.x, b.x, c.x)));
    const top = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y))), bottom = Math.min(rasterHeight - 1, Math.floor(Math.max(a.y, b.y, c.y)));
    if (left > right || top > bottom) continue;
    const ux = (b.y - c.y) / den, uy = (c.x - b.x) / den, vx = (c.y - a.y) / den, vy = (a.x - c.x) / den;
    const za = 1 / a.z, zb = 1 / b.z, zc = 1 / c.z;
    const dx = ux * (za - zc) + vx * (zb - zc), dy = uy * (za - zc) + vy * (zb - zc);
    let colour = colours.get(triangle.fill);
    if (colour === undefined) { colour = rgba32(triangle.fill); colours.set(triangle.fill, colour); }
    for (let y = top; y <= bottom; y++) {
      let u = ux * (left + .5 - c.x) + uy * (y + .5 - c.y);
      let v = vx * (left + .5 - c.x) + vy * (y + .5 - c.y);
      let inverse = u * za + v * zb + (1 - u - v) * zc, index = y * rasterWidth + left;
      for (let x = left; x <= right; x++, index++, u += ux, v += vx, inverse += dx) {
        if (u >= -1e-7 && v >= -1e-7 && u + v <= 1.0000001 && inverse > depth[index]) {
          depth[index] = inverse; pixels[index] = colour;
        }
      }
    }
    if (Number.isFinite(triangle.width) && triangle.width > 0) {
      let widths = groups.get(triangle.stroke);
      if (!widths) { widths = new Map(); groups.set(triangle.stroke, widths); }
      let group = widths.get(triangle.width);
      if (!group) { group = { indices: [], count: 0 }; widths.set(triangle.width, group); }
      const slope = .55 * (Math.abs(dx) + Math.abs(dy));
      const ai = vertexId(a), bi = vertexId(b), ci = vertexId(c);
      addEdge(a, b, ai, bi, slope, group); addEdge(b, c, bi, ci, slope, group); addEdge(c, a, ci, ai, slope, group);
    }
    triangleCount++;
  }
  work.paint.putImageData(work.image, 0, 0);
  ctx.save(); ctx.drawImage(work.surface, 0, 0, rasterWidth, rasterHeight, 0, 0, width, height);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  let visibleEdges = 0, visibleSegments = 0;
  for (const [stroke, widths] of groups) for (const [lineWidth, group] of widths) {
    if (!group.count) continue;
    ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.beginPath();
    let pathCount = 0;
    for (let j = 0; j < group.count; j++) {
      const { a, b, slope } = edges[group.indices[j]];
      const inside = a.x >= 0 && a.y >= 0 && a.x < width && a.y < height && b.x >= 0 && b.y >= 0 && b.x < width && b.y < height;
      const clip = inside ? null : clipLine(a, b, width, height);
      if (!inside && !clip) continue;
      const lo = inside ? 0 : clip[0], hi = inside ? 1 : clip[1], dx = b.x - a.x, dy = b.y - a.y;
      const za = 1 / a.z, dz = 1 / b.z - za, steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) * (hi - lo) / .75));
      let start = -1, wasVisible = false;
      for (let i = 0; i <= steps; i++) {
        let visible = false;
        if (i < steps) {
          const t = lo + (hi - lo) * (i + .5) / steps, x = a.x + dx * t, y = a.y + dy * t;
          const ix = Math.min(rasterWidth - 1, Math.max(0, Math.floor(x))), iy = Math.min(rasterHeight - 1, Math.max(0, Math.floor(y)));
          const inverse = za + dz * t;
          visible = inverse + slope + inverse * .00002 >= Math.max(depth[iy * rasterWidth + ix], work.staticDepthAt(x, y));
        }
        if (visible && start < 0) start = lo + (hi - lo) * i / steps;
        if (!visible && start >= 0) {
          const end = lo + (hi - lo) * i / steps;
          ctx.moveTo(a.x + dx * start, a.y + dy * start); ctx.lineTo(a.x + dx * end, a.y + dy * end);
          start = -1; wasVisible = true; visibleSegments++; pathCount++;
          if (pathCount >= 4096) { ctx.stroke(); ctx.beginPath(); pathCount = 0; }
        }
      }
      if (wasVisible) visibleEdges++;
    }
    if (pathCount) ctx.stroke();
  }
  ctx.restore();
  return { workspace: work, triangles: triangleCount, edges: edgeCount, visibleEdges, visibleSegments,
    rasterWidth, rasterHeight, dpr: 1, depthBuffer: depth };
}
