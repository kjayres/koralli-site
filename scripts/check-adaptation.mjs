import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { createApproachScene, updateApproachScene } from '../src/scripts/art/approach.mjs';
import { adaptationPresentation, adaptationParticle, drawAdaptation, fitPlane, projectAdaptation } from '../src/scripts/art/adaptation.mjs';

const near = (actual, expected, message, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance,
  `${message}: expected ${expected}, received ${actual}`);
const pointNear = (actual, expected, message) => {
  near(actual.x, expected.x, message); near(actual.y, expected.y, message);
};
const coordinates = points => points.map(({ id, x, y, z }) => ({ id, x, y, z }));
const predict = (fit, p) => fit.intercept + fit.slopeX * p.x + fit.slopeZ * p.z;
function checkLeastSquares(fit, points) {
  const residuals = points.map(p => p.y - predict(fit, p));
  for (const predictor of [() => 1, p => p.x, p => p.z]) near(
    residuals.reduce((sum, residual, i) => sum + residual * predictor(points[i]), 0), 0,
    'OLS residuals must be orthogonal to the intercept and both predictors');
}
const observationsAt = (scene, state) => new Map(scene.field.particles.map(p => adaptationParticle(scene, p.id, state))
  .filter(p => p.observation !== null).map(p => [p.observation, p]));

// Independent exact answers and normal equations distinguish a fitted plane from decorative motion.
const corners = [{ x: -1, z: -1 }, { x: -1, z: 1 }, { x: 1, z: -1 }, { x: 1, z: 1 }];
for (const [points, expected] of [
  [corners.map(p => ({ ...p, y: 1 + 2 * p.x - 3 * p.z })), { intercept: 1, slopeX: 2, slopeZ: -3 }],
  [corners.map(p => ({ ...p, y: 1 + 2 * p.x - 3 * p.z + .4 * p.x * p.z })), { intercept: 1, slopeX: 2, slopeZ: -3 }],
  [corners.map(p => ({ ...p, y: 4 })), { intercept: 4, slopeX: 0, slopeZ: 0 }],
]) {
  const fit = fitPlane(points);
  for (const key of Object.keys(expected)) near(fit[key], expected[key], `Known plane ${key}`);
  checkLeastSquares(fit, points);
}
assert.deepEqual(fitPlane([]), { intercept: 0, slopeX: 0, slopeZ: 0 });
const singular = [{ x: 2, z: 2, y: 1 }, { x: 2, z: 2, y: 5 }];
assert.deepEqual(fitPlane(singular), { intercept: 3, slopeX: 0, slopeZ: 0 });
const collinear = [-2, -1, 0, 1, 2].map(x => ({ x, z: 2 * x, y: 3 + 5 * x }));
checkLeastSquares(fitPlane(collinear), collinear);

const initial = adaptationPresentation(0);
assert.equal(initial.observations.length, 20);
assert.equal(initial.points.length, 100);
assert.equal(initial.pending.length, 0);
assert.equal(initial.initialFit, 0);
assert.equal(adaptationPresentation(3.3).initialFit, 0, 'The completed cube must hold grey observations before fitting');
assert.equal(adaptationPresentation(4).initialFit, 1, 'The initial fit must become readable promptly after the grey hold');
const colourScene = createApproachScene(400, 400);
assert.ok([...observationsAt(colourScene, adaptationPresentation(2.4)).values()].every(p => p.colour === 'rgb(112,119,131)'),
  'Initial observations must be grey before fitting');
assert.ok([...observationsAt(colourScene, adaptationPresentation(4)).values()].every(p => p.colour === 'rgb(36,78,255)'),
  'Fitted observations must become blue');

