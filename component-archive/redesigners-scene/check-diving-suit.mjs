import assert from 'node:assert/strict';
import { divingSuitMesh, faceNormal, SUIT_JOINTS, yawed } from './diving-suit.mjs';

const { vertices, faces, materials, glass } = divingSuitMesh();
assert.equal(materials.length, faces.length, 'Every face has a material');
assert.ok(faces.length < 3000, 'Keep the suit within its triangle budget');

// Every part is a closed volume with consistent winding, so culling never opens a hole.
const edges = new Map();
for (const face of faces) {
  assert.equal(new Set(face).size, 3);
  for (let j = 0; j < 3; j++) {
    const a = face[j], b = face[(j + 1) % 3], key = `${Math.min(a, b)}:${Math.max(a, b)}`;
    const directions = edges.get(key) || [];
    directions.push(a < b ? 1 : -1);
    edges.set(key, directions);
  }
}
for (const directions of edges.values()) {
  assert.equal(directions.length, 2, 'Each part of the suit must be closed');
  assert.equal(directions[0] + directions[1], 0, 'Adjacent faces must wind consistently');
}

// The suit sits on the floor, never through it.
const lowest = Math.min(...vertices.map(v => v[2]));
assert.ok(lowest > -.05 && lowest < 1.5, `The suit rests on the floor (lowest point ${lowest.toFixed(2)})`);

// Faces point outwards: the hull's front faces the viewer.
const front = faces.filter((face, i) => materials[i] === 'coral').map(face => faceNormal(vertices, face));
assert.ok(front.some(n => n[1] < -.5), 'The coral band has faces turned towards the viewer');

// Glazing replaces hull faces, sharing its vertices and watertight edge topology.
assert.equal(glass.vertices, vertices, 'The cockpit is part of the hull');
assert.ok(glass.faces.length > 12, 'The cockpit has a broad viewing window');
assert.ok(glass.faces.every(face => materials[faces.indexOf(face)] === 'glass'));
const windowHeights = glass.faces.flat().map(i => vertices[i][2]);
assert.ok(Math.max(...windowHeights) < Math.max(...vertices.map(v => v[2])) - 3, 'Armour forms a brow above the window');
assert.ok(Math.min(...windowHeights) < SUIT_JOINTS.shoulder(1)[2], 'The cockpit extends down between the shoulders');
