import assert from 'node:assert/strict';
import test from 'node:test';
import { depthGaugeState } from '../src/scripts/depth-gauge.mjs';

const state = overrides => depthGaugeState({ scroll:0, maxScroll:1200, buildingTop:0, enhanced:true, width:1440, reduced:false, dark:false, ...overrides });

test('depth tracks the whole document and remains bounded at both ends', () => {
  assert.equal(state({ scroll:-100 }).label, '−000 M');
  assert.equal(state({ scroll:600 }).label, '−060 M');
  assert.equal(state({ scroll:1200 }).label, '−120 M');
  assert.equal(state({ scroll:1400 }).marker, 'translate3d(0,104.00px,0)');
  assert.equal(state({ maxScroll:0 }).label, '−000 M');
});

test('the gauge starts at the building and stays hidden on phones or with reduced motion', () => {
  assert.equal(state({ buildingTop:1 }).hidden, true);
  assert.equal(state({ enhanced:false }).hidden, true);
  assert.equal(state({ width:759 }).hidden, true);
  assert.equal(state({ reduced:true }).hidden, true);
  assert.equal(state({ width:760, buildingTop:-2000 }).hidden, false);
});

test('the marker uses readable ink over paper and paper over deep water', () => {
  assert.equal(state({ dark:false }).color, '#111111');
  assert.equal(state({ dark:true }).color, '#F3F0E8');
});
