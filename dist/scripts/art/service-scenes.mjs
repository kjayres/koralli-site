import { makeProjector, isoPrimitives, human3DMarkup, robotMarkup, PAPER, SHADE, GLASS, BLUE, CORAL } from './thesis-cards.mjs?v=e5f138a7668b';

const TAU = Math.PI * 2;
const clamp = n => Math.max(0, Math.min(1, n));
const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const key = (t, frames) => {
  for (let i = 1; i < frames.length; i++) {
    const [a, x] = frames[i - 1], [b, y] = frames[i];
    if (t <= b) return mix(x, y, smooth((t - a) / (b - a)));
  }
  return frames.at(-1)[1];
};
// The same camera as the homepage relay, framed a little closer for three cards.
const p = makeProjector({ originX: 280, originY: 218, centerX: 100, centerY: 83, angle: -14, scale: 1.9, pitch: .43 });
const iso = isoPrimitives(p);
const { box, surface, panelX, panelY, planLine, line, ruledNote } = iso;
const group = body => `<g stroke="${BLUE}" stroke-width=".9" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;
const floor = () => box(20, 30, 165, 106, 2, PAPER, PAPER, SHADE, -2, 'stroke-opacity=".5"');
const table = (x, y, w, d, h = 23) => {
  let s = '';
  for (const lx of [x + 2, x + w - 4]) for (const ly of [y + 2, y + d - 4]) s += box(lx, ly, 2, 2, h - 2);
  return s + box(x, y, w, d, 2, PAPER, PAPER, SHADE, h - 2);
};
const check = (x, y, z, opacity = 1) => planLine([[x, y, z], [x + 2, y, z - 2], [x + 6, y, z + 4]], `stroke="${CORAL}" stroke-width="1.5" opacity="${opacity.toFixed(3)}"`);
const token = (x, y, z) => box(x - 7, y - 5, 14, 10, 5, GLASS, PAPER, SHADE, z) + surface(x - 4, y - 3, 8, 6, z + 5.1, BLUE, 'stroke="none" fill-opacity=".18"');
const SPLIT = '<!--service-hands-->';
const splitFigure = markup => {
  const [back, front] = markup.split(SPLIT);
  return [back + '</g>', '<g>' + front];
};

const workPath = [[0, 96], [.18, 96], [.42, 118], [.7, 118], [.9, 96], [1, 96]];
const coursePath = [[0, 48], [.28, 91], [.42, 91], [.63, 139], [.7, 139], [.93, 48], [1, 48]];
const turningStep = (t, turns) => turns.reduce((step, [start, end]) => step + (t > start && t < end ? Math.sin((t - start) / (end - start) * TAU) * .55 : 0), 0);
function strideAt(t, frames, distance, period = 7) {
  let speed = 0;
  for (let i = 1; i < frames.length; i++) {
    const [a, x] = frames[i - 1], [b, y] = frames[i];
    if (t <= b) {
      const u = clamp((t - a) / (b - a));
      speed = Math.abs(y - x) * 6 * u * (1 - u) / (b - a);
      break;
    }
  }
  return Math.sin(distance * TAU / period) * clamp(speed / 60) || 0;
}

// Export the physical state as well as the renderer, so tests can check loops,
// foot motion, the gate clearance and reachable hand targets independently.
export function servicePose(index, phase) {
  const t = ((phase % 1) + 1) % 1;
  if (index === 0) {
    const x = key(t, workPath);
    const lift = key(t, [[0, 0], [.12, 3], [.42, 3], [.5, 0], [.58, 3], [.88, 3], [1, 0]]);
    const heading = key(t, [[0, -Math.PI / 2], [.08, -Math.PI / 2], [.18, Math.PI / 2], [.58, Math.PI / 2], [.7, -Math.PI / 2], [1, -Math.PI / 2]]);
    return { x, heading, stride: strideAt(t, workPath, x) + turningStep(t, [[.08, .18], [.58, .7]]), token: [x + Math.sin(heading) * 10, 84 + Math.cos(heading) * 10, 23 + lift], point: [74, 81 + Math.sin(t * TAU), 24] };
  }
  if (index === 1) {
    return { wipe: [115 + 5 * Math.sin(t * TAU), 118, 34 + 4 * Math.sin(t * TAU * 2)], work: [83 + 2 * Math.sin(t * TAU), 86, 22] };
  }
  const x = key(t, coursePath);
  return {
    x, stride: strideAt(t, coursePath, x) + turningStep(t, [[.63, .7], [.93, 1]]),
    heading: key(t, [[0, Math.PI / 2], [.63, Math.PI / 2], [.7, -Math.PI / 2], [.93, -Math.PI / 2], [1, Math.PI / 2]]),
    gate: key(t, [[0, 0], [.32, 0], [.42, 1], [.86, 1], [.96, 0], [1, 0]]),
    signal: key(t, [[0, 0], [.29, 0], [.35, 1], [.43, 1], [.51, 0], [1, 0]]),
    writing: Math.sin(t * TAU * 5) * .65,
  };
}

function workflow(t) {
  const state = servicePose(0, t);
  let s = floor();
  s += planLine([[37, 112, .1], [37, 47, .1], [161, 47, .1], [161, 112, .1]], 'stroke-opacity=".2" stroke-dasharray="3 5"');
  // Direction and a plan at the first station.
  s += box(46, 48, 24, 2, 25, PAPER, PAPER, SHADE);
  s += planLine([[50, 50.1, 6], [50, 50.1, 18], [57, 50.1, 18], [57, 50.1, 11], [65, 50.1, 11]], `stroke="${CORAL}" stroke-width="1.3"`);
  const planner = human3DMarkup(p, { id: 'service-planner', x: 62, y: 84, scale: 1.03, heading: Math.PI / 2, lean: .6, leftTarget: [73, 88, 24], rightTarget: state.point, held: SPLIT });
  const robot = robotMarkup(p, { x: state.x, y: 84, scale: 1, heading: state.heading, stride: state.stride, target: [state.token[0], state.token[1], state.token[2] + 2.5], held: SPLIT });
  const [plannerBack, plannerFront] = splitFigure(planner);
  // Robots have no enclosing group of their own, unlike the people.
  const [robotBack, robotFront] = robot.split(SPLIT);
  s += plannerBack + robotBack + table(70, 73, 19, 23) + table(124, 73, 25, 23);
  s += ruledNote(72, 80, 13, 11, 23.1, CORAL, true);
  s += surface(130, 75, 17, 17, 23.1, GLASS, 'fill-opacity=".35" stroke-opacity=".5"');
  s += token(...state.token) + robotFront + plannerFront;
  s += human3DMarkup(p, { id: 'service-reviewer', x: 140, y: 109, scale: 1.03, heading: Math.PI, holdingBoard: true, leftTarget: [143, 101, 25], rightTarget: [138, 97 + Math.sin(t * TAU) * 1.5, 27], lean: .4 });
  s += check(141, 75, 33, .45 + .55 * (1 - Math.abs(state.x - 118) / 22));
  return s;
}

function transparency(t) {
  const state = servicePose(1, t);
  let s = floor();
  // Thin framed glass, not a solid building. The process remains visible inside.
  s += panelX(45, 42, 0, 110, 58, GLASS, 'fill-opacity=".16" stroke-opacity=".55"');
  s += panelY(45, 42, 0, 76, 58, GLASS, 'fill-opacity=".12" stroke-opacity=".55"');
  s += surface(45, 42, 110, 76, 58, GLASS, 'fill-opacity=".1" stroke-opacity=".45"');
  for (const x of [45, 100, 155]) s += planLine([[x, 42, 0], [x, 42, 58], [x, 118, 58]], 'stroke-opacity=".5"');
  const worker = human3DMarkup(p, { id: 'service-analyst', x: 81, y: 74, scale: .98, heading: 0, lean: .7, leftTarget: [78, 85, 23], rightTarget: state.work, held: SPLIT });
  const [workerBack, workerFront] = splitFigure(worker);
  const machine = robotMarkup(p, { x: 125, y: 73, scale: .96, heading: 0, target: [125 + 2 * Math.sin(t * TAU + 1), 86, 24], held: SPLIT });
  const [machineBack, machineFront] = machine.split(SPLIT);
  s += workerBack + machineBack + table(64, 82, 77, 17, 21);
  for (const x of [69, 98, 125]) s += ruledNote(x, 85, 11, 9, 21.1, x === 69 ? CORAL : BLUE, true);
  s += planLine([[81, 90, 21.2], [97, 90, 21.2]], 'stroke-opacity=".5"');
  s += planLine([[110, 90, 21.2], [124, 90, 21.2]], 'stroke-opacity=".5"');
  s += machineFront + workerFront;
  s += human3DMarkup(p, { id: 'service-glass-worker', x: 111, y: 108, scale: 1, heading: 0, rightTarget: state.wipe, leftTarget: [106, 112, 23], lean: .4 });
  s += panelY(155, 42, 0, 76, 58, GLASS, 'fill-opacity=".09" stroke-opacity=".6"');
  s += panelX(45, 118, 0, 110, 58, GLASS, 'fill-opacity=".07" stroke-opacity=".65"');
  // A soft reflection clears around the cloth. Both share the same world-space
  // contact point and the cloth stays exactly on the inside face of the pane.
  const [wx, wy, wz] = state.wipe;
  const corners = [[wx - 15, wy, wz - 11], [wx + 15, wy, wz - 11], [wx + 15, wy, wz + 11], [wx - 15, wy, wz + 11]].map(pt => p(...pt));
  s += iso.polygon(corners, PAPER, 'fill-opacity=".22" stroke="none"');
  for (const x of [56, 64, 135, 143]) s += planLine([[x, 118.1, 16], [x + 7, 118.1, 40]], 'stroke-opacity=".19" stroke-width="1.6"');
  s += panelX(wx - 2.4, wy + .05, wz - 2.1, 4.8, 4.2, PAPER, `stroke="${CORAL}" stroke-width="1.1"`);
  s += planLine([[45, 118, 58], [45, 118, 0], [155, 118, 0], [155, 118, 58]], 'stroke-opacity=".7"');
  return s;
}

function governance(t) {
  const state = servicePose(2, t);
  let s = floor();
  // Other test stations give the beam a course, with clear boundaries and a gate.
  for (let i = 0; i < 3; i++) s += box(38 + i * 22, 41, 14, 12, 3 + i * 2, PAPER, PAPER, SHADE, 0, 'stroke-opacity=".55"');
  s += planLine([[112, 43, .2], [144, 43, .2], [144, 57, .2]], 'stroke-opacity=".3" stroke-dasharray="3 4"');
  s += box(35, 65, 114, 14, 6, PAPER, PAPER, SHADE);
  s += surface(37, 69, 110, 6, 6.1, GLASS, 'fill-opacity=".5" stroke="none"');
  for (const x of [45, 76, 119, 143]) s += planLine([[x, 65, 6], [x, 65, 19]], 'stroke-opacity=".42"');
  s += planLine([[45, 65, 19], [143, 65, 19]], 'stroke-opacity=".42"');
  s += box(106, 59, 3, 4, 28, PAPER, PAPER, SHADE);
  const angle = state.gate * Math.PI * .48;
  s += planLine([[107.5, 61, 28], [107.5, 61 + 28 * Math.cos(angle), 28 + 28 * Math.sin(angle)]], `stroke="${CORAL}" stroke-width="3"`);
  s += robotMarkup(p, { x: state.x, y: 72, z: 6, scale: .96, heading: state.heading, stride: state.stride, target: [state.x + Math.sin(state.heading) * 9, 72 + Math.cos(state.heading) * 9, 28] });
  s += robotMarkup(p, { x: 39, y: 109, scale: .86, heading: Math.PI / 2, target: [45, 107, 19] });
  const note = [110 + state.writing, 103, 26];
  const raised = [109, 99, 38];
  const hand = note.map((v, i) => mix(v, raised[i], state.signal));
  s += human3DMarkup(p, { id: 'service-observer', x: 108, y: 111, scale: 1.04, heading: Math.PI, holdingBoard: true, leftTarget: [112, 104, 26], rightTarget: hand, lean: .5 });
  // The pencil follows the writing hand, including when the observer signals.
  s += line(p(...hand), p(hand[0] - 1.3, hand[1] - .5, hand[2] - 2), `stroke="${CORAL}" stroke-width="1"`);
  s += check(151, 86, 10, state.gate * .85);
  return s;
}

const scenes = [workflow, transparency, governance];
export function serviceSceneMarkup(index, phase = .2) {
  return group(scenes[index](((phase % 1) + 1) % 1));
}
export function serviceArtwork(index) {
  return `<svg viewBox="0 0 560 330" fill="none" aria-hidden="true" focusable="false" data-service-scene="${index}">${serviceSceneMarkup(index, .2)}</svg>`;
}
