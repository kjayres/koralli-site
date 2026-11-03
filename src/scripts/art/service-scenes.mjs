import { makeProjector, isoPrimitives, human3DMarkup, robotMarkup, PAPER, SHADE, GLASS, BLUE, CORAL } from './thesis-cards.mjs';
import { courseMarkup, coursePose } from './service-course.mjs';

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
const SPLIT = '<!--service-hands-->';
const splitFigure = markup => {
  const [back, front] = markup.split(SPLIT);
  return [back + '</g>', '<g>' + front];
};

const wipePath = [[0, 57], [.08, 57], [.45, 140], [.53, 140], [.9, 57], [1, 57]];
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
// foot motion and reachable hand targets independently.
export function servicePose(index, phase) {
  const t = ((phase % 1) + 1) % 1;
  if (index === 0) {
    const change = key(t, [[0, 0], [.17, 0], [.42, 1], [.78, 1], [1, 0]]);
    return { change, chip: [93, 73, 24 + 8 * (1 - change)] };
  }
  if (index === 1) {
    const x = key(t, wipePath);
    const heading = key(t, [[0, Math.PI / 2], [.45, Math.PI / 2], [.53, -Math.PI / 2], [.9, -Math.PI / 2], [1, Math.PI / 2]]);
    return { x, heading, stride: strideAt(t, wipePath, x) + turningStep(t, [[.45, .53], [.9, 1]]), wipe: [x + Math.sin(heading) * 3, 118, 33 + 6 * Math.sin(t * TAU * 5)], work: [83 + 2 * Math.sin(t * TAU), 86, 22], cleared: key(t, [[0, 0], [.08, 0], [.45, 1], [.88, 1], [1, 0]]) };
  }
  return coursePose(t);
}

