import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { createApproachScene, updateApproachScene, approachPresentation, drawApproach } from '../src/scripts/art/approach.mjs';
import { researchTargets, RESEARCH_FORM_COUNT } from '../src/scripts/art/research.mjs';
import { HEAP } from '../src/scripts/art/adapt-grow.mjs';

const costs = [];
const sizes = process.argv.includes('--visual-only') ? [] : [400, 240, 418, 224, 260];
const positions = scene => scene.field.particles.map(({ x, y }) => [x, y]);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const screenPositions = scene => scene.field.particles.map(p =>
  ({ x: scene.width / 2 + p.x * scene.field.bounds.scale, y: scene.height / 2 + p.y * scene.field.bounds.scale }));
// Build & Learn: grains rest on the ground, then form each object in turn and drip down after the last.
const GROUND = 2.4, FORM_SPAN = 4.4, DRIP = 2.2, LAST_FORM = RESEARCH_FORM_COUNT - 1;

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
    const previousPhase = scene.phase, before = positions(scene), displayed = screenPositions(scene);
    updateApproachScene(scene, scene.width, scene.height, clock, { phase });
    assert.deepEqual(positions(scene), before, 'Changing scroll stage alone must not teleport particles');
    screenPositions(scene).forEach((point, i) => assert.ok(distance(point, displayed[i]) < 1e-8,
      'Changing scroll stage alone must preserve displayed particle positions'));
  };

  advance(1);
  assert.deepEqual(positions(scene), originalHomes.map(({ x, y }) => [x, y]));
  changePhase(1);
  advance(GROUND);
  for (let frame = 0; !scene.field.resting && frame < 8 * 60; frame++) {
    assert.ok(scene.field.particles.every(p => p.attraction === 0), 'The grains must settle on the ground before they lift');
    advance(1 / 60);
  }
  groundedPile(scene);
  assert.ok(scene.age >= GROUND - .00001, 'The grains must rest on the ground for its minimum interval');
  const initialSettledAt = clock - 1, rollovers = [];

  // Each object forms in the water straight from the last, with no fall in between.
  for (let form = 0; form < RESEARCH_FORM_COUNT; form++) {
    advance(form === 0 ? FORM_SPAN - .3 : FORM_SPAN);
    const presentation = approachPresentation(scene);
    assert.equal(presentation.form, form, 'The particles must make distinct tools in sequence');
    assert.equal(presentation.detail.length > 0, true);
    assert.ok(scene.field.particles.every((p, i) => distance(p, researchTargets(form)[i]) < .003), 'A tool must become a legible stable formation');
    assert.ok(!scene.field.resting, 'Objects follow one another in the water, without settling on the ground between them');
    finiteAndContained(scene, originals);
    rollovers.push((clock - 1).toFixed(2));
  }
  assert.equal(approachPresentation(scene).detail, 'A shared view of performance', 'The dashboard must come last');
  // After the dashboard the grains drip to the ground and settle before the sequence starts again.
  let settled = false;
  for (let frame = 0; frame < (DRIP + 4) * 60 && !settled; frame++) {
    advance(1 / 60);
    if (scene.field.resting) { groundedPile(scene); settled = true; }
  }
  assert.ok(settled, 'After the last object the grains must drip down into a settled pile');
  advance(FORM_SPAN - .3);
  assert.equal(approachPresentation(scene).form, 0, 'The sequence must begin again from the ground');

  changePhase(2);
  advance(4);
  assert.ok(scene.grey > .999, 'The returned background field must become grey');
  const heap = [...scene.grow.rock.keys()];
  assert.equal(heap.length, HEAP.count, 'A fixed share of the grains fall into the heap');
  const floor = scene.field.bounds.bottom;
  assert.ok(heap.every(id => floor - scene.field.particles[id].y < .4), 'Heap grains must lie on the floor of the frame');
  const loose = scene.field.particles.filter((p, i) => !scene.grow.rock.has(i) && !scene.grow.coral.has(i));
  assert.ok(loose.length > scene.field.particles.length * .5, 'Most grains stay in the water for the coral to grow through');
  assert.ok(loose.every(p => distance(p, scene.homes[p.id]) < .0001), 'Grains in the water must return to their Go & See positions');
  assert.deepEqual(scene.homes, originalHomes);
  for (const { study, ids } of scene.studies) {
    assert.equal(ids.length, study.nodes.length);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) assert.equal(scene.field.particles[id], originals[id], 'Reserved home anchors must remain members of the shared population');
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
    const targets = phase === 1 ? researchTargets(LAST_FORM) : phase === 2 ? scene.growTargets : scene.homes;
    assert.ok(scene.field.particles.every((p, i) => distance(p, targets[i]) === 0 && p.vx === 0 && p.vy === 0));
    assert.equal(scene.grey, phase === 2 ? 1 : 0);
    const still = positions(scene), age = scene.age;
    clock += 100;
    updateApproachScene(scene, scene.width, scene.height, clock, { phase, reducedMotion: true });
    assert.deepEqual(positions(scene), still, 'Reduced motion must stay still over time');
    assert.equal(scene.age, age);
    finiteAndContained(scene, originals);
  }
  console.log(`${size}px: initial settled pile at ${initialSettledAt.toFixed(2)}s; ${rollovers.length} rollovers at ${rollovers.join(', ')}s.`);
}

