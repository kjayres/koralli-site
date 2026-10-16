import assert from 'node:assert/strict';
import test from 'node:test';
import * as building from '../src/scripts/art/building.mjs';
import {buildingSnapshot} from './export-building.mjs';

const progressSamples = [...new Set(Array.from({length: 4}, (_, floor) =>
  [0, .03, .23, .36, .52, .75, .88, .94, 1].map(local => (floor + local) / 4)
).flat())];

function checkRoomContents(markup) {
  assert.equal((markup.match(/\bdata-floor="[0-9]+"/g) || []).length, 4, 'Keep four rooms');
  assert.equal((markup.match(/\bdata-cover="[0-9]+"/g) || []).length, 4, 'Keep four exterior slices');
  const people = [...markup.matchAll(/\bdata-figure="([^"]+)"/g)].map(match => match[1]);
  assert.ok(people.length > 0, 'The building should contain people');
  assert.ok(people.every(kind => kind === 'man' || kind === 'woman'), 'Only human figures should be instantiated');

  const geometry = /\b(?:x|y|x1|y1|x2|y2|cx|cy|r|rx|ry|width|height|viewBox|transform|points|d)="([^"]*)"/g;
  let attributes = 0;
  for (const [, value] of markup.matchAll(geometry)) {
    assert.doesNotMatch(value, /NaN|Infinity|undefined|null/, 'SVG geometry must contain finite coordinates');
    for (const [number] of value.matchAll(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/gi)) {
      assert.ok(Number.isFinite(Number(number)), `Non-finite coordinate: ${number}`);
    }
    attributes++;
  }
  assert.ok(attributes > 0, 'Expected SVG geometry to validate');
}

for (const reducedMotion of [false, true]) {
  test(`building renders valid poses with ${reducedMotion ? 'reduced' : 'ordinary'} motion`, () => {
    assert.equal(building.buildingPhases.length, 4);
    for (const progress of progressSamples) {
      const current = buildingSnapshot(building, progress, reducedMotion, 'preservation-check');
      checkRoomContents(current);
    }
  });
}
