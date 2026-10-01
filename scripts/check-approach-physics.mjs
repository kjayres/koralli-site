import assert from 'node:assert/strict';
import {
  RESEARCH_PARTICLE_COUNT,
  researchBounds,
  createParticleField,
  resizeParticleField,
  advanceParticleField,
  researchTargets,
  drawResearch,
} from '../src/scripts/art/research.mjs';

const field = createParticleField(researchBounds(520, 450));
const identities = [...field.particles];
assert.equal(field.particles.length, RESEARCH_PARTICLE_COUNT);
assert.equal(field.time, 0, 'Creating a field must not pre-run the simulation');

function advance(seconds, options = {}) {
  for (let frame = 0; frame < Math.round(seconds * 60); frame++) {
    advanceParticleField(field, 1 / 60, options);
  }
}

function checkIdentityAndBounds() {
  field.particles.forEach((p, i) => {
    assert.equal(p, identities[i], 'Phase changes must retain the same grain objects');
    assert.equal(p.id, i, 'Phase changes must retain each grain identity');
    for (const value of [p.x, p.y, p.vx, p.vy, p.r]) assert.ok(Number.isFinite(value));
    assert.ok(p.x - p.r >= -field.bounds.halfWidth - 1e-10);
    assert.ok(p.x + p.r <= field.bounds.halfWidth + 1e-10);
    assert.ok(p.y - p.r >= field.bounds.top - 1e-10);
    assert.ok(p.y + p.r <= field.bounds.bottom + 1e-10);
  });
}

function checkSettled() {
  assert.equal(field.resting, true, 'Released grains must settle completely');
  assert.ok(field.particles.every(p => p.asleep && p.vx === 0 && p.vy === 0));
  assert.ok(field.supported.every(Boolean), 'Every resting grain needs a contact path to the floor');
  checkIdentityAndBounds();
  const before = field.particles.map(p => [p.x, p.y]);
  advance(.25);
  assert.deepEqual(field.particles.map(p => [p.x, p.y]), before, 'A settled pile must not hover or jitter');
}

advance(4);
checkSettled();

const targets = researchTargets(0);
advance(2, { targets, attraction: 1, gravity: 0, curl: 0 });
assert.ok(field.particles.every(p => !p.asleep), 'Attraction must wake settled grains');
assert.ok(field.particles.every((p, i) => Math.hypot(p.x - targets[i].x, p.y - targets[i].y) < .002));
checkIdentityAndBounds();

advance(4);
checkSettled();

resizeParticleField(field, researchBounds(320, 390));
advance(3);
checkSettled();

advance(.05, { targets: researchTargets(1), attraction: (_p, i) => i % 2 ? .001 : 0, gravity: 0 });
assert.ok(field.particles.every((p, i) => i % 2 ? !p.asleep : p.attraction === 0));
checkIdentityAndBounds();

const time = field.time;
advanceParticleField(field, 30, { targets, attraction: 1 });
assert.ok(field.time - time <= .100001, 'A background-tab gap must not simulate a long jump');
checkIdentityAndBounds();

let arcs = 0;
const ctx = {
  save() {}, restore() {}, beginPath() {}, fill() {},
  arc(x, y, radius) {
    assert.ok(Number.isFinite(x) && Number.isFinite(y) && radius > 0);
    arcs++;
  },
};
for (const seconds of [0, 6, 15, 32]) {
  arcs = 0;
  drawResearch(ctx, 520, 450, seconds);
  assert.equal(arcs, RESEARCH_PARTICLE_COUNT);
}
arcs = 0;
drawResearch(ctx, 320, 390, 32, { reducedMotion: true });
assert.equal(arcs, RESEARCH_PARTICLE_COUNT);

console.log('Approach physics checked: stable identities, grounded settling, attraction, release, resize and bounded elapsed time.');
