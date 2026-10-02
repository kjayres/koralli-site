import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { createApproachScene, updateApproachScene, approachPresentation, drawApproach } from '../src/scripts/art/approach.mjs';
import { researchTargets, RESEARCH_FORM_COUNT } from '../src/scripts/art/research.mjs';

const costs = [];
const sizes = process.argv.includes('--visual-only') ? [] : [400, 240, 418, 224, 260];
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

for (const size of sizes) {
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
  for (let frame = 0; !scene.field.resting && frame < 8 * 60; frame++) {
    assert.ok(scene.field.particles.every(p => p.attraction === 0), 'The initial pile must settle before attraction begins');
    advance(1 / 60);
  }
  groundedPile(scene);
  assert.ok(scene.age >= 3.3 - .00001, 'The initial fall must retain its minimum settling interval');
  const initialSettledAt = clock - 1, rollovers = [];

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
        rollovers.push((clock - 1).toFixed(2));
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
  console.log(`${size}px: initial settled pile at ${initialSettledAt.toFixed(2)}s; four rollovers at ${rollovers.join(', ')}s.`);
}

// Record canvas geometry to check the lens, discovered relationships and coral.
function recorder() {
  const ctx = {
    strokes: [], strokeRecords: [], arcs: [], labels: [], path: [], fills: [], stack: [],
    fillStyle: '#000000', strokeStyle: '#000000', globalAlpha: 1, lineWidth: 1, clipPath: null,
    save() {
      this.stack.push({ fillStyle: this.fillStyle, strokeStyle: this.strokeStyle, globalAlpha: this.globalAlpha, lineWidth: this.lineWidth, clipPath: this.clipPath });
    },
    restore() { assert.ok(this.stack.length, 'Canvas restores must match saves'); Object.assign(this, this.stack.pop()); },
    clip() { this.clipPath = this.path; },
    fill() { this.fills.push({ path: this.path, style: this.fillStyle, alpha: this.globalAlpha, clip: this.clipPath }); },
    closePath() {},
    beginPath() { this.path = []; },
    arc(x, y, radius, start, end) {
      assert.ok([x, y, radius, start, end].every(Number.isFinite) && radius > 0);
      const arc = { x, y, radius };
      this.arcs.push(arc); this.path.push({ arc });
    },
    moveTo(x, y) { assert.ok(Number.isFinite(x) && Number.isFinite(y)); this.path.push({ x, y }); },
    lineTo(x, y) { assert.ok(Number.isFinite(x) && Number.isFinite(y)); this.path.push({ x, y }); },
    bezierCurveTo(x1, y1, x2, y2, x, y) {
      assert.ok([x1, y1, x2, y2, x, y].every(Number.isFinite));
      this.path.push({ x, y, curve: [x1, y1, x2, y2] });
    },
    fillRect(...values) { assert.ok(values.every(Number.isFinite)); },
    measureText(text) { return { width: text.length * 5 }; },
    fillText(text) { this.labels.push(text); },
    stroke() {
      this.strokes.push(this.path);
      this.strokeRecords.push({ path: this.path, style: this.strokeStyle, alpha: this.globalAlpha, width: this.lineWidth });
    },
    reset() {
      assert.equal(this.stack.length, 0, 'Drawing must restore its canvas state');
      this.strokes = []; this.strokeRecords = []; this.arcs = []; this.labels = []; this.path = []; this.fills = [];
    },
  };
  return ctx;
}