function workflow(t) {
  const state = servicePose(0, t);
  let s = floor();
  const hand = side => [state.chip[0] + side * 4, state.chip[1], state.chip[2] + 3];
  const planner = human3DMarkup(p, { id: 'service-planner', x: 93, y: 59, scale: 1.03, heading: 0, lean: .8, leftTarget: hand(-1), rightTarget: hand(1), held: SPLIT });
  const robot = robotMarkup(p, { x: 123, y: 57, scale: 1, heading: 0, target: [123, 73, state.chip[2] + 3], held: SPLIT });
  const [plannerBack, plannerFront] = splitFigure(planner);
  const [robotBack, robotFront] = robot.split(SPLIT);
  s += plannerBack + robotBack + table(45, 64, 112, 37, 24);
  const oldRoute = [[57, 83], [70, 83], [70, 70], [88, 70], [88, 92], [121, 92], [121, 83], [146, 83]];
  const newRoute = [[57, 83], [70, 83], [70, 73], [88, 73], [100, 73], [121, 73], [130, 83], [146, 83]];
  s += planLine(oldRoute.map(v => [...v, 24.2]), `stroke="${CORAL}" stroke-width="1.65" opacity="${1 - state.change}"`);
  s += planLine(newRoute.map(v => [...v, 24.2]), `stroke="${BLUE}" stroke-width="1.65" opacity="${state.change}"`);
  for (const x of [57, 146]) {
    s += iso.polygon([[x - 4, 83, 24.4], [x, 79, 24.4], [x + 4, 83, 24.4], [x, 87, 24.4]].map(v => p(...v)), PAPER, `stroke="${CORAL}" stroke-width="1.5"`);
  }
  // Orange judgement points stay in the workflow as blue agent stations are fitted.
  for (const x of [93, 123]) {
    const z = state.chip[2];
    s += box(x - 6, 68, 12, 10, 6, GLASS, PAPER, SHADE, z, 'stroke-width="1.1"');
    s += panelX(x - 4, 78.05, z + 1.6, 8, 3, BLUE, 'stroke="none" fill-opacity=".8"');
    for (const ex of [x - 2.5, x + 1]) s += panelX(ex, 78.1, z + 2.4, 1.5, 1.1, PAPER, 'stroke="none"');
    s += planLine([[x, 73, z + 6], [x, 73, z + 8.5]], 'stroke-width="1"');
  }
  for (let i = 0; i < 3; i++) {
    const u = (t * 2 + i / 3) % 1, part = u * 7, j = Math.min(6, Math.floor(part)), a = part - j;
    const route = oldRoute.map((point, k) => point.map((v, axis) => mix(v, newRoute[k][axis], state.change)));
    const xy = route[j].map((v, axis) => mix(v, route[j + 1][axis], a));
    const [cx, cy] = p(...xy, 24.5);
    s += `<circle cx="${cx}" cy="${cy}" r="2.1" fill="${state.change > .5 ? BLUE : CORAL}" stroke="none" opacity="${smooth(u / .07) * smooth((1 - u) / .07)}"/>`;
  }
  s += robotFront + plannerFront;
  s += human3DMarkup(p, { id: 'service-reviewer', x: 150, y: 113, scale: 1.03, heading: Math.PI, holdingBoard: true, leftTarget: [153, 105, 25], rightTarget: [147, 102, 29 + Math.sin(t * TAU) * 1.5], lean: .4 });
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
  const [wx, wy, wz] = state.wipe;
  s += human3DMarkup(p, { id: 'service-glass-worker', x: state.x, y: 112, scale: 1, heading: state.heading, stride: state.stride, rightTarget: [wx + 1.4, wy, wz], leftTarget: [wx - 1.4, wy, wz], lean: .4 });
  s += panelY(155, 42, 0, 76, 58, GLASS, 'fill-opacity=".09" stroke-opacity=".6"');
  s += panelX(45, 118, 0, 110, 58, GLASS, 'fill-opacity=".07" stroke-opacity=".65"');
  // The cleaned strip follows the person across the glass and stays clear on
  // the return pass. Costs, work and outputs become visible in one process.
  s += `<defs><mask id="service-frost" maskUnits="userSpaceOnUse" x="0" y="0" width="560" height="330"><rect width="560" height="330" fill="white"/>${panelX(48, 118, 17, 104 * state.cleared, 30, '#000', 'stroke="none"')}</mask></defs>`;
  s += panelX(45, 118.03, 0, 110, 58, PAPER, 'fill-opacity=".68" stroke="none" mask="url(#service-frost)"');
  for (const x of [56, 64, 135, 143]) s += planLine([[x, 118.1, 16], [x + 7, 118.1, 40]], 'stroke-opacity=".19" stroke-width="1.6"');
  s += panelX(wx - 2.4, wy + .05, wz - 2.1, 4.8, 4.2, PAPER, `stroke="${CORAL}" stroke-width="1.1"`);
  for (const [x, text] of [[55, 'Cost'], [93, 'Work'], [128, 'Value']]) {
    const origin = p(x, 118.1, 51), dx = p(x + 1, 118.1, 51), dy = p(x, 118.1, 50);
    s += `<text transform="matrix(${dx[0] - origin[0]} ${dx[1] - origin[1]} ${dy[0] - origin[0]} ${dy[1] - origin[1]} ${origin[0]} ${origin[1]})" font-family="Instrument Sans, sans-serif" font-size="6.2" fill="${BLUE}" stroke="none">${text}</text>`;
  }
  s += planLine([[45, 118, 58], [45, 118, 0], [155, 118, 0], [155, 118, 58]], 'stroke-opacity=".7"');
  return s;
}


const scenes = [workflow, transparency, courseMarkup];
export function serviceSceneMarkup(index, phase = .2) {
  return group(scenes[index](((phase % 1) + 1) % 1));
}
export function serviceArtwork(index) {
  return `<svg viewBox="0 0 560 330" fill="none" aria-hidden="true" focusable="false" data-service-scene="${index}">${serviceSceneMarkup(index, .2)}</svg>`;
}
