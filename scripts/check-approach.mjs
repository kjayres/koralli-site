import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { createApproachScene, updateApproachScene, approachPresentation, drawApproach } from '../src/scripts/art/approach.mjs';
import { researchTargets, RESEARCH_FORM_COUNT } from '../src/scripts/art/research.mjs';

const costs = [];
const positions = scene => scene.field.particles.map(({ x, y }) => [x, y]);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function finiteAndContained(scene, originals) {
  const { bounds } = scene.field;
  scene.field.particles.forEach((p, i) => {
    assert.equal(p, originals[i], 'Every stage must retain the original particle objects');
    assert.equal(p.id, i);
    assert.ok([p.x, p.y, p.vx, p.vy, p.r].every(Number.isFinite));
    assert.ok(p.x - p.r >= -bounds.halfWidth - 1e-9);
    assert.ok(p.x + p.r <= bounds.halfWidth + 1e-9);
    assert.ok(p.y - p.r >= bounds.top - 1e-9);
    assert.ok(p.y + p.r <= bounds.bottom + 1e-9);
  });
}

function groundedPile(scene) {
  assert.equal(scene.field.resting, true, 'The fall must finish before the next formation starts');
  assert.ok(scene.field.particles.every(p => p.asleep && p.vx === 0 && p.vy === 0));
  assert.ok(scene.field.supported.every(Boolean), 'Resting particles must connect to the floor through contacts');
}

for (const size of [400, 240]) {
  const scene = createApproachScene(size, size);
  const originals = [...scene.field.particles];
  const originalHomes = scene.homes.map(p => ({ ...p }));
  let clock = 0;
  updateApproachScene(scene, size, size, clock);

  const advance = (seconds, options = {}) => {
    for (let i = 0; i < Math.round(seconds * 60); i++) {
      clock += 1 / 60;
      const start = performance.now();
      updateApproachScene(scene, scene.width, scene.height, clock, { phase: scene.phase, ...options });
      costs.push(performance.now() - start);
    }
  };
  const changePhase = phase => {
    const before = positions(scene);
    updateApproachScene(scene, scene.width, scene.height, clock, { phase });
    assert.deepEqual(positions(scene), before, 'Changing scroll stage alone must not teleport particles');
  };

  advance(1);
  assert.deepEqual(positions(scene), originalHomes.map(({ x, y }) => [x, y]));
  changePhase(1);
  advance(3.3);
  groundedPile(scene);

  for (let form = 0; form < RESEARCH_FORM_COUNT; form++) {
    advance(5.8);
    const presentation = approachPresentation(scene);
    assert.equal(presentation.form, form, 'The particles must make distinct tools in sequence');
    assert.ok(scene.field.particles.every((p, i) => distance(p, researchTargets(form)[i]) < .003), 'A tool must become a legible stable formation');
    finiteAndContained(scene, originals);
    let released = false, settled = false, changed = false;
    for (let frame = 0; frame < 12 * 60; frame++) {
      const wasResting = scene.field.resting;
      advance(1 / 60);
      if (scene.field.particles.every(p => p.attraction === 0)) released = true;
      if (scene.field.resting) { groundedPile(scene); settled = true; }
      if (approachPresentation(scene).form !== form) {
        assert.ok(released && settled && wasResting, 'Each tool must fall into a settled pile before the next one forms');
        changed = true;
        break;
      }
    }
    assert.ok(changed, 'The settled grains must eventually build the next tool');
  }

  changePhase(2);
  advance(3);
  assert.ok(scene.grey > .999, 'The returned background field must become grey');
  assert.ok(scene.field.particles.every((p, i) => distance(p, originalHomes[i]) < .0001), 'Adapt & Grow must return to the original Go & See positions');
  assert.deepEqual(scene.homes, originalHomes);
  for (const { study, ids } of scene.studies) {
    assert.equal(ids.length, study.nodes.length);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) assert.equal(scene.field.particles[id], originals[id], 'Coral anchors must be members of the shared population');
  }

  for (let i = 0; i < 12; i++) {
    changePhase(i % 3);
    const width = i % 2 ? 240 : 400;
    updateApproachScene(scene, width, width * (i % 3 ? 1 : 1.15), clock, { phase: scene.phase });
    advance(.1);
    finiteAndContained(scene, originals);
  }

  for (const phase of [0, 1, 2]) {
    updateApproachScene(scene, scene.width, scene.height, clock, { phase, reducedMotion: true });
    const targets = phase === 1 ? researchTargets(0) : scene.homes;
    assert.ok(scene.field.particles.every((p, i) => distance(p, targets[i]) === 0 && p.vx === 0 && p.vy === 0));
    assert.equal(scene.grey, phase === 2 ? 1 : 0);
    const still = positions(scene), age = scene.age;
    clock += 100;
    updateApproachScene(scene, scene.width, scene.height, clock, { phase, reducedMotion: true });
    assert.deepEqual(positions(scene), still, 'Reduced motion must stay still over time');
    assert.equal(scene.age, age);
    finiteAndContained(scene, originals);
  }
}

