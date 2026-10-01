import assert from 'node:assert/strict';
import { fishPose } from '../src/scripts/art/reef-fish-motion.mjs';
import { reefHabitat, reefFloorHeight } from '../src/scripts/art/reef-habitat.mjs';
import { movingFish } from '../src/scripts/art/reef.mjs';
import { movingTurtle } from '../src/scripts/art/reef-turtle.mjs';

// Includes the fish's fins and full tail displacement before pose/scale.
const halfSize = [36, 15, 15];
function bounds(pose) {
  const cy = Math.cos(pose.yaw), sy = Math.sin(pose.yaw), cp = Math.cos(pose.pitch), sp = Math.sin(pose.pitch);
  const cb = Math.cos(pose.bank), sb = Math.sin(pose.bank), vertices = [];
  for (const x of [-halfSize[0], halfSize[0]]) for (const y of [-halfSize[1], halfSize[1]]) for (const z of [-halfSize[2], halfSize[2]]) {
    const by = y * cb - z * sb, bz = y * sb + z * cb;
    const px = x * cp - bz * sp, pz = x * sp + bz * cp;
    vertices.push([pose.centre[0] + (px * cy - by * sy) * pose.size,
      pose.centre[1] + (px * sy + by * cy) * pose.size, pose.centre[2] + pz * pose.size]);
  }
  return [0, 1, 2].map(axis => [Math.min(...vertices.map(p => p[axis])), Math.max(...vertices.map(p => p[axis]))]);
}
const angularDifference = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const meshBounds = mesh => [0, 1, 2].map(axis => [Math.min(...mesh.vertices.map(p => p[axis])), Math.max(...mesh.vertices.map(p => p[axis]))]);

for (const compact of [false, true]) {
  const habitat = reefHabitat(compact);
  let minimumColony = Infinity, minimumFloor = Infinity, minimumPair = Infinity, maximumPair = 0, minimumTurtleGap = Infinity;
  for (let time = 0; time <= 3600; time += .5) {
    const poses = Array.from({ length: 4 }, (_, index) => fishPose(time, index, compact));
    const boxes = poses.map(bounds);
    for (const [index, pose] of poses.entries()) {
      assert.ok([...pose.centre, pose.yaw, pose.pitch, pose.bank, pose.size].every(Number.isFinite), 'Finite fish pose');
      const before = fishPose(time - .001, index, compact), after = fishPose(time + .001, index, compact);
      const velocity = after.centre.map((v, axis) => (v - before.centre[axis]) / .002);
      assert.ok(Math.hypot(...velocity) > .3 && Math.hypot(...velocity) < 32, 'Continuous positive bounded swim speed');
      assert.ok(Math.abs(angularDifference(pose.yaw, Math.atan2(velocity[1], velocity[0]))) < .0001,
        'Fish face the tangent to their own route');
      assert.ok(Math.abs(angularDifference(after.yaw, before.yaw)) < .002, 'No abrupt heading jump, including at turns');
      assert.ok(Math.abs(after.pitch - before.pitch) < .002 && Math.abs(after.bank - before.bank) < .002,
        'No pitch or bank discontinuity');
      const box = boxes[index];
      for (const x of [box[0][0], pose.centre[0], box[0][1]]) for (const y of [box[1][0], pose.centre[1], box[1][1]]) {
        minimumFloor = Math.min(minimumFloor, box[2][0] - reefFloorHeight(x, y / 3.1, compact));
      }
      for (const colony of habitat) if (box[0][1] > colony.origin[0] - colony.envelope.rx - 2
        && box[0][0] < colony.origin[0] + colony.envelope.rx + 2
        && box[1][1] > colony.origin[1] * 3.1 - colony.envelope.ry - 2
        && box[1][0] < colony.origin[1] * 3.1 + colony.envelope.ry + 2) {
        minimumColony = Math.min(minimumColony, box[2][0] - colony.origin[2] - colony.height - 4);
      }
      for (let other = index + 1; other < 4; other++) {
        assert.ok(box.some((range, axis) => range[1] + 2 < boxes[other][axis][0]
          || range[0] - 2 > boxes[other][axis][1]), `Fish bounds must not intersect at ${time}s`);
      }
    }
    for (const index of [0, 2]) {
      const separation = Math.hypot(...poses[index].centre.map((v, axis) => v - poses[index + 1].centre[axis]));
      minimumPair = Math.min(minimumPair, separation); maximumPair = Math.max(maximumPair, separation);
      assert.ok(separation > 32 && separation < (compact ? 70 : 140), 'Pairs remain loosely associated throughout a turn');
    }
  }
  assert.ok(minimumFloor > 0 && minimumColony > 4, 'Fish clear both the seabed and conservative swaying colony envelopes');
  for (let time = 0; time <= 3600; time += 2) {
    const turtles = [0, 1].map(index => meshBounds(movingTurtle(time, compact, index)));
    for (let index = 0; index < 4; index++) {
      const fish = movingFish(time, index, compact), actual = meshBounds(fish), conservative = bounds(fishPose(time, index, compact));
      assert.ok(fish.vertices.flat().every(Number.isFinite) && fish.normals.flat().every(Number.isFinite), 'Finite animated chromis mesh');
      for (let axis = 0; axis < 3; axis++) assert.ok(actual[axis][0] >= conservative[axis][0]
        && actual[axis][1] <= conservative[axis][1], 'Complete animated fish remains inside the tested clearance bounds');
      for (const turtle of turtles) {
        const gap = Math.max(...actual.map((range, axis) => Math.max(range[0] - turtle[axis][1], turtle[axis][0] - range[1])));
        minimumTurtleGap = Math.min(minimumTurtleGap, gap);
        assert.ok(gap > 8, 'Animated fish and both turtles have separate bounding boxes');
      }
    }
  }
  console.log(`${compact ? 'Phone' : 'Desktop'} fish: 28,804 sampled poses; colony clearance ${minimumColony.toFixed(1)}, seabed clearance ${minimumFloor.toFixed(1)}, pair spacing ${minimumPair.toFixed(1)}–${maximumPair.toFixed(1)}, turtle gap ${minimumTurtleGap.toFixed(1)} world units.`);
}
console.log('Fish motion checks passed: finite poses, continuous tangent-based turns, paired routes and conservative habitat separation.');
