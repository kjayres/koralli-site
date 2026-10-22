// From src/scripts/art/thesis-cards.mjs, where it sat just before initThesisCards. It uses that
// file's helpers (human3DMarkup, bodyFrame, the vector helpers, number/pair/points and the colour
// constants), so paste it back into thesis-cards.mjs rather than importing it on its own.
// It also needs this import at the top of thesis-cards.mjs:
//
//   import { divingSuitMesh, faceNormal, yawed, SUIT_JOINTS } from './diving-suit.mjs';

// ============================================================================
// REDESIGNERS STAGE: "koralli is for the redesigners."
// Seen straight on, with the floor as a single line. A shallow-water fish is being given a
// deep-sea diving suit, the same suit that swims through Views from the Reef. The suit sits on
// the floor facing us, its hull a light mesh, while a researcher stands back with a clipboard
// scratching their head and a welder fuses the suit's shoulder.
// ============================================================================
// The suit is built from closed triangle meshes like the reef's animals and drawn the same way:
// each face filled barely lighter than the water, with a fine pale edge (see diving-suit.mjs).
const WATER_RGB = [12, 22, 48];
const PALE_RGB = [143, 165, 255];
const CORAL_RGB = [255, 102, 85];
const LAMP_RGB = [124, 224, 255];
const tint = (a, b, t) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
const SUIT_LIGHT = unit3([-0.32, -0.5, 0.8]);
const STAGE_FLOOR = 284;
const STAGE_STEPS = 160;   // frames in the eight-second loop
// The scene's frame, cropped to the people and the suit; the floor runs its full width.
const STAGE_VIEW = { x: 82, y: 103, w: 384, h: 187 };

// x runs across, z up and y into the scene.
function frontProjector({ originX, originY, scale, pitch }) {
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const project = (x, y, z = 0) => [number(originX + scale * x), number(originY - scale * (z * cp + y * sp))];
  project.sphereOutline = (centre, radius, samples = 18) => {
    const [cx, cy] = project(...centre);
    return Array.from({ length: samples }, (_, i) => [cx + radius * scale * Math.cos((TAU * i) / samples), cy + radius * scale * Math.sin((TAU * i) / samples)]);
  };
  project.depth = ([, y, z]) => -y * cp + z * sp;
  project.toward = [0, -cp, sp];
  project.scale = scale;
  return project;
}
// A level camera: everything on the floor stands on the one line, however near it is.
const stage = frontProjector({ originX: 330, originY: STAGE_FLOOR, scale: 3.8, pitch: 0 });

const DOME_CENTRE = yawed(SUIT_JOINTS.dome);
const WELD_SHOULDER = yawed(SUIT_JOINTS.shoulder(1));
const WELD = add3(WELD_SHOULDER, [4.4, -1.6, .8]);

function faceStyle(material, normal) {
  const light = Math.round(Math.abs(dot3(normal, SUIT_LIGHT)) * 24) / 24;
  const colour = material === 'coral' ? CORAL_RGB : material === 'lamp' ? LAMP_RGB : PALE_RGB;
  const fill = material === 'lamp' ? .16 : .016 + (1 - light) * .032;
  const edge = material === 'coral' ? .55 : material === 'lamp' ? .5 : material === 'fin' ? .4 : .46;
  return `fill="${tint(WATER_RGB, colour, fill)}" stroke="${tint(WATER_RGB, colour, edge)}"`;
}

let suitCache = null;