// Check early updates, the capacity boundary and a much later rolling window.
for (const event of [1, 2, 39, 40, 41, 250]) {
  const arrival = 2.6 + event * 10;
  const before = adaptationPresentation(arrival - .1);
  const expectedCount = Math.min(100, 20 + event * 2);
  for (const delay of [.2, 1, 2.5, 4.9]) {
    const pending = adaptationPresentation(arrival + delay);
    assert.equal(pending.observations.length, expectedCount);
    assert.equal(pending.pending.length, 2);
    assert.deepEqual(coordinates(pending.fitObservations), coordinates(before.fitObservations),
      'Pending arrivals must not enter the fitted dataset during the five-second pause');
    assert.deepEqual(pending.fit, before.fit, 'Pending arrivals must not move the plane');
    assert.deepEqual(pending.targetFit, before.targetFit);
    assert.equal(pending.updateProgress, 0);
    checkLeastSquares(pending.targetFit, pending.fitObservations);
    const display = observationsAt(colourScene, pending);
    for (const id of pending.pending) {
      const point = pending.observations.find(p => p.id === id);
      assert.equal(point.included, false);
      assert.ok(point.presence > .999);
      assert.equal(display.get(id).colour, 'rgb(232,120,131)', 'Pending evidence must remain coral until inclusion');
    }
  }
  const during = adaptationPresentation(arrival + 5.15), fitted = adaptationPresentation(arrival + 5.35);
  assert.equal(during.pending.length, 0);
  assert.ok(during.updateProgress > 0 && during.updateProgress < 1);
  assert.equal(fitted.updateProgress, 1, 'A refit must finish within roughly 0.3 seconds after inclusion');
  assert.equal(fitted.fitObservations.length, expectedCount);
  assert.deepEqual(coordinates(fitted.fitObservations), coordinates(fitted.observations));
  checkLeastSquares(fitted.fit, fitted.fitObservations);
  assert.deepEqual(fitted.fit, fitted.targetFit);
  assert.ok(Object.keys(fitted.fit).some(key => Math.abs(fitted.fit[key] - before.fit[key]) > 1e-5),
    'New observations must actually change the fitted coefficients');
  const display = observationsAt(colourScene, fitted);
  for (const point of fitted.observations.slice(-2)) assert.equal(display.get(point.id).colour, 'rgb(36,78,255)');
  const hold = adaptationPresentation(arrival + 9);
  assert.deepEqual(hold.fit, fitted.fit, 'The updated plane must remain readable for several seconds');
  assert.deepEqual(coordinates(hold.fitObservations), coordinates(fitted.fitObservations));
  const retained = new Map(before.observations.map(p => [p.id, p]));
  for (const p of fitted.observations) if (retained.has(p.id)) assert.deepEqual(coordinates([p]), coordinates([retained.get(p.id)]),
    'Adding evidence must not rewrite retained observations');
}
const capacity = adaptationPresentation(407.95), recycled = adaptationPresentation(412.8);
assert.equal(capacity.observations.length, 100);
assert.equal(recycled.observations.length, 100);
assert.deepEqual(recycled.observations.slice(0, 98).map(p => p.id), capacity.observations.slice(2).map(p => p.id),
  'At capacity, a new pair must replace exactly the oldest pair');
assert.deepEqual(recycled.fitObservations.map(p => p.id), capacity.fitObservations.map(p => p.id),
  'Recycling the display must not prematurely discard evidence from the current fit');
const oldBindings = observationsAt(colourScene, capacity), newBindings = observationsAt(colourScene, recycled);
assert.equal(oldBindings.get(0).id, newBindings.get(100).id);
assert.equal(oldBindings.get(1).id, newBindings.get(101).id);
for (const age of [1000, 10000, 36000]) {
  const state = adaptationPresentation(age);
  assert.equal(state.observations.length, 100); assert.equal(state.fitObservations.length, 100);
  assert.equal(state.points.length, 100); assert.equal(new Set(state.observations.map(p => p.slot)).size, 100);
  assert.ok(state.observations.every(p => [p.x, p.y, p.z].every(Number.isFinite)));
  checkLeastSquares(state.targetFit, state.fitObservations);
  assert.deepEqual(adaptationPresentation(age), state, 'Long-running states must be deterministic and bounded');
}

