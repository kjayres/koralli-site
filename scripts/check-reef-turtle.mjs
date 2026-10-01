import assert from 'node:assert/strict';
import { movingTurtle, turtlePose } from '../src/scripts/art/reef-turtle.mjs';
import { reefHabitat, reefFloorHeight } from '../src/scripts/art/reef-habitat.mjs';

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const subtract = (a, b) => a.map((v, i) => v - b[i]);
const base = movingTurtle(0), edges = new Map(), used = new Set();
assert.ok(base.faces.length <= 1300, 'Keep the moving turtle within its triangle budget');
for (const face of base.faces) {
  assert.equal(new Set(face).size, 3);
  for (const index of face) {
    assert.ok(Number.isInteger(index) && index >= 0 && index < base.vertices.length, 'Valid vertex indices');
    used.add(index);
  }
  for (let j = 0; j < 3; j++) {
    const a = face[j], b = face[(j + 1) % 3], key = `${Math.min(a, b)}:${Math.max(a, b)}`;
    const directions = edges.get(key) || [];
    directions.push(a < b ? 1 : -1); edges.set(key, directions);
  }
}
for (const directions of edges.values()) {
  assert.equal(directions.length, 2, 'Each shell, flipper and head part must be closed');
  assert.equal(directions[0] + directions[1], 0, 'Adjacent faces must have consistent winding');
}
assert.ok(base.nodes.every(index => Number.isInteger(index) && base.vertices[index]), 'Valid eye nodes');
assert.deepEqual(base.vertices.flatMap((_, i) => used.has(i) ? [] : [i]), base.nodes,
  'Only the eye landmarks should be outside the closed mesh');

const times = new Set(Array.from({ length: 301 }, (_, i) => i * 2)), boundaries = [];
for (let cycle = 0; cycle * 9.2 <= 600; cycle++) for (const phase of [0, 1.35, 2.65, 3.5, 9.2]) {
  const time = cycle * 9.2 + phase;
  if (time <= 600) { times.add(time); boundaries.push(time); }
}

for (const compact of [false, true]) {
  const habitat = reefHabitat(compact);
  let minimumFloor = Infinity, minimumColony = Infinity;
  for (const time of times) {
    const turtle = movingTurtle(time, compact), minimum = [Infinity, Infinity, Infinity], maximum = [-Infinity, -Infinity, -Infinity];
    for (const vertex of turtle.vertices) {
      assert.ok(vertex.every(Number.isFinite), `Finite geometry at ${time}s`);
      vertex.forEach((value, i) => { minimum[i] = Math.min(minimum[i], value); maximum[i] = Math.max(maximum[i], value); });
    }
    assert.equal(turtle.normals.length, turtle.faces.length);
    for (const n of turtle.normals) assert.ok(n.every(Number.isFinite) && Math.abs(Math.hypot(...n) - 1) < 1e-8, 'Finite unit normals');
    const centroids = turtle.faces.map(face => {
      const [a, b, c] = face.map(index => turtle.vertices[index]);
      assert.ok(Math.hypot(...cross(subtract(b, a), subtract(c, a))) > 1e-5, 'No collapsed triangles during a stroke');
      return a.map((v, i) => (v + b[i] + c[i]) / 3);
    });
    const nearby = habitat.filter(p => maximum[0] > p.origin[0] - p.envelope.rx - 2 && minimum[0] < p.origin[0] + p.envelope.rx + 2
      && maximum[1] > p.origin[1] * 3.1 - p.envelope.ry - 2 && minimum[1] < p.origin[1] * 3.1 + p.envelope.ry + 2);
    // Native habitat y is stretched by 3.1 in the renderer. Envelopes already
    // include reserved plant sway; additional margins protect near misses.
    for (const vertex of [...turtle.vertices, ...centroids]) {
      minimumFloor = Math.min(minimumFloor, vertex[2] - reefFloorHeight(vertex[0], vertex[1] / 3.1, compact));
      for (const p of nearby) if (Math.abs(vertex[0] - p.origin[0]) < p.envelope.rx + 2
        && Math.abs(vertex[1] - p.origin[1] * 3.1) < p.envelope.ry + 2) {
        const clearance = vertex[2] - p.origin[2] - p.height - 4;
        assert.ok(clearance > 0, `${compact ? 'Phone' : 'Desktop'} turtle intersects ${p.name} at ${time}s`);
        minimumColony = Math.min(minimumColony, clearance);
      }
    }
  }
  assert.ok(minimumFloor > 0, 'The complete turtle must remain above the seabed');

  // Locate route turns from the exposed pose rather than duplicating its
  // ellipse equation, then check the rendered mesh on both sides of a turn.
  const velocityX = time => turtlePose(time + .005, compact).centre[0] - turtlePose(time - .005, compact).centre[0];
  const continuityTimes = [...boundaries];
  for (let time = 2; time <= 600; time += 2) if (velocityX(time - 2) * velocityX(time) < 0) {
    let lo = time - 2, hi = time;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (velocityX(lo) * velocityX(mid) <= 0) hi = mid; else lo = mid;
    }
    continuityTimes.push((lo + hi) / 2);
  }
  for (const time of continuityTimes) {
    const before = movingTurtle(time - .001, compact), after = movingTurtle(time + .001, compact);
    assert.ok(before.vertices.every((p, i) => Math.hypot(...subtract(p, after.vertices[i])) < 1),
      `No position or pose jump at a turn/stroke boundary (${time}s)`);
  }
  console.log(`${compact ? 'Phone' : 'Desktop'} turtle: ${times.size} poses checked; minimum seabed clearance ${minimumFloor.toFixed(1)}, colony clearance ${minimumColony.toFixed(1)} world units.`);
}
console.log(`Turtle checks passed: ${base.vertices.length} vertices, ${base.faces.length} closed triangles, finite poses and continuous turns/strokes.`);