// The suit's faces sorted back to front, with the fish behind the inset glazing.
function suitLayers() {
  if (suitCache) return suitCache;
  const mesh = divingSuitMesh();
  const projected = mesh.vertices.map(v => stage(...v));
  const faces = [];
  mesh.faces.forEach((face, i) => {
    if (mesh.materials[i] === 'glass') return;
    const normal = faceNormal(mesh.vertices, face);
    if (dot3(normal, stage.toward) <= 0) return;
    const depth = face.reduce((sum, k) => sum + stage.depth(mesh.vertices[k]), 0) / 3;
    faces.push({ face, depth, style: faceStyle(mesh.materials[i], normal) });
  });
  faces.sort((a, b) => a.depth - b.depth);
  let floor = `<path d="M${STAGE_VIEW.x},${STAGE_FLOOR} H${STAGE_VIEW.x + STAGE_VIEW.w}" fill="none" stroke="url(#redesigners-floor)" stroke-width=".8"/>`;
  for (const [x, w] of [[0, 25], [-55, 8], [34, 8]]) {
    const [cx, cy] = stage(x, 0, 0);
    floor += `<ellipse cx="${cx}" cy="${number(cy + 1.2)}" rx="${number(w * stage.scale)}" ry="1.8" fill="${DEEP_SHADE}" fill-opacity=".55" stroke="none"/>`;
  }
  let body = '<g stroke-width=".34" stroke-linejoin="round">';
  for (const { face, style } of faces) body += `<path d="M${face.map(k => pair(projected[k])).join('L')}Z" ${style}/>`;
  body += '</g>';

  const glassPoints = mesh.glass.vertices.map(v => stage(...v));
  let front = '';
  for (const face of mesh.glass.faces) {
    const normal = faceNormal(mesh.glass.vertices, face);
    const d = `M${face.map(k => pair(glassPoints[k])).join('L')}Z`;
    if (dot3(normal, stage.toward) > 0) front += d;
  }
  const glassOutline = `M${hull(mesh.glass.faces.flat().map(k => glassPoints[k])).map(pair).join('L')}Z`;
  const glassBack = `<path d="${glassOutline}" fill="${tint(WATER_RGB, PALE_RGB, .035)}" stroke="none"/>`;
  const glassFront = `<path d="${front}" fill="none" stroke="${tint(WATER_RGB, PALE_RGB, .22)}" stroke-width=".28"/>`
    + `<path d="${glassOutline}" fill="none" stroke="${tint(WATER_RGB, PALE_RGB, .65)}" stroke-width=".8"/>`;
  suitCache = { floor, body, glassBack, glassFront, glassOutline };
  return suitCache;
}

const windowed = (t, from, to, edge = 0.025) => smooth((t - from) / edge) * (1 - smooth((t - to) / edge));
// The welder works in two bursts, lifting the torch between them.
const weldPower = phase => Math.max(windowed(phase, 0, 0.38), windowed(phase, 0.5, 0.84));
// The seam glows while the torch is on and cools after it lifts.
const seamHeat = phase => Math.max(...Array.from({ length: 8 }, (_, i) => weldPower((phase - i * 0.012 + 1) % 1) * (1 - i * 0.11)));

// Inside the cockpit: the water line, rising bubbles, and the coral fish drawn as a wire mesh
// like the lanternfish in Views from the Reef, swimming from side to side.
function domeInsideMarkup(phase) {
  const [dcx, dcy] = stage(...DOME_CENTRE);
  const r = SUIT_JOINTS.domeRadius * stage.scale;
  const waterY = dcy - r * .58, half = Math.sqrt(r * r - (r * .58) ** 2) * .97;
  const surface = Array.from({ length: 13 }, (_, i) => {
    const u = i / 12;
    return [dcx - half + 2 * half * u, waterY + Math.sin(phase * TAU * 2 + u * 3.4) * .8];
  });
  let d = `<path d="M${surface.map(pair).join(' L')}" fill="none" stroke="${AQUA}" stroke-width=".45" stroke-opacity=".4"/>`;
  for (let b = 0; b < 3; b++) {
    const u = (phase * 2 + b / 3) % 1;
    const bx = dcx + (b - 1) * r * .4 + Math.sin(u * TAU + b) * 2;
    d += `<circle cx="${number(bx)}" cy="${number(lerp(dcy + r * .7, waterY + 3, u))}" r="${number(1 + (1 - u) * .5)}" fill="none" stroke="${AQUA}" stroke-width=".4" stroke-opacity="${number(.45 - u * .3)}"/>`;
  }

  const swim = phase * TAU * 2;
  const fx = dcx + Math.sin(swim) * r * .34, fy = dcy + r * .14 + Math.sin(swim * 2) * r * .07;
  const dir = Math.cos(swim) >= 0 ? 1 : -1;
  // Turning at each side of the dome, the fish narrows but never vanishes edge-on.
  const turn = .38 + .62 * Math.min(1, Math.abs(Math.cos(swim)) * 3.5);
  const wag = Math.sin(phase * TAU * 14) * 1.8, k = 1.5;
  const at = (u, v) => [fx + dir * turn * u * k, fy + v * k];
  const height = u => 4.8 * Math.sqrt(Math.max(0, 1 - ((u - .6) / 8.2) ** 2));
  const stations = [7.4, 5, 2.4, 0, -2.4, -4.8, -6.6];
  const top = stations.map(u => at(u, -height(u))), bottom = stations.map(u => at(u, height(u)));
  const tail = [at(-6.6, -height(-6.6)), at(-10.6, -4.4 + wag), at(-9, wag * .5), at(-10.6, 4.4 + wag), at(-6.6, height(-6.6))];
  const outline = `M${pair(at(8.8, 0))} L${top.map(pair).join(' L')} L${tail.map(pair).join(' L')} L${bottom.slice().reverse().map(pair).join(' L')} Z`;
  d += `<path d="${outline}" fill="${CORAL}" fill-opacity=".08" stroke="${CORAL}" stroke-width=".6" stroke-opacity=".85" stroke-linejoin="round"/>`;
  let mesh = '';
  for (const u of stations.slice(1, -1)) mesh += `M${pair(at(u, -height(u)))} Q${pair(at(u + 1.1, 0))} ${pair(at(u, height(u)))}`;
  for (const v of [-.5, .5]) mesh += `M${stations.map(u => pair(at(u, height(u) * v))).join(' L')}`;
  for (const v of [-.6, -.2, .2, .6]) mesh += `M${pair(at(-6.6, height(-6.6) * v))} L${pair(at(-9.8, v * 4.4 + wag * .8))}`;
  d += `<path d="${mesh}" fill="none" stroke="${CORAL}" stroke-width=".38" stroke-opacity=".55"/>`;
  const [ex, ey] = at(5.6, -1.2);
  d += `<circle cx="${number(ex)}" cy="${number(ey)}" r=".9" fill="${PAPER}" fill-opacity=".85" stroke="none"/>`;
  return d;
}

