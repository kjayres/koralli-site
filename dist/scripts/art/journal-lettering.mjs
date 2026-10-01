import { journalCurrent } from './journal-water.mjs';

// Font-space coordinates keep the roots inside the original w and f strokes.
const colonies = {
  w: { x: 80, y: -500, blades: [
    { length: 620, width: 13, lean: -.3, seed: 2 },
    { length: 780, width: 17, lean: .06, seed: 4 },
    { length: 510, width: 11, lean: .38, seed: 7 }
  ] },
  f: { x: 253, y: -711, blades: [
    { length: 650, width: 15, lean: -.18, seed: 4 },
    { length: 470, width: 12, lean: .34, seed: 6.5 }
  ] }
};
const point = ([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`;

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
  let previous;
  return (time = 0, { reducedMotion = false } = {}) => {
    const seconds = reducedMotion ? 0 : time;
    if (seconds === previous) return;
    previous = seconds;
    for (const frond of fronds) frond.setAttribute('d', journalFrondPath(frond.dataset.journalFrond, seconds));
  };
}
