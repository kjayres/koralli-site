import assert from 'node:assert/strict';
import { reefTerrain, reefFloorHeight, reefRockFragments } from '../src/scripts/art/reef-terrain.mjs';
import { reefHabitat } from '../src/scripts/art/reef-habitat.mjs';
import { Reef, movingFish } from '../src/scripts/art/reef.mjs';
import { movingTurtle } from '../src/scripts/art/reef-turtle.mjs';

const bounds = mesh => [0, 1, 2].map(axis => [
  Math.min(...mesh.vertices.map(p => p[axis])), Math.max(...mesh.vertices.map(p => p[axis]))]);
const separation = (a, b) => Math.max(...a.map((range, axis) =>
  Math.max(range[0] - b[axis][1], b[axis][0] - range[1])));

for (const compact of [false, true]) {
  const meshes = reefTerrain(compact), edges = new Map();
  const key = point => point.map(value => value.toFixed(7)).join(',');
  let triangles = 0;
  for (const mesh of meshes) {
    assert.equal(mesh.faces.length, mesh.normals.length);
    for (const [index, face] of mesh.faces.entries()) {
      const points = face.map(id => mesh.vertices[id]);
      assert.ok(points.flat().every(Number.isFinite), 'Finite terrain vertices');
      const normal = mesh.normals[index];
      assert.ok(normal.every(Number.isFinite) && normal[2] > 0 && Math.abs(Math.hypot(...normal) - 1) < 1e-8,
        'Each terrain face has a finite upward unit normal');
      const centre = [0, 1, 2].map(axis => points.reduce((sum, point) => sum + point[axis], 0) / 3);
      assert.ok(Math.abs(reefFloorHeight(centre[0], centre[1] / 3.1, compact) - centre[2]) < 1e-8,
        'Grounding samples the visible triangle, including locally refined shelves');
      for (let i = 0; i < 3; i++) {
        const a = points[i], b = points[(i + 1) % 3], edge = [key(a), key(b)].sort().join('|');
        const previous = edges.get(edge);
        if (previous) previous.count++;
        else edges.set(edge, {a, b, count:1});
      }
      triangles++;
    }
  }
  assert.ok(triangles < (compact ? 8500 : 18000), 'Local rock detail stays inside the static geometry budget');
  const span = compact ? 730 : 1650, near = compact ? -980 : -2010, far = compact ? 2700 : 4600;
  for (const {a, b, count} of edges.values()) {
    assert.ok(count === 1 || count === 2, 'No non-manifold terrain edges');
    if (count === 1) assert.ok([a, b].every(p => Math.abs(p[0] + span) <= 10)
      || [a, b].every(p => Math.abs(p[0] - span) <= 10)
      || [a, b].every(p => Math.abs(p[1] - near) <= 8)
      || [a, b].every(p => Math.abs(p[1] - far) <= 8), 'Only the outer floor boundary may be open');
  }

  const state = {w:compact ? 390 : 1440, h:compact ? 440 : 560};
  new Reef().seedReef(state);
  const colonies = state.reefScene.filter(object => object.coral);
  for (const colony of colonies) {
    let minimumGap = Infinity;
    for (const [index, point] of colony.vertices.entries()) {
      const gap = point[2] - reefFloorHeight(point[0], point[1] / 3.1, compact);
      minimumGap = Math.min(minimumGap, gap);
      if (colony.growth[index] > .25) assert.ok(gap > 0, `${colony.name}: established growth must clear the floor`);
      assert.ok(point[2] <= colony.base + colony.height + 1e-8, 'Ground adaptation respects the actor-clearance height bound');
    }
    assert.ok(minimumGap <= 0, `${colony.name}: some root geometry must meet the floor`);
    for (const face of colony.faces) if (face.every(id => colony.growth[id] > .25)) {
      const centre = [0, 1, 2].map(axis => face.reduce((sum, id) => sum + colony.vertices[id][axis], 0) / 3);
      assert.ok(centre[2] > reefFloorHeight(centre[0], centre[1] / 3.1, compact),
        `${colony.name}: the middle of an elevated face must also clear rock`);
    }
  }
  const habitat = reefHabitat(compact);
  for (let i = 0; i < habitat.length; i++) for (let j = i + 1; j < habitat.length; j++) {
    const a = habitat[i], b = habitat[j];
    assert.ok(Math.abs(a.origin[0] - b.origin[0]) >= (a.envelope.rx + b.envelope.rx) * 1.015 + 2
      || Math.abs(a.origin[1] - b.origin[1]) * 3.1 >= (a.envelope.ry + b.envelope.ry) * 1.015 + 2,
    'Colony envelopes retain their gaps, including reserved sway');
  }
  assert.ok(habitat.length >= (compact ? 95 : 280), 'A safe terrain pass must retain a full habitat');
  const fragments = reefRockFragments(habitat, compact), boxes = fragments.map(bounds);
  assert.ok(fragments.length >= (compact ? 4 : 18), 'Keep the visible outcrops and their smaller fragments');
  assert.ok(fragments.reduce((sum, rock) => sum + rock.faces.length, 0) <= (compact ? 1800 : 9000),
    'Local fragments have a separate bounded triangle budget');
  for (const [index, fragment] of fragments.entries()) {
    const ringSize = (fragment.vertices.length - 2) / 8, fragmentEdges = new Map();
    assert.ok(fragment.vertices.flat().every(Number.isFinite), 'Finite limestone geometry');
    assert.ok(fragment.normals.every(n => n.every(Number.isFinite) && Math.abs(Math.hypot(...n) - 1) < 1e-8),
      'Limestone faces have finite unit normals');
    for (const point of fragment.vertices.slice(0, ringSize)) assert.ok(
      point[2] < reefFloorHeight(point[0], point[1] / 3.1, compact) - 2.9,
      'The entire lower rock rim is embedded, leaving no floating lower edge');
    for (const point of fragment.vertices.slice(ringSize * 4, -2)) assert.ok(
      point[2] > reefFloorHeight(point[0], point[1] / 3.1, compact), 'Exposed rock caps clear the floor');
    for (const face of fragment.faces) for (let i = 0; i < 3; i++) {
      const a = face[i], b = face[(i + 1) % 3], edge = `${Math.min(a, b)}:${Math.max(a, b)}`;
      const directions = fragmentEdges.get(edge) || [];
      directions.push(a < b ? 1 : -1); fragmentEdges.set(edge, directions);
    }
    for (const directions of fragmentEdges.values()) assert.ok(directions.length === 2
      && directions[0] + directions[1] === 0, 'Each fragment is closed with consistently wound faces');
    for (const colony of habitat) {
      const planted = [[colony.origin[0] - colony.envelope.rx, colony.origin[0] + colony.envelope.rx],
        [colony.origin[1] * 3.1 - colony.envelope.ry, colony.origin[1] * 3.1 + colony.envelope.ry]];
      assert.ok(separation(boxes[index].slice(0, 2), planted) > 4, 'Rock clears planted and swaying colony envelopes');
    }
    for (let other = index + 1; other < fragments.length; other++) assert.ok(
      separation(boxes[index].slice(0, 2), boxes[other].slice(0, 2)) > 3, 'Separate fragments do not intersect');
  }
  // These slabs are separate meshes, so a floor-height-only animal check misses them.
  // Sample complete animated meshes on the same hour-long routes as the fish checks.
  let minimumActorGap = Infinity;
  for (let time = 0; time <= 3600; time += 2) {
    const actors = [0, 1, 2, 3].map(index => movingFish(time, index, compact));
    actors.push(movingTurtle(time, compact, 0), movingTurtle(time, compact, 1));
    for (const actor of actors.map(bounds)) for (const rock of boxes) {
      const gap = separation(actor, rock);
      minimumActorGap = Math.min(minimumActorGap, gap);
      assert.ok(gap > 8, `The complete animal clears separate limestone bounds at ${time}s`);
    }
  }
  console.log(`${compact ? 'Phone' : 'Desktop'}: ${triangles} watertight terrain triangles, ${colonies.length} rooted colonies, ${fragments.length} embedded fragments; sampled animal-to-rock clearance ${minimumActorGap.toFixed(1)} world units.`);
}
console.log('Terrain checks passed: exact heights, closed rocks, embedded roots, separated colonies and sampled animal clearances.');