function seamMarkup(phase) {
  const heat = seamHeat(phase), power = weldPower(phase);
  const [cx, cy] = stage(...WELD_SHOULDER), r = 4.9 * stage.scale;
  const glow = mix3([255, 102, 85], [255, 209, 102], heat).map(Math.round);
  let out = `<path d="M${pair([cx + r * Math.cos(-1.15), cy + r * Math.sin(-1.15)])} A${number(r)},${number(r)} 0 0 1 ${pair([cx + r * Math.cos(1.0), cy + r * Math.sin(1.0)])}" fill="none" stroke="rgb(${glow.join(',')})" stroke-width="${number(0.7 + heat * 0.7)}" stroke-opacity="${number(0.25 + heat * 0.55)}" stroke-linecap="round"/>`;
  if (power > 0.02) {
    const [wx, wy] = stage(...WELD);
    const flicker = 0.8 + 0.2 * Math.sin(phase * TAU * 40);
    out += `<circle cx="${wx}" cy="${wy}" r="${number(18 * (0.7 + 0.3 * flicker))}" fill="url(#redesigners-glow)" opacity="${number(0.75 * power * flicker)}" stroke="none"/>`;
  }
  return out;
}

// The researcher's free hand goes up to scratch their head, then back down to the clipboard.
const CLIPBOARD_KEYS = [[0, 'head'], [0.36, 'head'], [0.44, 'board'], [0.9, 'board'], [0.98, 'head'], [1, 'head']];

function researcherMarkup(phase) {
  const x = -55, y = 0, heading = Math.PI / 2 + 0.95;
  const frame = bodyFrame(x, y, heading);
  const scratch = Math.sin(phase * TAU * 18);
  const tap = Math.max(0, Math.sin(phase * TAU * 10));
  const poses = {
    head: frame.local(1.8 + scratch * 0.5, 0.2, 44.4 + Math.abs(scratch) * 0.6),
    board: frame.local(-0.4, 6.6, 27.6 + tap * 0.9),
  };
  const leans = { head: 0.3, board: 0.75 };
  let i = 0;
  while (CLIPBOARD_KEYS[i + 1][0] < phase) i++;
  const [t0, from] = CLIPBOARD_KEYS[i], [t1, to] = CLIPBOARD_KEYS[i + 1];
  const t = smooth((phase - t0) / Math.max(1e-6, t1 - t0));
  return human3DMarkup(stage, {
    id: 'redesigner-clipboard',
    x, y,
    scale: 1,
    heading: heading + 0.06 * Math.sin(phase * TAU),
    lean: lerp(leans[from], leans[to], t),
    color: CORAL,
    fillPaper: DEEP_BG,
    shadowColor: 'none',
    leftTarget: frame.local(-2.6, 6.2, 26.4),
    rightTarget: mix3(poses[from], poses[to], t),
    holdingBoard: true,
  });
}

