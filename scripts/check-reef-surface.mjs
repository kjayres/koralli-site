import assert from 'node:assert/strict';
import { paintReefSurface, paintReefActors, reefInverseDepthAt } from '../src/scripts/art/reef-surface.mjs';

// Capture raster pixels and renderer statistics without requiring a browser.
globalThis.OffscreenCanvas = class {
  constructor(width, height) { this.width = width; this.height = height; }
  getContext() {
    return {
      createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
      putImageData: image => { this.image = image; },
    };
  }
};
const context = (dpr = 1) => ({
  getTransform: () => ({ a: dpr, b: 0, c: 0, d: dpr }),
  save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
  drawImage(surface) { this.image = surface.image; },
});
const point = (x, y, z) => ({ x, y, z });
const face = (a, b, c, fill = 'rgb(255,0,0)') => ({ a, b, c, fill, stroke: 'rgb(50,80,255)', width: .2 });
const render = (triangles, dpr = 1) => {
  const ctx = context(dpr);
  return { ctx, stats: paintReefSurface(ctx, triangles, 32, 32) };
};
const pixel = (ctx, x, y) => [...ctx.image.data.slice((y * 32 + x) * 4, (y * 32 + x) * 4 + 4)];

// Intersecting faces exchange which surface is nearer within one triangle.
const slope = face(point(2, 2, 4), point(30, 2, 12), point(2, 30, 4));
const flat = face(point(2, 2, 8), point(30, 2, 8), point(2, 30, 8), 'rgb(0,0,255)');
const crossing = render([flat, slope]);
assert.deepEqual(pixel(crossing.ctx, 6, 6), [255, 0, 0, 255]);
assert.deepEqual(pixel(crossing.ctx, 25, 3), [0, 0, 255, 255]);
assert.deepEqual(render([slope, flat]).ctx.image.data, crossing.ctx.image.data, 'Face order must not change visible fills');

// A shared diagonal is drawn once even when its vertices are separate objects.
const a = point(2, 2, 4), b = point(30, 2, 4), c = point(30, 30, 4), d = point(2, 30, 4);
assert.equal(render([face(a, b, c), face({ ...a }, { ...c }, d)]).stats.edges, 5);

const foreground = face(point(0, 0, 4), point(32, 0, 4), point(0, 32, 4));
const hidden = face(point(5, 5, 8), point(15, 5, 8), point(5, 15, 8));
assert.equal(render([foreground, hidden]).stats.visibleEdges, 3, 'Fully hidden rear edges must not shine through');

const subdivided = render([{ ...foreground, subdivide: true }, face(point(NaN, 0, 4), b, c)], 3).stats;
assert.equal(subdivided.dpr, 2);
assert.equal(subdivided.rasterWidth, 64);
assert.equal(subdivided.triangles, 1, 'Invalid coordinates must be skipped');
assert.equal(subdivided.edges, 6, 'Subdivision adds three interior edges');
assert.equal(paintReefSurface(context(), [], 0, 32), null);

// The 1x actor raster must respect a 2x static silhouette, including its edge.
const underlay = render([foreground], 2).stats;
const originalStaticDepth = underlay.depthBuffer.slice();
const actorContext = context(2);
const behind = face(point(0, 0, 8), point(32, 0, 8), point(0, 32, 8));
let actors = paintReefActors(actorContext, [behind], 32, 32, { underlay });
assert.equal(actors.dpr, 1);
assert.equal(reefInverseDepthAt(underlay, 5, 5), .25);
assert.equal(actors.workspace.depthAt(5, 5), .25);
assert.ok(actors.workspace.pixels.every(value => value === 0), 'Rear fill must not leak along a higher-DPR silhouette');

const workspace = actors.workspace, actorDepth = actors.depthBuffer, actorImage = workspace.image, actorSurface = workspace.surface;
const inFront = face(point(5, 5, 2), point(15, 5, 2), point(5, 15, 2));
actors = paintReefActors(actorContext, [inFront], 32, 32, { underlay, workspace });
assert.equal(actors.visibleEdges, 3);
assert.deepEqual(pixel(actorContext, 6, 6), [255, 0, 0, 255]);
assert.equal(workspace.depthAt(6, 6), .5);
assert.equal(actors.workspace, workspace);
assert.equal(actors.depthBuffer, actorDepth);
assert.equal(workspace.image, actorImage);
assert.equal(workspace.surface, actorSurface);

actors = paintReefActors(actorContext, [], 32, 32, { underlay, workspace });
assert.ok(workspace.pixels.every(value => value === 0), 'A departed actor must leave a transparent layer');
assert.equal(workspace.depthAt(6, 6), .25, 'Old actor depth must not remain in the next frame');
assert.equal(workspace.depthAt(-1, 6), 0);
assert.deepEqual(underlay.depthBuffer, originalStaticDepth, 'Actor rendering must not mutate the static depth cache');

actors = paintReefActors(actorContext, [slope, flat], 32, 32, { workspace });
const actorCrossing = workspace.image.data.slice();
assert.deepEqual(pixel(actorContext, 6, 6), [255, 0, 0, 255]);
assert.deepEqual(pixel(actorContext, 25, 3), [0, 0, 255, 255]);
paintReefActors(actorContext, [flat, slope], 32, 32, { workspace });
assert.deepEqual(workspace.image.data, actorCrossing, 'Actor order must not change visible fills');

console.log('Reef surface checks passed: static and actor depth ordering, hidden/shared edges, DPR boundaries, transparent clearing, workspace reuse and input bounds.');