function checkMagnification(ctx, lens, reference, selected, revealed) {
  const grains = ctx.fills.filter(fill => fill.clip && fill.path.length === 1 && fill.path[0].arc && /^rgba\(36,78,255,/.test(fill.style));
  assert.ok(grains.length > 5, 'The lens must continue to show the surrounding grain field');
  const aperture = grains[0].clip[0].arc.radius;
  const expected = reference.field.particles.map(p => {
    const dx = 200 + p.x * reference.field.bounds.scale - lens.x;
    const dy = 200 + p.y * reference.field.bounds.scale - lens.y;
    const inputRadius = Math.hypot(dx, dy);
    const magnification = 1 + 1.65 * (1 - Math.min(1, inputRadius / aperture)) ** 2;
    const baseRadius = p.radius * reference.field.bounds.grainSize;
    return {
      id: p.id, inputRadius, baseRadius,
      x: lens.x + dx * magnification, y: lens.y + dy * magnification,
      radius: baseRadius * magnification,
    };
  }).filter(p => p.inputRadius <= aperture + 1e-9);
  assert.equal(grains.length, expected.length, 'The object reveal must preserve every surrounding magnified grain');
  const probes = [];
  for (const grain of grains) {
    const point = grain.path[0].arc;
    const source = expected.find(p => distance(p, point) < 1e-8);
    assert.ok(source, 'Magnified positions must derive from the original field');
    assert.ok(Math.abs(point.radius - source.radius) < 1e-9, 'The lens must enlarge grain radii as well as their spacing');
    const opacity = Number(grain.style.match(/^rgba\(36,78,255,([^)]*)\)$/)[1]) * grain.alpha;
    const expectedOpacity = source.id === selected && revealed ? 0 : reference.opacity;
    assert.ok(Math.abs(opacity - expectedOpacity) < 1e-9, 'Only the selected central grain may fade during the object reveal');
    probes.push({ input: source.inputRadius / aperture, output: distance(point, lens) / aperture, scale: point.radius / source.baseRadius });
  }
  if (revealed) assert.ok(expected.some(p => p.id === selected && distance(p, lens) < 1e-8), 'The dimensional object must replace the selected central grain');
  probes.sort((a, b) => a.input - b.input);
  for (let i = 1; i < probes.length; i++) {
    assert.ok(probes[i].output >= probes[i - 1].output - 1e-10, 'Radial magnification must not reverse the order of grains');
    assert.ok(probes[i].scale <= probes[i - 1].scale + 1e-10, 'Magnification must decrease continuously towards the rim');
  }
  assert.ok(probes.every(p => p.output <= 1 + 1e-10), 'Magnification must keep grains inside the aperture');
  return probes;
}