function welderMarkup(phase) {
  const power = weldPower(phase);
  const x = 30, y = -8, heading = -(Math.PI / 2 + 0.35);
  const frame = bodyFrame(x, y, heading);
  const sway = Math.sin(phase * TAU * 4) * 0.4 * power;
  // Between bursts the torch lifts away from the seam.
  const target = add3(WELD, [3.2 * (1 - power), -1 * (1 - power), 3.4 * (1 - power)]);
  return human3DMarkup(stage, {
    id: 'redesigner-welder',
    x, y,
    scale: 1,
    heading,
    lean: 0.75 + 0.35 * power,
    color: CORAL,
    fillPaper: DEEP_BG,
    shadowColor: 'none',
    welderMask: true,
    leftTarget: frame.local(-1.4, 6.6, 29.6 + sway),
    rightTarget: frame.local(1.4, 6.6, 29.6 + sway),
    blowtorchTarget: target,
    sparkPhase: phase * 6,
    torchPower: power,
  });
}

const redesignersFrames = new Map();

function redesignersMarkup(step) {
  if (redesignersFrames.has(step)) return redesignersFrames.get(step);
  const phase = step / STAGE_STEPS;
  const out = { inside: domeInsideMarkup(phase), front: researcherMarkup(phase) + seamMarkup(phase) + welderMarkup(phase) };
  redesignersFrames.set(step, out);
  return out;
}

export function initRedesigners(stageElement) {
  const svg = stageElement?.querySelector('[data-redesigners-svg]');
  if (!svg) return () => {};

  const defs = '<defs>'
    + `<linearGradient id="redesigners-floor" x1="0" x2="1"><stop offset="0" stop-color="${DEEP_LINE}" stop-opacity="0"/><stop offset=".14" stop-color="${DEEP_LINE}" stop-opacity=".55"/><stop offset=".86" stop-color="${DEEP_LINE}" stop-opacity=".55"/><stop offset="1" stop-color="${DEEP_LINE}" stop-opacity="0"/></linearGradient>`
    + `<radialGradient id="redesigners-glow"><stop offset="0" stop-color="${SPARK}" stop-opacity=".5"/><stop offset=".45" stop-color="${CORAL}" stop-opacity=".14"/><stop offset="1" stop-color="${CORAL}" stop-opacity="0"/></radialGradient>`
    + '</defs>';
  svg.setAttribute('viewBox', `${STAGE_VIEW.x} ${STAGE_VIEW.y} ${STAGE_VIEW.w} ${STAGE_VIEW.h}`);
  svg.setAttribute('preserveAspectRatio', 'xMinYMax meet');
  stageElement.style.setProperty('--stage-ratio', `${STAGE_VIEW.w} / ${STAGE_VIEW.h}`);
  const suit = suitLayers();
  svg.innerHTML = `${defs}<defs><clipPath id="redesigners-cockpit"><path d="${suit.glassOutline}"/></clipPath></defs><g stroke="${DEEP_LINE}" stroke-width=".9" stroke-linejoin="round" stroke-linecap="round">${suit.floor}${suit.body}${suit.glassBack}<g data-redesigners-inside clip-path="url(#redesigners-cockpit)"></g>${suit.glassFront}<g data-redesigners-dynamic></g></g>`;
  const inside = svg.querySelector('[data-redesigners-inside]');
  const dynamic = svg.querySelector('[data-redesigners-dynamic]');
  let lastStep = -1;

  const render = (timeSeconds = 0, reducedMotion = false) => {
    const step = reducedMotion ? 22 : Math.floor((((timeSeconds / 8) % 1) + 1) % 1 * STAGE_STEPS);
    if (step !== lastStep) {
      lastStep = step;
      const frame = redesignersMarkup(step);
      inside.innerHTML = frame.inside;
      dynamic.innerHTML = frame.front;
    }
  };
  render(0, false);
  return render;
}

