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
  let maximumSegments = 0, minY = Infinity, maxY = -Infinity;
  for (let time = 0; time <= 180; time += 2) {
    const geometry = squidGeometry(time, compact);
    const arms = geometry.appendages.filter(p => p.kind === 'arm'), tentacles = geometry.appendages.filter(p => p.kind === 'tentacle');
    assert.equal(arms.length, 8, 'Eight arms in the crown');
    assert.equal(tentacles.length, 2, 'Two distinct feeding tentacles');
    assert.ok(tentacles.every(p => p.length > Math.max(...arms.map(a => a.length)) * 2), 'Feeding tentacles must remain substantially longer than the arms');
    for (const path of geometry.paths) {
      assert.ok(path.points.length >= 2 && path.points.every(p => p.length === 3 && p.every(Number.isFinite)), 'Valid native 3D curves');
    }
    const segments = geometry.paths.reduce((n, path) => n + path.points.length - 1, 0);
    maximumSegments = Math.max(maximumSegments, segments);
    assert.ok(segments <= (compact ? 1800 : 4000), 'Keep the background mesh within its line budget');
    const frame = capture(width, height, time, options);
    assert.ok(frame.strokes.length === 0 || frame.strokes.length === 2, 'Batch the wireframe into two strokes');
    assert.ok(frame.strokes.every(stroke => stroke.alpha > 0 && stroke.alpha <= .3 && stroke.width <= .6), 'Quiet fine-line styling');
    if (frame.visible) { minY = Math.min(minY, frame.minimum[1]); maxY = Math.max(maxY, frame.maximum[1]); }
  }
  assert.ok(capture(width, height, 1, options).visible, 'The first pass appears promptly');
  assert.ok(capture(width, height, 46, options).visible, 'A new pass begins after 45 seconds');
  // A discontinuous wrap is allowed only with the complete animal offstage.
  for (const time of [29.8, 43.8, 74.8, 88.8]) {
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
console.log('Journal squid checks passed: anatomy, finite geometry, draw budget, 45-second offscreen wrap, reduced motion and canvas state.');