function recorder(width, height) {
  return {
    strokes: [], fills: [], stack: [], path: [], dash: [],
    globalAlpha: 1, strokeStyle: '#000', fillStyle: '#000', lineWidth: 1,
    save() { this.stack.push({ globalAlpha: this.globalAlpha, strokeStyle: this.strokeStyle, fillStyle: this.fillStyle, lineWidth: this.lineWidth, dash: this.dash }); },
    restore() { assert.ok(this.stack.length); Object.assign(this, this.stack.pop()); },
    beginPath() { this.path = []; }, closePath() {}, setLineDash(dash) { this.dash = dash; },
    moveTo(x, y) { this.record({ x, y }); }, lineTo(x, y) { this.record({ x, y }); },
    arc(x, y, radius, start, end) {
      assert.ok([radius, start, end].every(Number.isFinite) && radius > 0);
      assert.ok(x - radius >= 0 && x + radius <= width && y - radius >= 0 && y + radius <= height,
        'Grains and arrival rings must fit inside the pane');
      this.record({ x, y, radius });
    },
    record(point) {
      assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
      assert.ok(point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= height,
        'The projected cube, plane and residuals must remain inside the pane');
      this.path.push(point);
    },
    stroke() {
      assert.ok(Number.isFinite(this.globalAlpha) && this.globalAlpha >= 0 && this.globalAlpha <= 1);
      this.strokes.push({ path: this.path, colour: this.strokeStyle, alpha: this.globalAlpha, width: this.lineWidth, dash: this.dash });
    },
    fill() {
      assert.ok(Number.isFinite(this.globalAlpha) && this.globalAlpha >= 0 && this.globalAlpha <= 1);
      this.fills.push({ path: this.path, colour: this.fillStyle, alpha: this.globalAlpha });
    },
  };
}
const dots = ctx => ctx.fills.filter(fill => fill.path.length === 1 && fill.path[0].radius);
const sizes = [[224, 224], [240, 320], [400, 400], [418, 418], [400, 260]];
const ages = [0, .5, 1.1, 1.8, 2.4, 2.6, 3.1, 12.8, 15.1, 17.75, 17.95, 22.8, 407.95, 412.8, 417.95, 10000];
for (const [width, height] of sizes) {
  const scene = createApproachScene(width, height), particles = [...scene.field.particles];
  updateApproachScene(scene, width, height, 0, { phase: 1, reducedMotion: true });
  updateApproachScene(scene, width, height, 0, { phase: 2 });
  const entry = adaptationPresentation(0);
  for (const p of particles) {
    const point = adaptationParticle(scene, p.id, entry);
    pointNear(point, { x: width / 2 + p.x * scene.field.bounds.scale, y: height / 2 + p.y * scene.field.bounds.scale },
      'Entry must use the actual shared particle position');
    near(point.radius, p.radius * scene.field.bounds.grainSize, 'Entry must preserve grain radius');
    near(point.alpha, scene.opacity, 'Entry must preserve grain opacity');
    assert.equal(point.colour, 'rgb(36,78,255)');
  }
  const snapshot = structuredClone(scene);
  for (const age of ages) {
    const state = adaptationPresentation(age), ctx = recorder(width, height);
    drawAdaptation(ctx, scene, { state });
    assert.equal(ctx.stack.length, 0); assert.deepEqual(ctx.dash, []);
    const grainFills = dots(ctx);
    if (state.assemble === 0) assert.equal(grainFills.length, particles.length);
    if (state.assemble === 1) assert.equal(grainFills.length, state.observations.filter(p => p.presence > 0).length,
      'After rotation, only the bounded observations should remain visible');
    assert.ok(grainFills.length <= particles.length);
    for (const p of particles) assert.equal(scene.field.particles[p.id], p);
    const edges = ctx.strokes.filter(stroke => stroke.colour === '#858d9d');
    assert.equal(edges.length, 12, 'A complete cube must retain all twelve edges');
    if (state.turn === 1) {
      const length = edge => Math.hypot(edge.path[1].x - edge.path[0].x, edge.path[1].y - edge.path[0].y);
      for (const edge of edges) near(length(edge), length(edges[0]), 'All cube sides must have equal projected isometric length');
    }
    const plane = ctx.fills.find(fill => fill.path.length === 4);
    assert.ok(plane);
    [[-.92, -.92], [.92, -.92], [.92, .92], [-.92, .92]].forEach(([x, z], i) => pointNear(plane.path[i],
      projectAdaptation({ x, z, y: predict(state.fit, { x, z }) }, width, height, state.turn),
      'The rendered surface must use the fitted intercept and both slopes'));
    const residuals = ctx.strokes.filter(stroke => stroke.colour === '#7488b2');
    assert.equal(residuals.length, state.observations.length);
    residuals.forEach((line, i) => {
      const p = state.observations[i];
      assert.deepEqual(line.dash, [1.2, 1.8], 'Residuals must remain visually distinct dotted segments');
      pointNear(line.path[0], projectAdaptation(p, width, height, state.turn), 'Residual starts at the actual observation');
      pointNear(line.path[1], projectAdaptation({ ...p, y: predict(state.fit, p) }, width, height, state.turn),
        'Residual ends on the fitted plane at the same predictor values');
      if (state.pending.includes(p.id)) assert.equal(line.alpha, 0, 'Pending observations must not appear as already fitted residuals');
    });
  }
  assert.deepEqual(scene, snapshot, 'Rendering must not mutate physics, homes or inspection geometry');
  scene.reducedMotion = true;
  const stillA = recorder(width, height), stillB = recorder(width, height);
  const final = drawAdaptation(stillA, scene);
  scene.age = 100;
  drawAdaptation(stillB, scene);
  assert.equal(final.pending.length, 0); assert.equal(final.updateProgress, 1);
  checkLeastSquares(final.fit, final.fitObservations);
  assert.ok(final.observations.every(p => p.presence === 1 && p.pulse === 0 && p.included));
  assert.deepEqual(stillA.strokes, stillB.strokes);
  assert.deepEqual(stillA.fills, stillB.fills, 'Reduced motion must show a complete, unchanged fitted state');
  const retiring = recorder(width, height);
  drawAdaptation(retiring, scene, { state: final, particles: false, opacity: .4 });
  assert.equal(dots(retiring).length, 0, 'Exit decoration must not redraw the particles');
  assert.deepEqual(retiring.strokes.map(s => s.path), stillA.strokes.map(s => s.path));
  retiring.strokes.forEach((stroke, i) => near(stroke.alpha, stillA.strokes[i].alpha * .4, 'Exit fade must change opacity only'));
}

// CPU-only drawing cost, with no canvas rasterisation or browser/device claim.
const noop = { save() {}, restore() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, stroke() {}, fill() {}, setLineDash() {} };
for (const count of [20, 100]) {
  const scene = createApproachScene(400, 400), state = adaptationPresentation(count === 20 ? 4 : 417.95), costs = [];
  for (let i = 0; i < 120; i++) {
    const start = performance.now(); drawAdaptation(noop, scene, { state });
    if (i >= 20) costs.push(performance.now() - start);
  }
  costs.sort((a, b) => a - b);
  console.log(`Adaptation ${count} observations: CPU draw median ${costs[49].toFixed(3)}ms, p95 ${costs[94].toFixed(3)}ms; no canvas rasterisation.`);
}
console.log('Adaptation checked: exact two-predictor fits, five-second pending exclusion, real refits, bounded recycling, equal cube sides, fitted surface/residuals, shared-grain entry, resize bounds and static reduced motion.');
