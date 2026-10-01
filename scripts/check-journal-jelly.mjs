import assert from 'node:assert/strict';
import { drawJournalJelly, jellyGeometry, jellyPose, jellyPulse } from '../src/scripts/art/journal-jelly.mjs';

function capture(width, height, time, options = {}) {
  const initial = { globalAlpha: .71, strokeStyle: '#123456', lineWidth: 3, lineCap: 'butt', lineJoin: 'miter' };
  const strokes = [], ctx = { ...initial,
    save() { this.saved = Object.fromEntries(Object.keys(initial).map(key => [key, this[key]])); },
    restore() { Object.assign(this, this.saved); },
    beginPath() { this.points = []; },
    moveTo(...point) { this.points.push(point); },
    lineTo(...point) { this.points.push(point); },
    stroke() { strokes.push({ points: this.points, alpha: this.globalAlpha, width: this.lineWidth }); }
  };
  drawJournalJelly(ctx, width, height, time, options);
  assert.deepEqual(Object.fromEntries(Object.keys(initial).map(key => [key, ctx[key]])), initial, 'Restore shared canvas state');
  assert.ok(strokes.every(s => s.points.every(p => p.every(Number.isFinite))), 'Only finite canvas coordinates');
  return strokes;
}

for (const compact of [false, true]) {
  const width = compact ? 390 : 1512, height = compact ? 1710 : 1778;
  let minimumPulse = Infinity, maximumPulse = -Infinity, maximumSegments = 0;
  for (let time = 0; time <= 600; time += 1.7) {
    const current = Math.sin(time * .07), geometry = jellyGeometry(time, compact, current);
    const short = geometry.tentacles.filter(t => t.name === 'marginal-tentacle');
    const long = geometry.tentacles.filter(t => t.name === 'trailing-tentacle');
    assert.equal(short.length, 20, 'A crown of marginal tentacles');
    assert.equal(long.length, 1, 'One distinctive trailing filament');
    assert.ok(long[0].length > Math.max(...short.map(t => t.length)) * 2.7, 'Long tentacle remains recognisably different');
    assert.ok(geometry.paths.some(p => p.name === 'crown-groove'), 'Keep the defining coronal groove');
    for (const path of geometry.paths) assert.ok(path.points.every(p => p.length === 3 && p.every(Number.isFinite)), 'Finite native 3D curves');
    for (const tentacle of geometry.tentacles) {
      const length = tentacle.points.slice(1).reduce((sum, p, i) => sum + Math.hypot(...p.map((v, axis) => v - tentacle.points[i][axis])), 0);
      assert.ok(Math.abs(length - tentacle.length) < 1e-8, 'Tentacles bend without stretching');
    }
    const count = geometry.paths.reduce((sum, p) => sum + p.points.length - 1, 0);
    maximumSegments = Math.max(maximumSegments, count);
    assert.ok(count <= (compact ? 950 : 1450), 'Keep the species detail within its background drawing budget');
    const frame = capture(width, height, time, { compact, current });
    assert.equal(frame.length, 2, 'Two batched canvas strokes');
    assert.ok(frame.every(s => s.alpha <= .25 && s.width <= .54), 'Quiet fine wireframe');
    const pose = jellyPose(width, height, time, { compact });
    assert.ok(pose.x > width * .78 && pose.x < width * .96, 'Keep the animal in its existing right-hand water column');
    minimumPulse = Math.min(minimumPulse, geometry.pulse); maximumPulse = Math.max(maximumPulse, geometry.pulse);
    const before = jellyPose(width, height, time - .0001, { compact }), after = jellyPose(width, height, time + .0001, { compact });
    assert.ok(Math.hypot(after.x - before.x, after.y - before.y) < .01, 'Continuous drift and contraction-linked propulsion');
    const next = jellyGeometry(time + .0001, compact, current);
    assert.ok(geometry.tentacles.every((p, i) => Math.hypot(...p.points.at(-1).map((v, axis) => v - next.tentacles[i].points.at(-1)[axis])) < .001),
      'Filaments lag continuously without resets');
  }
  assert.ok(minimumPulse < .01 && maximumPulse > .99, 'A complete contraction and recovery cycle');
  assert.deepEqual(jellyGeometry(24.3, compact, .4), jellyGeometry(24.3, compact, .4), 'Deterministic geometry');
  assert.notDeepEqual(capture(width, height, 0, { compact }), capture(width, height, 3, { compact }), 'Live motion changes the form');
  const still = capture(width, height, 0, { compact, reducedMotion: true, current: -.8 });
  assert.deepEqual(still, capture(width, height, 1000, { compact, reducedMotion: true, current: .8 }), 'Reduced motion freezes current, pulse and drift');
  console.log(`${compact ? 'Phone' : 'Desktop'} Atolla: ${maximumSegments} segments, two strokes; 20 marginal tentacles and one trailing filament.`);
}
for (let cycle = 0; cycle < 20; cycle++) {
  for (const offset of [0, .29]) {
    const time = (cycle + offset - .18) * 5.8;
    assert.ok(Math.abs(jellyPulse(time - .0001) - jellyPulse(time + .0001)) < 1e-6, 'Continuous pulse at contraction/recovery joins');
  }
}
assert.equal(capture(0, 100, 0).length, 0);
assert.deepEqual(capture(390, 1710, Infinity), capture(390, 1710, 0));
console.log('Journal jelly checks passed: anatomy, bounded continuity, fixed-length tentacles, deterministic stills, reduced motion and draw budget.');
