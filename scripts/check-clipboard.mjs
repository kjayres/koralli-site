import assert from 'node:assert/strict';
import test from 'node:test';
import { clipboardPose, human3DMarkup, makeProjector } from '../src/scripts/art/thesis-cards.mjs';

const sub = (a, b) => a.map((value, i) => value - b[i]);
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const norm = point => Math.hypot(...point);
const near = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);

test('clipboard is a rigid rectangle whose paper faces up towards its reader', () => {
  for (const scale of [.7, 1.03, 1.2]) for (const heading of [0, Math.PI / 2, Math.PI, -2.2]) {
    const actor = { x: 106, y: 123, z: 2, scale, heading, lean: .5 };
    const board = clipboardPose(actor);
    const [a, b, c, d] = board.corners;
    const width = sub(b, a), height = sub(d, a);
    near(dot(width, height), 0);
    near(norm(width), norm(sub(c, d)));
    near(norm(height), norm(sub(c, b)));
    for (const corner of board.corners) near(dot(sub(corner, a), board.normal), 0);
    assert.ok(board.normal[2] > 0);
    const head = [actor.x, actor.y, actor.z + 40.8 * scale];
    assert.ok(dot(sub(head, board.centre), board.normal) > 0, 'The person sees the writing face, not the back of the board.');
    near(dot(sub(board.grip, board.centre), board.right), -norm(width) / 2);
    near(dot(sub(board.grip, a), board.normal), 0, 1e-8);
  }
});

test('pen stays on the paper and both hands stay within fixed arm reach for the whole loop', () => {
  const actor = { x: 106, y: 123, z: 0, scale: 1.03, heading: Math.PI, lean: .5 };
  for (let frame = 0; frame < 400; frame++) {
    const board = clipboardPose(actor, frame / 400);
    const tip = sub(board.tip, board.centre);
    assert.ok(Math.abs(dot(tip, board.normal)) < .1 * actor.scale);
    assert.ok(Math.abs(dot(tip, board.right)) < norm(sub(board.corners[1], board.corners[0])) / 2);
    assert.ok(Math.abs(dot(tip, board.along)) < norm(sub(board.corners[3], board.corners[0])) / 2);
    const pen = sub(board.penEnd, board.tip);
    near(dot(pen, board.right), 0);
    near(dot(pen, board.along), 0);
    assert.ok(dot(pen, board.normal) > 0);
    [board.grip, board.writingHand].forEach((hand, i) => {
      const side = i ? 1 : -1;
      const right = [Math.cos(actor.heading), -Math.sin(actor.heading)];
      const forward = [Math.sin(actor.heading), Math.cos(actor.heading)];
      const shoulder = [
        actor.x + (right[0] * side * 4.25 + forward[0] * actor.lean * .92) * actor.scale,
        actor.y + (right[1] * side * 4.25 + forward[1] * actor.lean * .92) * actor.scale,
        actor.z + 33.5 * actor.scale,
      ];
      assert.ok(norm(sub(hand, shoulder)) < 15.36 * actor.scale);
    });
  }
  const first = clipboardPose(actor, 0), last = clipboardPose(actor, 1);
  first.tip.forEach((value, i) => near(value, last.tip[i]));
  first.writingHand.forEach((value, i) => near(value, last.writingHand[i]));
});

test('opt-in service clipboard produces finite geometry', () => {
  const project = makeProjector();
  for (let frame = 0; frame < 32; frame++) {
    const markup = human3DMarkup(project, { id: 'observer', x: 106, y: 123, scale: 1.03, heading: Math.PI, lean: .5, holdingBoard: { phase: frame / 32 } });
    assert.doesNotMatch(markup, /NaN|Infinity|undefined/);
    assert.match(markup, /data-clipboard="writing"/);
    assert.match(markup, /data-clipboard-pen="true"/);
  }
});