const lensCtx = recorder(), lensSamples = [], iconSamples = [], radialSamples = [], networkSamples = new Map();
const referenceField = createApproachScene(400, 400);
const dwellFrames = [168, 294, 408], objectFrames = [192, 432, 672, 912, 1152], travelFrames = [120, 153];
const networkFrames = [176, 198, 222, 246, 282, 294, 312, 330];
const networkPoint = id => {
  const p = referenceField.field.particles[id], scale = referenceField.field.bounds.scale;
  return { x: 200 + p.x * scale, y: 200 + p.y * scale };
};
assert.deepEqual(referenceField.inspections.map(({ edges }) => edges), createApproachScene(240, 320).inspections.map(({ edges }) => edges), 'Discovered relationships must be deterministic and retain particle identities across canvas sizes');
for (let frame = 0; frame <= 1152; frame++) {
  lensCtx.reset();
  drawApproach(lensCtx, 400, 400, frame / 60, { phase: 0 });
  const network = lensCtx.strokeRecords.filter(stroke => stroke.style === '#707783');
  const inspection = referenceField.inspections[Math.floor(Math.max(0, frame / 60 - 1.3) / 4) % referenceField.inspections.length];
  for (const stroke of network) {
    assert.equal(stroke.path.length, 2);
    assert.ok(inspection.edges.some(({ from, to }) => distance(stroke.path[0], networkPoint(from)) < 1e-8 && distance(stroke.path[1], networkPoint(to)) < 1e-8), 'Each discovered relationship must connect two original grains, including throughout its reveal');
    assert.ok(distance(stroke.path[0], networkPoint(inspection.id)) < 1e-8 || network.some(parent => distance(parent.path[1], stroke.path[0]) < 1e-8), 'Revealing relationships must remain connected to the inspected grain');
    assert.ok(stroke.width < .85 && stroke.alpha <= .52, 'Discovered relationships must remain finer and lighter than the final coral');
  }
  if (networkFrames.includes(frame)) networkSamples.set(frame, network);
  if ((frame - 246) % 240 === 0 && frame >= 246) assert.equal(network.length, inspection.edges.length, 'Every inspection must reveal its full local relationship network');
  if ([...dwellFrames, ...objectFrames, ...travelFrames].includes(frame)) {
    const lensPath = lensCtx.strokes.filter(path => path.length === 1 && path[0].arc)
      .reduce((largest, path) => !largest || path[0].arc.radius >= largest[0].arc.radius ? path : largest, null);
    const lens = lensPath?.[0].arc;
    assert.ok(lens, 'Go & See must show a magnifying glass');
    if (dwellFrames.includes(frame)) lensSamples.push({ ...lens, label: lensCtx.labels.at(-1) });
    if (objectFrames.includes(frame)) {
      const paths = lensCtx.strokeRecords.filter(stroke => stroke.path !== lensPath && stroke.style !== '#707783').map(({ path }) => path.map(point => {
        const p = point.arc || point;
        return [(p.x - lens.x).toFixed(2), (p.y - lens.y).toFixed(2), p.radius?.toFixed(2)];
      }));
      iconSamples.push({ label: lensCtx.labels.at(-1), paths: JSON.stringify(paths) });
      const selected = referenceField.inspections[objectFrames.indexOf(frame)].id;
      radialSamples.push(...checkMagnification(lensCtx, lens, referenceField, selected, true));
    }
    if (travelFrames.includes(frame)) radialSamples.push(...checkMagnification(lensCtx, lens, referenceField, referenceField.inspections[0].id, false));
  }
}
assert.equal(networkSamples.get(176).length, 0, 'Relationships must wait for the settled lens and object reveal');
assert.ok(networkSamples.get(198).length > 0 && networkSamples.get(198).length < networkSamples.get(222).length, 'Relationships must spread out progressively from the inspection');
assert.ok(networkSamples.get(198).some(({ path }) => distance(path[0], networkPoint(referenceField.inspections[0].id)) < 1e-8), 'The discovery must begin at the inspected grain');
assert.equal(networkSamples.get(246).length, referenceField.inspections[0].edges.length);
assert.deepEqual(networkSamples.get(246), networkSamples.get(282), 'The revealed network must hold still while the lens rests');
assert.ok(networkSamples.get(294).every(stroke => stroke.alpha < networkSamples.get(282)[0].alpha), 'The network must recede before the next inspection');
assert.equal(networkSamples.get(312).length, 0, 'Relationships must disappear before the lens travels');
assert.equal(networkSamples.get(330).length, 0, 'The moving lens must not drag relationships through the field');
const stillInspectionCtx = recorder();
drawApproach(stillInspectionCtx, 400, 400, 0, { phase: 0, reducedMotion: true });
assert.equal(stillInspectionCtx.strokeRecords.filter(stroke => stroke.style === '#707783').length, referenceField.inspections[0].edges.length, 'Reduced motion must show the complete inspection network without waiting for animation');
assert.ok(distance(lensSamples[0], lensSamples[1]) < 1e-9, 'The lens must pause on one dot for at least two seconds');
assert.notEqual(lensSamples[0].label, lensSamples[2].label, 'The lens must move on to another inspection');
assert.ok(distance(lensSamples[1], lensSamples[2]) > 20);
assert.deepEqual(iconSamples.map(sample => sample.label), ['People', 'Processes', 'Decisions', 'Records', 'Relationships']);
assert.equal(new Set(iconSamples.map(sample => sample.paths)).size, 5, 'Every lens inspection must reveal distinct icon geometry');
const centre = radialSamples.filter(p => p.input < .2);
const middle = radialSamples.filter(p => p.input > .4 && p.input < .6);
const edge = radialSamples.filter(p => p.input > .97);
assert.ok(centre.length && middle.length && edge.length, 'The recorded field must exercise centre, middle and edge behaviour');
assert.ok(Math.min(...centre.map(p => p.scale)) > Math.max(...middle.map(p => p.scale)), 'The centre must enlarge grains more than the middle');
assert.ok(Math.min(...middle.map(p => p.scale)) > Math.max(...edge.map(p => p.scale)), 'The middle must enlarge grains more than the rim');
assert.ok(edge.every(p => p.scale < 1.002 && p.output - p.input < .002), 'Position and size must approach the unchanged field smoothly at the rim');

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