// Record canvas geometry to check the lens, discovered relationships and regression.
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
      this.strokeRecords.push({ path: this.path, style: this.strokeStyle, alpha: this.globalAlpha, width: this.lineWidth, clip: this.clipPath });
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
  if (revealed) {
    const source = reference.field.particles[selected];
    assert.ok(distance({ x: 200 + source.x * reference.field.bounds.scale, y: 200 + source.y * reference.field.bounds.scale }, lens) < 1e-8, 'The resolved object must stay centred on its original subject mark');
  }
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
const treeShapes = [], classified = new Set();
for (const { id, label, edges } of referenceField.inspections) {
  const reached = [id];
  for (const edge of edges) {
    assert.ok(reached.includes(edge.from) && !reached.includes(edge.to), 'Each inspection must be one connected acyclic tree');
    assert.ok(edge.start < edge.end && edge.end <= 1);
    const parent = edges.find(candidate => candidate.to === edge.from);
    assert.equal(edge.start, parent?.end ?? 0, 'A branch must wait until its parent reaches the shared grain');
    reached.push(edge.to);
  }
  assert.equal(edges.filter(edge => edge.from === id).length, 1, 'Every subject tree must grow from one trunk at the inspected grain');
  for (const member of reached) {
    assert.equal(referenceField.locations[member].kind, label, 'Network members must all represent the inspected class');
    assert.ok(!classified.has(member), 'Different subject networks must use distinct grains');
    classified.add(member);
  }
  treeShapes.push(JSON.stringify(edges.map(({ from, to }) => [reached.indexOf(from), reached.indexOf(to)])));
}
assert.equal(new Set(treeShapes).size, 5, 'Subjects must have distinct authored branching structures');
for (let frame = 0; frame <= 1152; frame++) {
  lensCtx.reset();
  drawApproach(lensCtx, 400, 400, frame / 60, { phase: 0 });
  const network = lensCtx.strokeRecords.filter(stroke => stroke.style === '#707783' && !stroke.clip);
  const interior = lensCtx.strokeRecords.filter(stroke => stroke.style === '#707783' && stroke.clip);
  const inspection = referenceField.inspections[Math.floor(Math.max(0, frame / 60 - 1.3) / 4) % referenceField.inspections.length];
  for (const stroke of network) {
    assert.equal(stroke.path.length, 2);
    assert.ok(inspection.edges.some(({ from, to }) => {
      const a = networkPoint(from), b = networkPoint(to), tip = stroke.path[1];
      const progress = ((tip.x - a.x) * (b.x - a.x) + (tip.y - a.y) * (b.y - a.y)) / ((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
      return distance(stroke.path[0], a) < 1e-8 && progress >= 0 && progress <= 1 + 1e-8 && distance(tip, { x: a.x + (b.x - a.x) * progress, y: a.y + (b.y - a.y) * progress }) < 1e-8;
    }), 'Each growing relationship must follow an edge between two original grains');
    assert.ok(distance(stroke.path[0], networkPoint(inspection.id)) < 1e-8 || network.some(parent => distance(parent.path[1], stroke.path[0]) < 1e-8), 'Revealing relationships must remain connected to the inspected grain');
    assert.ok(stroke.width < .85 && stroke.alpha <= .52, 'Discovered relationships must retain their fine, quiet line weight');
  }
  if (network.length) {
    const root = networkPoint(inspection.id);
    assert.ok(interior.some(({ path }) => distance(path[0], root) < 1e-8), 'The network trunk must also be drawn inside the lens from the exact inspected grain');
    for (const stroke of interior) {
      const aperture = stroke.clip[0].arc.radius;
      const source = network.find(edge => {
        const a = edge.path[0], dx = a.x - root.x, dy = a.y - root.y;
        const scale = 1 + 1.65 * (1 - Math.min(1, Math.hypot(dx, dy) / aperture)) ** 2;
        return distance(stroke.path[0], { x: root.x + dx * scale, y: root.y + dy * scale }) < 1e-8;
      });
      assert.ok(source, 'Each lens-interior line must continue an existing exterior branch');
      for (let i = 0; i < stroke.path.length; i++) {
        const t = i / (stroke.path.length - 1), [a, b] = source.path;
        const dx = a.x + (b.x - a.x) * t - root.x, dy = a.y + (b.y - a.y) * t - root.y;
        const scale = 1 + 1.65 * (1 - Math.min(1, Math.hypot(dx, dy) / aperture)) ** 2;
        assert.ok(distance(stroke.path[i], { x: root.x + dx * scale, y: root.y + dy * scale }) < 1e-8, 'Lens-interior branches must follow the same radial mapping as their grains');
      }
    }
  }
  if (networkFrames.includes(frame)) networkSamples.set(frame, network);
  if ((frame - 246) % 240 === 0 && frame >= 246) assert.equal(network.length, inspection.edges.length, 'Every inspection must reveal its full local relationship network');
  if ([...dwellFrames, ...objectFrames, ...travelFrames].includes(frame)) {
    const fieldGrains = lensCtx.fills.filter(fill => !fill.clip && fill.style === 'rgb(36,78,255)');
    assert.equal(fieldGrains.length, referenceField.field.particles.length, 'Every ordinary field particle must remain a grain');
    assert.ok(fieldGrains.every(fill => fill.path.length === 1 && fill.path[0].arc), 'Field particles must be round dots rather than miniature objects');
    const symbols = lensCtx.strokeRecords.filter(stroke => stroke.style.toLowerCase() === '#244eff');
    assert.ok(symbols.every(stroke => stroke.clip), 'Inspection symbols must appear only inside the lens');
    const lensPath = lensCtx.strokes.filter(path => path.length === 1 && path[0].arc)
      .reduce((largest, path) => !largest || path[0].arc.radius >= largest[0].arc.radius ? path : largest, null);
    const lens = lensPath?.[0].arc;
    assert.ok(lens, 'Go & See must show a magnifying glass');
    if (dwellFrames.includes(frame)) lensSamples.push({ ...lens, label: lensCtx.labels.at(-1) });
    if (objectFrames.includes(frame)) {
      assert.ok(symbols.length > 0, 'A settled lens must reveal its selected symbol');
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
assert.equal(stillInspectionCtx.strokeRecords.filter(stroke => stroke.style === '#707783' && !stroke.clip).length, referenceField.inspections[0].edges.length, 'Reduced motion must show the complete inspection network without waiting for animation');
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

// Adapt & Grow: a coral of fine blue branches grows up from the heap through the grey grains.
const coralCtx = recorder();
const grainFills = ctx => ctx.fills.filter(fill => fill.path.length === 1 && fill.path[0].arc);
const branches = ctx => ctx.strokeRecords.filter(stroke => /^rgba\(36,78,255,/.test(stroke.style));
const finalCoral = drawApproach(coralCtx, 400, 400, 0, { phase: 2, reducedMotion: true });
assert.equal(finalCoral.caption, '03 / ADAPT & GROW');
assert.equal(branches(coralCtx).length, 1, 'The coral is drawn as one stroke of fine branches');
assert.ok(finalCoral.edges.length >= 20, 'The still coral must show its full form');
assert.ok(finalCoral.edges.every(({ progress }) => progress >= 0 && progress <= 1));
assert.ok(branches(coralCtx)[0].width < 1.1 && branches(coralCtx)[0].alpha === 1, 'Branches keep a fine line weight');
assert.equal(grainFills(coralCtx).length, 1800 + finalCoral.marks.length, 'Every grain stays drawn; coral grains are marked over them');
const stillCoral = structuredClone({ fills: coralCtx.fills, strokes: coralCtx.strokeRecords });
coralCtx.reset();
drawApproach(coralCtx, 400, 400, 100, { phase: 2, reducedMotion: true });
assert.deepEqual({ fills: coralCtx.fills, strokes: coralCtx.strokeRecords }, stillCoral, 'The reduced-motion coral must remain unchanged over time');

// The coral grows, takes in evidence and lets branches go, while keeping its shape.
const growScene = createApproachScene(400, 400), growCtx = recorder();
const growParticles = [...growScene.field.particles];
const paintGrow = (time, options) => {
  growCtx.reset();
  updateApproachScene(growScene, 400, 400, time, options);
  approachPresentation(growScene);
  return drawApproach(growCtx, 400, 400, time, options);
};
paintGrow(0, { phase: 1, reducedMotion: true });
const enteringPositions = screenPositions(growScene);
paintGrow(0, { phase: 2 });
grainFills(growCtx).slice(0, 1800).forEach((fill, id) => assert.ok(distance(fill.path[0].arc, enteringPositions[id]) < 1e-8,
  'Adapt & Grow must start from every existing grain, rather than drawing a replacement field'));
const details = new Set(), coralSizes = [];
let reached = 0;
const originalCoral = new Set(growScene.grow.base.map(({ id }) => id));
for (let frame = 1; frame <= 60 * 20; frame++) {
  const state = paintGrow(frame / 20, { phase: 2 });
  finiteAndContained(growScene, growParticles);
  details.add(state.detail);
  if (state.growth === 1) {
    coralSizes.push(state.marks.length);
    reached = Math.max(reached, state.marks.filter(({ id }) => originalCoral.has(id)).length);
  }
}
for (const detail of ['Growing from what we built', 'New evidence arrives', 'Growing towards it', 'Learning from new evidence'])
  assert.ok(details.has(detail), `Adapt & Grow must show: ${detail}`);
assert.ok(growScene.grow.events.every(({ add }) => add >= 0), 'Every event must grow towards new evidence');
assert.ok(growScene.grow.events.some(({ prune }) => prune >= 0), 'The coral must sometimes let a branch go');
assert.ok(Math.max(...coralSizes) - Math.min(...coralSizes) <= 4, 'The coral keeps its size: revisions stay restrained');
assert.ok(reached >= originalCoral.size - 1, 'The coral keeps nearly all of its original form');

// Leaving Adapt & Grow fades the branches out without moving any grain.
const beforeExit = screenPositions(growScene);
paintGrow(60, { phase: 1 });
grainFills(growCtx).forEach((fill, id) => { if (id < 1800) assert.ok(distance(fill.path[0].arc, beforeExit[id]) < 1e-8, 'Returning to Build & Learn must preserve each grain position'); });
assert.ok(growScene.coralExit, 'The coral must fade out as the stage changes');
for (let frame = 1; frame <= 12; frame++) paintGrow(60 + frame / 20, { phase: 1 });
assert.equal(branches(growCtx).length, 0, 'The retiring coral must disappear after its brief fade');
paintGrow(61, { phase: 2 });
paintGrow(61.05, { phase: 1 });
paintGrow(61.1, { phase: 1, reducedMotion: true });
assert.equal(growScene.coralExit, null, 'Enabling reduced motion must immediately clear a fading coral');

console.log('Canvas sequence checked: radial magnification, five inspection objects, anchored networks, lens dwell, a still coral, shared-grain entry, restrained growth and a clean exit.');
if (costs.length) {
  costs.sort((a, b) => a - b);
  const percentile = p => costs[Math.floor((costs.length - 1) * p)].toFixed(2);
  console.log(`Our Work checked at ${sizes.join('/')}px: one particle population, ground start, ${RESEARCH_FORM_COUNT} tool forms, drip and heap, reversing, resizing and reduced motion.`);
  console.log(`Update CPU time: median ${percentile(.5)}ms; 95th percentile ${percentile(.95)}ms; maximum ${costs.at(-1).toFixed(2)}ms. Canvas rasterisation is not included.`);
}
