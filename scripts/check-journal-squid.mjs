import assert from 'node:assert/strict';
import { drawJournalSquid, squidGeometry, squidPose } from '../src/scripts/art/journal-squid.mjs';

function capture(width, height, seconds, options) {
  const strokes = [], state = { globalAlpha: .71, strokeStyle: '#123456', lineWidth: 3, lineCap: 'butt', lineJoin: 'miter' };
  const ctx = { ...state,
    save() { this.saved = Object.fromEntries(Object.keys(state).map(key => [key, this[key]])); },
    restore() { Object.assign(this, this.saved); },
    beginPath() { this.points = []; },
    moveTo(x, y) { this.points.push([x, y]); },
    lineTo(x, y) { this.points.push([x, y]); },
    stroke() { strokes.push({ points: this.points, alpha: this.globalAlpha, width: this.lineWidth }); },
  };
  drawJournalSquid(ctx, width, height, seconds, options);
  assert.deepEqual(Object.fromEntries(Object.keys(state).map(key => [key, ctx[key]])), state, 'Restore the shared journal canvas state');
  const points = strokes.flatMap(stroke => stroke.points);
  assert.ok(points.every(point => point.every(Number.isFinite)), 'Only finite canvas coordinates');
  const minimum = [Infinity, Infinity], maximum = [-Infinity, -Infinity];
  for (const p of points) p.forEach((v, i) => { minimum[i] = Math.min(minimum[i], v); maximum[i] = Math.max(maximum[i], v); });
  return { strokes, minimum, maximum, visible: maximum[0] > 0 && minimum[0] < width && maximum[1] > 0 && minimum[1] < height };
}