// Follow the same population out of a dashboard and through every coral variant.
const returningCtx = recorder(), returningScene = createApproachScene(400, 400);
const returningParticles = [...returningScene.field.particles], checkedCorals = new Set();
const currentPoint = id => {
  const p = returningScene.field.particles[id], scale = returningScene.field.bounds.scale;
  return { x: 200 + p.x * scale, y: 200 + p.y * scale };
};
const homePoint = id => {
  const p = returningScene.homes[id], scale = returningScene.field.bounds.scale;
  return { x: 200 + p.x * scale, y: 200 + p.y * scale };
};
const paintReturn = (time, options) => {
  returningCtx.reset();
  updateApproachScene(returningScene, 400, 400, time, options);
  return drawApproach(returningCtx, 400, 400, time, options);
};
paintReturn(0, { phase: 1, reducedMotion: true });
paintReturn(0, { phase: 2 });
let movingBranchObserved = false;
for (let frame = 1; frame <= 52 * 20; frame++) {
  const presentation = paintReturn(frame / 20, { phase: 2 });
  const { study: activeStudy, ids: activeIds } = returningScene.studies[presentation.index];
  for (const id of activeIds) assert.equal(returningScene.field.particles[id], returningParticles[id], 'Every coral variant must reuse the original particles');
  for (const path of returningCtx.strokes) {
    const connected = activeStudy.nodes.slice(1).some((node, i) => {
      const parentId = activeIds[node[2]], a = currentPoint(parentId), b = currentPoint(activeIds[i + 1]);
      if (distance(path[0], a) > 1e-8) return false;
      const dx = b.x - a.x, dy = b.y - a.y;
      const progress = ((path[1].x - a.x) * dx + (path[1].y - a.y) * dy) / (dx * dx + dy * dy);
      const onBranch = { x: a.x + progress * dx, y: a.y + progress * dy };
      if (progress < -1e-9 || progress > 1 + 1e-9 || distance(path[1], onBranch) > 1e-8) return false;
      if (distance(a, homePoint(parentId)) > 1e-6) movingBranchObserved = true;
      return true;
    });
    assert.ok(connected, 'Growing edges must follow the current particle positions, including during their return');
  }
  const colouredNodes = returningCtx.arcs.slice(returningParticles.length).filter(arc => arc.radius !== 1.8);
  for (const arc of colouredNodes) {
    assert.ok(activeIds.some(id => distance(arc, currentPoint(id)) < 1e-8), 'Coloured coral nodes must coincide with actual returned grains');
  }
  if (presentation.growth === 1 && !checkedCorals.has(presentation.index)) {
    assert.ok(returningScene.grey > .99, 'The coral must be drawn over the returned grey population');
    assert.equal(returningCtx.strokes.length, activeIds.length - 1);
    assert.equal(colouredNodes.length, activeIds.length);
    returningCtx.strokes.forEach((path, i) => {
      assert.ok(distance(path[0], currentPoint(activeIds[activeStudy.nodes[i + 1][2]])) < 1e-8);
      assert.ok(distance(path[1], currentPoint(activeIds[i + 1])) < 1e-8);
    });
    checkedCorals.add(presentation.index);
  }
}
assert.ok(movingBranchObserved, 'The transition check must observe a branch while its source grain is still returning');
assert.equal(checkedCorals.size, returningScene.studies.length, 'Every coral variant must have all of its particle bindings checked');

console.log('Canvas sequence checked: radial magnification, all five dimensional objects, progressive anchored inspection networks, lens dwell, and every coral node and edge attached to the same returning particles across all five variants.');
if (costs.length) {
  costs.sort((a, b) => a - b);
  const percentile = p => costs[Math.floor((costs.length - 1) * p)].toFixed(2);
  console.log(`Our Work checked at ${sizes.join('/')}px: one particle population, grounded releases, ${RESEARCH_FORM_COUNT} tool forms, grey return, reversing, resizing and reduced motion.`);
  console.log(`Update CPU time: median ${percentile(.5)}ms; 95th percentile ${percentile(.95)}ms; maximum ${costs.at(-1).toFixed(2)}ms. Canvas rasterisation is not included.`);
}
