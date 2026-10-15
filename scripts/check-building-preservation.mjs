import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import * as building from '../src/scripts/art/building.mjs';
import * as baseline from '../archive/2026-10-15-building-before-interior-redesign/src/scripts/art/building.mjs';
import {buildingSnapshot} from './export-building.mjs';

// The redesign is confined to room contents and copy. Its retained exterior
// and movement are compared with the independently archived original.
const source = readFileSync(new URL('../src/scripts/art/building.mjs', import.meta.url), 'utf8');
const original = readFileSync(new URL('../archive/2026-10-15-building-before-interior-redesign/src/scripts/art/building.mjs', import.meta.url), 'utf8');
const progressSamples = [...new Set(Array.from({length: 4}, (_, floor) =>
  [0, .03, .23, .36, .52, .75, .88, .94, 1].map(local => (floor + local) / 4)
).flat())];

function group(markup, attribute, index) {
  const opening = new RegExp(`<g\\b[^>]*\\b${attribute}="${index}"[^>]*>`).exec(markup);
  assert.ok(opening, `Missing ${attribute}=${index}`);
  const tags = /<\/?g\b[^>]*>/g;
  tags.lastIndex = opening.index;
  let depth = 0;
  for (let match; (match = tags.exec(markup));) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return markup.slice(opening.index, tags.lastIndex);
  }
  assert.fail(`Unclosed ${attribute}=${index} group`);
}

function worldOpening(markup) {
  const opening = /<g\b[^>]*\bdata-building-world=""[^>]*>/.exec(markup);
  assert.ok(opening, 'Missing building world');
  return opening[0];
}

function checkRoomContents(markup) {
  assert.equal((markup.match(/\bdata-floor="[0-9]+"/g) || []).length, 4, 'Keep four rooms');
  assert.equal((markup.match(/\bdata-cover="[0-9]+"/g) || []).length, 4, 'Keep four exterior slices');
  const people = [...markup.matchAll(/\bdata-figure="([^"]+)"/g)].map(match => match[1]);
  assert.ok(people.length > 0, 'The building should contain people');
  assert.ok(people.every(kind => kind === 'man' || kind === 'woman'), 'Only human figures should be instantiated');
  assert.doesNotMatch(markup, /<use\b[^>]*\bhref="[^"]*robot[^"<>]*"/, 'Do not instantiate archived robot vectors');

  // Numeric tokens in SVG geometry may include exponential notation. Check
  // both non-finite spellings and overflow without rejecting path commands.
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

test('building exterior and lift/rotation implementation are preserved byte for byte', () => {
  const exterior = text => text.slice(text.indexOf('function cover('), text.indexOf('export function buildingMarkup('));
  const animation = text => text.slice(text.indexOf('const clamp='));
  assert.ok(exterior(original).length > 0 && animation(original).length > 0);
  assert.equal(exterior(source), exterior(original), 'Do not change the preserved facade');
  assert.equal(animation(source), animation(original), 'Do not change the preserved lift/rotation animation');
});

for (const reducedMotion of [false, true]) {
  test(`building preserves exterior poses with ${reducedMotion ? 'reduced' : 'ordinary'} motion`, () => {
    assert.equal(building.buildingPhases.length, 4);
    for (const progress of progressSamples) {
      const current = buildingSnapshot(building, progress, reducedMotion, 'preservation-check');
      const previous = buildingSnapshot(baseline, progress, reducedMotion, 'preservation-check');
      for (let floor = 0; floor < 4; floor++) {
        assert.equal(group(current, 'data-cover', floor), group(previous, 'data-cover', floor),
          `Exterior ${floor} differs at progress ${progress}`);
      }
      assert.equal(worldOpening(current), worldOpening(previous), `World transform differs at progress ${progress}`);
      checkRoomContents(current);
    }
  });
}
