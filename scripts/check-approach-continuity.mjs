import assert from 'node:assert/strict';
import { createApproachScene, updateApproachScene, approachPresentation } from '../src/scripts/art/approach.mjs';
import { researchTargets, RESEARCH_FORM_COUNT } from '../src/scripts/art/research.mjs';

// Changing the destination of a settled tool must not impart a sudden kick.
const scene = createApproachScene(400, 400);
let clock = 0, observed = 0, lastForm = 0, largestKick = 0;
updateApproachScene(scene, 400, 400, clock, { phase: 1 });
for (let frame = 1; frame <= 60 * 21; frame++) {
  const previous = scene.field.particles.map(p => ({ x: p.x, y: p.y, vx: p.vx, vy: p.vy }));
  clock = frame / 60;
  updateApproachScene(scene, 400, 400, clock, { phase: 1 });
  const state = approachPresentation(scene);
  if (state.form !== lastForm && state.form > 0) {
    for (const p of scene.field.particles) {
      const kick = Math.hypot(p.vx - previous[p.id].vx, p.vy - previous[p.id].vy);
      largestKick = Math.max(largestKick, kick);
      assert.ok(kick < .025, 'Changing tools must not suddenly accelerate grains towards a distant new target');
    }
    observed++;
  }
  lastForm = state.form;
}
assert.equal(observed, RESEARCH_FORM_COUNT - 1);
for (let form = 1; form < RESEARCH_FORM_COUNT; form++) {
  const previous = researchTargets(form - 1), next = researchTargets(form);
  const travel = next.map((p, id) => Math.hypot(p.x - previous[id].x, p.y - previous[id].y));
  assert.ok(travel.reduce((a, b) => a + b, 0) / travel.length < .24,
    'Grains should contribute to nearby parts of the next tool instead of crossing the whole field');
}

// The foundation must actually settle through contacts, not freeze airborne grains.
updateApproachScene(scene, 400, 400, clock, { phase: 2 });
for (let frame = 0; frame < 60 * 12; frame++) {
  clock += 1 / 60;
  updateApproachScene(scene, 400, 400, clock, { phase: 2 });
}
assert.ok(scene.heapRest, 'A physically settled mound should reach a quiet steady state');
const floor = scene.field.bounds.bottom;
const heap = [...scene.grow.rock.keys()].map(id => scene.field.particles[id]);
assert.ok(heap.filter(p => Math.abs(p.x) < .3).length > heap.length * .85, 'The foundation gathers naturally near the centre');
assert.ok(heap.every(p => floor - p.y < .23), 'No grains freeze above the foundation');
const root = scene.field.particles[scene.grow.root];
assert.ok(heap.some(p => Math.hypot(root.x - p.x, root.y - p.y) < (root.r + p.r) * 1.5),
  'The visible root is a real grain supported by the mound');

for (const width of [240, 400]) {
  const still = createApproachScene(width, width);
  updateApproachScene(still, width, width, 0, { phase: 2, reducedMotion: true });
  const root = still.field.particles[still.grow.root];
  assert.ok([...still.grow.rock.keys()].some(id => {
    const p = still.field.particles[id];
    return Math.hypot(root.x - p.x, root.y - p.y) < (root.r + p.r) * 1.6;
  }), 'Reduced motion must also put the coral on its foundation');
}
console.log(`Continuous tool transitions: ${observed}; largest boundary velocity change ${largestKick.toFixed(5)}. Grounded mound and reduced-motion support verified.`);
