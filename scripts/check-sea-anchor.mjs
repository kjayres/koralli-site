import assert from 'node:assert/strict';
import { anchorModel, anchorOutline, landingBurst, landingImpact, project, stepParticle } from '../src/scripts/sea-anchor.mjs';

// A seeded generator keeps each landing repeatable.
const seeded = seed => () => (seed = seed * 16807 % 2147483647) / 2147483647;
const count = (particles, kind) => particles.filter(p => p.kind === kind).length;

assert.equal(landingImpact(0), 0, 'Arriving at a standstill raises nothing');
assert.equal(landingImpact(10), 1, 'A flick lands as hard as it can');

const gentle = landingBurst(landingImpact(.4), seeded(7)), hard = landingBurst(landingImpact(4), seeded(7));
assert.equal(count(gentle, 'rock'), 0, 'A gentle landing only stirs the sand');
assert.ok(count(hard, 'rock') >= 2, 'A hard landing chips rock');
assert.ok(count(hard, 'dust') > count(gentle, 'dust') * 2, 'Dust grows with the speed of arrival');
assert.equal(count(landingBurst(1, seeded(3), { rocks: false }), 'rock'), 0, 'Lifting off never chips rock');

for (const particle of hard) {
  let alive = true, frames = 0;
  while (alive && frames++ < 400) {
    alive = stepParticle(particle, 1 / 60);
    assert.ok(particle.y <= 0, 'Sediment never sinks below the seabed');
  }
  assert.equal(alive, false, 'Every particle settles and fades within a few seconds');
}

// The silhouette is one closed shape and its walls face outwards, so turning culls the hidden ones.
const outline = anchorOutline(), model = anchorModel();
const inside = ([x, y]) => outline.reduce((odd, a, i) => {
  const b = outline[(i + 1) % outline.length];
  return (a[1] > y) !== (b[1] > y) && x < a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]) ? !odd : odd;
}, false);
assert.equal(model.sides.length, outline.length);
model.sides.forEach(([nx, ny], i) => {
  const a = outline[i], b = outline[(i + 1) % outline.length], mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  if (Math.hypot(b[0] - a[0], b[1] - a[1]) < .2) return;
  assert.ok(!inside([mid[0] + nx * .05, mid[1] + ny * .05]) && inside([mid[0] - nx * .05, mid[1] - ny * .05]), `Wall ${i} faces outwards`);
});

// Hanging at rest, the anchor fits between the ring's rope and the seabed and within the canvas.
const state = { yaw: .62, sway: 0, roll: 0, scale: 1 };
const points = [...model.front, ...model.back, ...model.ring].map(point => project(point, state));
assert.ok(Math.max(...points.map(p => p[1])) <= 42.4, 'The crown stays above the seabed');
assert.ok(Math.min(...points.map(p => p[1])) >= 0, 'Nothing rises above the rope join');
assert.ok(Math.max(...points.map(p => Math.abs(p[0]))) < 24, 'The flukes stay within reach of the canvas');