// Record canvas geometry to check the visible lens dwell and coral connections.
function recorder() {
  const ctx = {
    strokes: [], arcs: [], labels: [], path: [],
    save() {}, restore() {}, clip() {}, fill() {}, closePath() {},
    beginPath() { this.path = []; },
    arc(x, y, radius, start, end) {
      assert.ok([x, y, radius, start, end].every(Number.isFinite) && radius > 0);
      const arc = { x, y, radius };
      this.arcs.push(arc); this.path.push({ arc });
    },
    moveTo(x, y) { assert.ok(Number.isFinite(x) && Number.isFinite(y)); this.path.push({ x, y }); },
    lineTo(x, y) { assert.ok(Number.isFinite(x) && Number.isFinite(y)); this.path.push({ x, y }); },
    fillRect(...values) { assert.ok(values.every(Number.isFinite)); },
    measureText(text) { return { width: text.length * 5 }; },
    fillText(text) { this.labels.push(text); },
    stroke() { this.strokes.push(this.path); },
    reset() { this.strokes = []; this.arcs = []; this.labels = []; this.path = []; },
  };
  return ctx;
}

const lensCtx = recorder(), lensSamples = [];
for (let frame = 0; frame <= 408; frame++) {
  lensCtx.reset();
  drawApproach(lensCtx, 400, 400, frame / 60, { phase: 0 });
  if ([168, 294, 408].includes(frame)) {
    const lens = lensCtx.strokes.find(path => path.length === 1 && path[0].arc)?.[0].arc;
    assert.ok(lens, 'Go & See must show a magnifying glass');
    lensSamples.push({ ...lens, label: lensCtx.labels.at(-1) });
  }
}
assert.ok(distance(lensSamples[0], lensSamples[1]) < 1e-9, 'The lens must pause on one dot for at least two seconds');
assert.notEqual(lensSamples[0].label, lensSamples[2].label, 'The lens must move on to another inspection');
assert.ok(distance(lensSamples[1], lensSamples[2]) > 20);

const coralCtx = recorder(), coralScene = createApproachScene(400, 400);
drawApproach(coralCtx, 400, 400, 0, { phase: 2, reducedMotion: true });
const { study, ids } = coralScene.studies[0];
const project = id => {
  const p = coralScene.field.particles[id], scale = coralScene.field.bounds.scale;
  return { x: 200 + p.x * scale, y: 200 + p.y * scale };
};
assert.equal(coralCtx.strokes.length, study.nodes.length - 1);
coralCtx.strokes.forEach((path, i) => {
  assert.ok(distance(path[0], project(ids[study.nodes[i + 1][2]])) < 1e-9);
  assert.ok(distance(path[1], project(ids[i + 1])) < 1e-9, 'Coral lines must terminate on the original particle positions');
});
const nodeArcs = coralCtx.arcs.slice(-ids.length);
nodeArcs.forEach((arc, i) => assert.ok(distance(arc, project(ids[i])) < 1e-9));

costs.sort((a, b) => a - b);
const percentile = p => costs[Math.floor((costs.length - 1) * p)].toFixed(2);
console.log(`Our Work checked at 400px and 240px: one particle population, grounded releases, ${RESEARCH_FORM_COUNT} tool forms, grey return, coral anchors, reversing, resizing, lens dwell and reduced motion.`);
console.log(`Update CPU time: median ${percentile(.5)}ms; 95th percentile ${percentile(.95)}ms; maximum ${costs.at(-1).toFixed(2)}ms. Canvas rasterisation is not included.`);