for (const compact of [false, true]) {
  const width = compact ? 390 : 1440, height = compact ? 1900 : 1778, options = { compact };
  let maximumSegments = 0, minY = Infinity, maxY = -Infinity, minimumPulse = Infinity, maximumPulse = -Infinity;
  for (let time = 0; time <= 180; time += 2) {
    const geometry = squidGeometry(time, compact);
    const arms = geometry.appendages.filter(p => p.kind === 'arm'), tentacles = geometry.appendages.filter(p => p.kind === 'tentacle');
    assert.equal(arms.length, 8, 'Eight arms in the crown');
    assert.equal(tentacles.length, 2, 'Two distinct feeding tentacles');
    assert.ok(tentacles.every(p => p.length > Math.max(...arms.map(a => a.length)) * 2), 'Feeding tentacles must remain substantially longer than the arms');
    for (const arm of arms) {
      const length = arm.centres.slice(1).reduce((sum, p, i) => sum + Math.hypot(...p.map((v, axis) => v - arm.centres[i][axis])), 0);
      assert.ok(Math.abs(length - arm.length) < 1e-8, 'An arm bends without stretching');
    }
    for (const path of geometry.paths) {
      assert.ok(path.points.length >= 2 && path.points.every(p => p.length === 3 && p.every(Number.isFinite)), 'Valid native 3D curves');
    }
    const segments = geometry.paths.reduce((n, path) => n + path.points.length - 1, 0);
    maximumSegments = Math.max(maximumSegments, segments);
    assert.ok(segments <= (compact ? 2500 : 5500), 'Keep the background mesh within its line budget');
    assert.ok(geometry.paths.some(path => path.name === 'sucker'), 'Visible arms and tentacle clubs retain sucker detail');
    const eye = geometry.paths.filter(path => path.name === 'eye-globe').flatMap(path => path.points).filter(p => p[2] < 0);
    assert.ok(Math.max(...eye.map(p => p[2])) - Math.min(...eye.map(p => p[2])) > .025, 'The eye retains a three-dimensional globe');
    assert.ok(geometry.mantlePulse >= 0 && geometry.mantlePulse <= 1, 'The mantle contraction stays bounded');
    minimumPulse = Math.min(minimumPulse, geometry.mantlePulse); maximumPulse = Math.max(maximumPulse, geometry.mantlePulse);
    const frame = capture(width, height, time, options);
    assert.ok(frame.strokes.length === 0 || frame.strokes.length === 2, 'Batch the wireframe into two strokes');
    assert.ok(frame.strokes.every(stroke => stroke.alpha > 0 && stroke.alpha <= .3 && stroke.width <= .6), 'Quiet fine-line styling');
    if (frame.visible) { minY = Math.min(minY, frame.minimum[1]); maxY = Math.max(maxY, frame.maximum[1]); }
  }
  assert.ok(maximumPulse - minimumPulse > .9, 'The mantle cycles between contraction and recovery');
  const early = squidGeometry(3, compact).appendages.filter(p => p.kind === 'arm');
  const later = squidGeometry(10, compact).appendages.filter(p => p.kind === 'arm');
  assert.ok(early.filter((arm, i) => Math.hypot(...arm.tip.map((v, axis) => v - later[i].tip[axis])) > .025).length >= 6,
    'Independent arms visibly curl and relax');
  for (let group = 0; group < 4; group++) {
    const lanes = Array.from({ length: 3 }, (_, i) => squidPose(width, height, (group * 3 + i) * 45 + 10, options).lane);
    assert.deepEqual([...lanes].sort(), [0, 1, 2], 'Each three-pass group visits upper, middle and lower water');
  }
  for (let cycle = 0; cycle < 12; cycle++) {
    const first = squidPose(width, height, cycle * 45 + 4, options), last = squidPose(width, height, cycle * 45 + 26, options);
    assert.equal(first.laneY, last.laneY, 'Choose the height once per pass');
    assert.equal(first.laneY, squidPose(width, height, cycle * 45 + 4, options).laneY, 'Lane selection is deterministic');
    for (const time of [cycle * 45 + 8, cycle * 45 + 18, cycle * 45 + 27]) {
      const a = squidPose(width, height, time - .001, options), b = squidPose(width, height, time + .001, options);
      assert.ok(Math.hypot(b.x - a.x, b.y - a.y) < 1, 'No position jump during a visible pass');
      const before = squidGeometry(time - .001, compact), after = squidGeometry(time + .001, compact);
      assert.ok(before.appendages.every((part, i) => Math.hypot(...part.tip.map((v, axis) => v - after.appendages[i].tip[axis])) < .002),
        'Arms and feeding tentacles remain continuous');
    }
  }
  assert.ok(capture(width, height, 1, options).visible, 'The first pass appears promptly');
  assert.ok(capture(width, height, 46, options).visible, 'A new pass begins after 45 seconds');
  // A discontinuous wrap is allowed only with the complete animal offstage.
  for (const time of Array.from({ length: 12 }, (_, cycle) => [29.8 + cycle * 45, 43.8 + cycle * 45]).flat()) {
    assert.equal(capture(width, height, time - .001, options).visible, false, 'Fully departed before a gap/wrap');
    assert.equal(capture(width, height, time + .001, options).visible, false, 'Fully offstage after a gap/wrap');
  }
  const still = capture(width, height, 0, { compact, reducedMotion: true });
  assert.ok(still.visible && still.minimum[0] > 0 && still.maximum[0] < width, 'Reduced motion has a composed complete squid');
  assert.deepEqual(capture(width, height, 1000, { compact, reducedMotion: true, scrollProgress: 1 }).strokes, still.strokes,
    'Reduced motion freezes the pose and geometry, including scroll response');
  assert.ok(Number.isFinite(squidPose(width, height, Infinity, options).x), 'An invalid time has a stable initial pose');
  console.log(`${compact ? 'Phone' : 'Desktop'} squid: eight arms, two tentacles, ${maximumSegments} segments; visible vertical range ${minY.toFixed(1)}–${maxY.toFixed(1)} CSS pixels.`);
}
assert.equal(capture(0, 100, 0, {}).strokes.length, 0);
console.log('Journal squid checks passed: detailed anatomy, continuous appendages, bounded mantle motion, seeded lanes, draw budget, offscreen wrap, reduced motion and canvas state.');
