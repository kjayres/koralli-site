import { journalCurrent } from './journal-water.mjs?v=92669125fe89';
import { journalCoralContours } from './journal-coral-contours.mjs?v=92669125fe89';

// Font-space coordinates keep the roots inside the original letter strokes.
const colonies = {
  f: { x: 253, y: -711, blades: [
    { length: 650, width: 15, lean: -.18, seed: 4 },
    { length: 470, width: 12, lean: .34, seed: 6.5 }
  ] },
  end: { x: 253, y: -711, blades: [
    { length: 560, width: 14, lean: -.15, seed: 1.3 },
    { length: 430, width: 12, lean: .3, seed: 5.5 }
  ] }
};
const point = ([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`;
const coralPlacements = {
  r: { x: 126, y: -715, rootX: 136, rootY: 210, scaleX: 1.8, scaleY: 1.4, phase: .6 },
  w: { x: 60, y: -492, rootX: 154, rootY: 271, scaleX: 1.5, scaleY: 1.2, phase: 1.8 }
};

/** Rounded native coral contours bend above a fixed root buried in the glyph. */
export function journalCoralPath(kind, time = 0) {
  const pose = coralPlacements[kind];
  if (!pose) return '';
  const seconds = Number.isFinite(time) ? Math.max(0, time) : 0;
  const current = journalCurrent(seconds);
  return journalCoralContours[kind].map(([command, ...points]) => {
    const coordinates = [];
    for (let i = 0; i < points.length; i += 2) {
      const height = Math.max(0, Math.min(1, (pose.rootY - points[i + 1] - 24) / (pose.rootY - 24)));
      const bend = Math.pow(height, 1.6) * (current * 26 + 20 * Math.sin(seconds * .58 - height * 2 + pose.phase));
      coordinates.push((pose.x + (points[i] - pose.rootX) * pose.scaleX + bend).toFixed(2));
      coordinates.push((pose.y + (points[i + 1] - pose.rootY) * pose.scaleY).toFixed(2));
    }
    return command + coordinates.join(' ');
  }).join(' ');
}

/** Tapered ribbons bend along their length; their roots never rotate or slide. */
export function journalFrondPath(kind, time = 0) {
  const colony = colonies[kind];
  if (!colony) return '';
  const seconds = Number.isFinite(time) ? Math.max(0, time) : 0;
  const current = journalCurrent(seconds);
  return colony.blades.map((blade, index) => {
    const left = [], right = [], count = 48;
    let x = colony.x + (index - (colony.blades.length - 1) / 2) * 9;
    let y = colony.y;
    for (let i = 0; i <= count; i++) {
      const u = i / count;
      const angle = blade.lean + Math.pow(u, 1.25) * current * .7
        + u * .36 * Math.sin(seconds * .44 - u * 5.4 + blade.seed);
      if (i) { x += Math.sin(angle) * blade.length / count; y -= Math.cos(angle) * blade.length / count; }
      const fullness = Math.pow(Math.sin(Math.PI * u), .75);
      const twist = .72 + .28 * Math.cos(u * 5 - seconds * .19 + blade.seed);
      const radius = i === count ? 0 : (7 + blade.width * 1.45 * fullness * twist) * Math.pow(1 - u, .32);
      const nx = Math.cos(angle), ny = Math.sin(angle);
      left.push([x - nx * radius, y - ny * radius]);
      right.push([x + nx * radius, y + ny * radius]);
    }
    return `M${point(left[0])} ${left.slice(1).map(p => `L${point(p)}`).join(' ')} ${right.reverse().map(p => `L${point(p)}`).join(' ')} Z`;
  }).join(' ');
}

/** Use the marine canvas clock, including its offscreen and reduced-motion states. */
export function initJournalLettering(root = document) {
  const fronds = [...root.querySelectorAll('[data-journal-frond]')];
  const corals = [...root.querySelectorAll('[data-journal-coral]')];
  let previous;
  return (time = 0, { reducedMotion = false } = {}) => {
    const seconds = reducedMotion ? 0 : time;
    if (seconds === previous) return;
    previous = seconds;
    for (const frond of fronds) frond.setAttribute('d', journalFrondPath(frond.dataset.journalFrond, seconds));
    for (const coral of corals) coral.setAttribute('d', journalCoralPath(coral.dataset.journalCoral, seconds));
  };
}
