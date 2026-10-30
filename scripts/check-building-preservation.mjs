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
    assert.equal(building.buildingPhases.length, 3);
    assert.equal(building.buildingSectionCount, 4);
    for (const progress of progressSamples) {
      const current = buildingSnapshot(building, progress, reducedMotion, 'preservation-check');
      checkRoomContents(current);
    }
  });
}

function opening(markup, attribute, index) {
  return markup.match(new RegExp(`<g\\b[^>]*${attribute}="${index}"[^>]*>`))[0];
}

for (const reducedMotion of [false, true]) {
  test(`ground floor stays closed throughout ${reducedMotion ? 'reduced' : 'ordinary'} motion`, () => {
    for (const progress of progressSamples) {
      const markup = buildingSnapshot(building, progress, reducedMotion, 'closed-ground');
      const cover = opening(markup, 'data-cover', 3);
      assert.match(cover, /opacity="1"/);
      assert.match(cover, /data-world-lift="0"/);
      assert.match(cover, /data-world-turn="0"/);
      assert.match(opening(markup, 'data-floor', 3), /opacity="0"/);
      assert.match(markup, /viewBox="0 -160 700 860"/);
      if (progress >= .75) assert.match(opening(markup, 'data-floor', 2), /opacity="1"/);
    }
  });
}

test('three layers retain original quarter-based timing and hold the last room', () => {
  const stub = { dataset: {}, querySelectorAll: () => [], querySelector: () => null };
  for (const [progress, expected] of [[0,0],[.249,0],[.25,1],[.499,1],[.5,2],[.75,2],[1,2]]) {
    const result = building.updateBuilding(stub, progress);
    assert.equal(result.phase, expected);
    assert.ok(result.localProgress >= 0 && result.localProgress <= 1);
    if (progress >= .75) assert.equal(result.textOpacity, 1);
  }
});
