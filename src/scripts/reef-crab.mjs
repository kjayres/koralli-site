// A hermit crab living under a stone by the kelp at the foot of Views from the Reef. Pointing at
// the stone (or focusing it) brings the crab scuttling out to say "… a look at the future";
// moving away sends it back under, raising a little silt. The stone is a link: pressing it, or
// the crab, opens the Poseidon page (agent-systems.html), which is reached from nowhere else.
import { habitatStone } from './art/journal-water.mjs';

const NS = 'http://www.w3.org/2000/svg';
const LINE = '#8FA5FF';
// The crab is see-through wire like the deep fish: an outline and a fainter inner mesh.
const WIRE = '#B5C4DF';
const OUTLINE = { fill: 'none', stroke: WIRE, 'stroke-width': '.59', 'stroke-opacity': '.36', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
const MESH = { fill: 'none', stroke: WIRE, 'stroke-width': '.43', 'stroke-opacity': '.17', 'stroke-linecap': 'round' };
const SILT = [196, 205, 228];
const FLOOR = 90;
const HIDDEN_X = 36, OUT_X = 92;
const WORDS = '… a look at the future';

const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
const ease = t => t * t * (3 - 2 * t);
const pts = list => list.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
const line = list => `M${pts(list)}`;
const el = (name, attributes = {}, parent) => {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  parent?.append(node);
  return node;
};
const arc = (cx, cy, rx, ry, from, to, steps = 16) =>
  Array.from({ length: steps + 1 }, (_, i) => { const a = from + (to - from) * i / steps; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });

// A low pebble, faceted like the holdfast rocks beside it and drawn more faintly still.
function stoneMarkup(group) {
  const stone = habitatStone(40, FLOOR, 24, 14, 17, 12);
  const faces = stone.faces.map(face => `M${pts(face.map(i => stone.points[i]))}Z`).join('');
  el('path', { d: faces, fill: '#0E1A33', 'fill-opacity': '.92', stroke: 'none' }, group);
  const edges = (outer) => stone.edges.filter(({ count }) => (count === 1) === outer)
    .map(({ pair }) => `M${pts(pair.map(i => stone.points[i]))}`).join('');
  el('path', { d: edges(false), fill: 'none', stroke: LINE, 'stroke-width': '.4', 'stroke-opacity': '.11' }, group);
  el('path', { d: edges(true), fill: 'none', stroke: LINE, 'stroke-width': '.5', 'stroke-opacity': '.19', class: 'reef-crab-rim' }, group);
}

// The coiled shell: its rim and spiral as outline, whorl rings and ribs as mesh.
function shellMarkup(group) {
  const [cx, cy] = [-8.5, -11.2];
  const spiral = Array.from({ length: 49 }, (_, i) => {
    const t = i / 48, angle = Math.PI * .15 + t * 2.4 * Math.PI * 2, r = 1.2 + t * 9.2;
    return [cx + Math.cos(angle) * r * 1.08, cy + Math.sin(angle) * r];
  });
  el('path', { d: `${line(arc(cx, cy, 11.6, 10.6, 0, Math.PI * 2, 32))}Z ${line(spiral)}`, ...OUTLINE }, group);
  const mesh = [];
  for (const r of [4.2, 7.4]) mesh.push(line(arc(cx, cy, r * 1.08, r, Math.PI * .9, Math.PI * 2.3, 14)));
  for (let k = 0; k < 10; k++) {
    const a = Math.PI * .15 + k * .66, inner = 2.6 + k * .85, outer = Math.min(10.4, inner + 3.6);
    mesh.push(line([[cx + Math.cos(a) * inner * 1.08, cy + Math.sin(a) * inner], [cx + Math.cos(a) * outer * 1.08, cy + Math.sin(a) * outer]]));
  }
  el('path', { d: mesh.join(''), ...MESH }, group);
}

export function initReefCrab(root) {
  const link = root.querySelector('a');
  const svg = root.querySelector('svg');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = motion.matches;

  const defs = el('defs', {}, svg);
  const clip = el('clipPath', { id: 'reef-crab-floor' }, defs);
  el('rect', { x: -20, y: -60, width: 320, height: FLOOR + 60.5 }, clip);
  const crabLayer = el('g', { 'clip-path': 'url(#reef-crab-floor)' });
  link.prepend(crabLayer);
  const crab = el('g', {}, crabLayer);
  const legs = el('path', OUTLINE, crab);
  const legMesh = el('path', MESH, crab);
  shellMarkup(el('g', {}, crab));
  const front = el('path', OUTLINE, crab);
  const frontMesh = el('path', MESH, crab);
  const eyes = el('g', { fill: '#C5D7EF', 'fill-opacity': '.42', stroke: 'none' }, crab);
  const eyeA = el('circle', { r: '.9' }, eyes), eyeB = el('circle', { r: '.85' }, eyes);
  stoneMarkup(el('g', {}, link));
  const dust = el('g', { 'pointer-events': 'none' }, svg);
  const bubbles = [0, 1, 2].map(() => el('circle', { r: '1', fill: 'none', stroke: WIRE, 'stroke-width': '.45', opacity: '0' }, svg));
  const words = el('text', { x: 126, y: 63, class: 'reef-crab-words', opacity: '0' }, svg);

  let target = 0, out = 0, walk = 0, idle = 0, said = 0, wordsOpacity = 0;
  let frame = 0, last = 0, touch = false, particles = [];

  function burst(strength) {
    if (reduced) return;
    for (let i = 0; i < 12 * strength; i++) {
      const side = Math.random() < .7 ? 1 : -1;
      particles.push({ x: 60 + Math.random() * 8, y: FLOOR - Math.random() * 2, vx: side * (8 + Math.random() * 30), vy: -(4 + Math.random() * 14),
        r: .5 + Math.random() * 1.1, life: .8 + Math.random() * .9, age: 0, node: el('circle', { fill: `rgb(${SILT.join(',')})` }, dust) });
    }
  }

  // The crab is drawn facing right with its mouth at (12, -7); legs step in two alternating sets.
  function pose() {
    const t = ease(out);
    const x = HIDDEN_X + (OUT_X - HIDDEN_X) * t;
    const y = FLOOR + 18 * (1 - t) - Math.abs(Math.sin(walk * Math.PI)) * .7;
    crab.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);

    // Three walking legs, each a jointed line with a fainter second edge.
    let outline = '', mesh = '';
    [[3.5, 0], [6.5, 1], [9.5, 0]].forEach(([base, set]) => {
      const step = Math.sin(walk * Math.PI * 2 + set * Math.PI), lift = Math.max(0, step) * 2;
      const knee = [base + 3.6 + step, -7.2 - lift], foot = [base + 6.4 + step * 1.8, -lift * .4];
      outline += line([[base, -3.5], knee, foot]);
      mesh += line([[base + .7, -3], [knee[0] + .5, knee[1] + 1.1], [foot[0] - .6, foot[1] - .3]]);
    });
    legs.setAttribute('d', outline);
    legMesh.setAttribute('d', mesh);

    // Head and body, then one big pincer held forward, its fingers opening now and then.
    const snap = Math.max(0, Math.sin(idle * 2.6)) ** 6, open = 1.6 + snap * 2.2;
    const tip = -9.2 - open * .5, jaw = -4.4 + open * .55;
    const carapace = 'M2.5,-3 Q3.5,-9.5 8.5,-9.5 Q12,-9 11.5,-5 Q10.5,-2.5 6,-2.4 Z';
    const claw = `M10.5,-6.6 Q15,-9.6 19.5,-8.8 Q22.5,${tip.toFixed(2)} 25,${tip.toFixed(2)} Q22,-6.2 20,-6.2 Q22.5,-5 24.5,${jaw.toFixed(2)} Q20,-3.2 16.5,-4 Q13,-4.2 10.5,-5 Z`;
    const twitch = Math.sin(idle * 3.1) * .8, sway = Math.sin(idle * 1.7);
    const stalks = 'M7.5,-9.4 L8.6,-15.2 M9.5,-9.2 L11.4,-14.4';
    front.setAttribute('d', `${carapace} ${claw} ${stalks}`);
    frontMesh.setAttribute('d', [
      line(arc(7, -6, 3.6, 2.6, Math.PI * 1.05, Math.PI * 1.95, 8)), line(arc(7, -4.6, 4.2, 2.2, Math.PI * 1.1, Math.PI * 1.9, 8)),
      line([[4.6, -8.6], [5.4, -3.2]]), line([[8.4, -9.2], [8.6, -2.8]]),
      line([[13.4, -7.6], [13.2, -4.4]]), line([[16.4, -8.6], [16.2, -4.2]]), line([[11.5, -5.8], [19.8, -6.4]]),
      `M10.5,-8.6 Q17,${(-15.5 - sway).toFixed(2)} 24,${(-18 - sway * 2).toFixed(2)} M11,-8 Q16.5,-12 22,${(-12.5 + sway).toFixed(2)}`,
    ].join(''));
    eyeA.setAttribute('cx', (8.6 + twitch * .3).toFixed(2)); eyeA.setAttribute('cy', '-15.4');
    eyeB.setAttribute('cx', (11.4 - twitch * .2).toFixed(2)); eyeB.setAttribute('cy', '-14.6');

    // Bubbles rise from the mouth, then the words follow them out.
    const mouth = [x + 12, y - 7];
    bubbles.forEach((bubble, i) => {
      const k = clamp(said * 3.2 - i * .55);
      bubble.setAttribute('cx', (mouth[0] + 3 + i * 2.4).toFixed(2));
      bubble.setAttribute('cy', (mouth[1] - 3 - i * 5 - k * 2).toFixed(2));
      bubble.setAttribute('r', (.7 + i * .35).toFixed(2));
      bubble.setAttribute('opacity', (clamp(k * 3) * wordsOpacity * .4).toFixed(3));
    });
    const shown = Math.round(clamp((said - .3) / .7) * WORDS.length);
    if (words.textContent.length !== shown) words.textContent = WORDS.slice(0, shown);
    words.setAttribute('x', (mouth[0] + 10).toFixed(2));
    words.setAttribute('opacity', (wordsOpacity * .7).toFixed(3));
  }

  function tick(time) {
    frame = 0;
    const dt = Math.min(.05, (time - last) / 1000 || 1 / 60);
    last = time;
    const before = out;
    if (reduced) out = target;
    else if (target > out) out = Math.min(1, out + dt / .75);
    else if (target < out) out = Math.max(0, out - dt / .42);
    if (before === 0 && out > 0) burst(1);
    if (before > 0 && out === 0) burst(.7);
    walk += Math.abs(out - before) * 7;
    idle += dt;
    if (target === 1 && out === 1) said = reduced ? 1 : Math.min(1, said + dt / 1.3);
    else said = 0;
    wordsOpacity = target === 1 && out === 1 ? 1 : reduced ? 0 : Math.max(0, wordsOpacity - dt / .18);
    particles = particles.filter(p => {
      p.age += dt;
      if (p.age >= p.life) { p.node.remove(); return false; }
      const drag = Math.exp(-2.6 * dt);
      p.vx *= drag; p.vy = p.vy * drag + 10 * dt;
      p.x += p.vx * dt; p.y = Math.min(FLOOR, p.y + p.vy * dt);
      p.node.setAttribute('cx', p.x.toFixed(2)); p.node.setAttribute('cy', p.y.toFixed(2));
      p.node.setAttribute('r', (p.r * (1 + p.age * .7)).toFixed(2));
      p.node.setAttribute('opacity', (.3 * (1 - p.age / p.life) ** 1.5).toFixed(3));
      return true;
    });
    pose();
    if (out !== target || out === 1 || particles.length || wordsOpacity > 0) frame = requestAnimationFrame(tick);
  }

  function show(on) {
    target = on ? 1 : 0;
    if (!frame) { last = performance.now(); frame = requestAnimationFrame(tick); }
  }

  link.addEventListener('pointerenter', event => { touch = event.pointerType === 'touch'; if (!touch) show(true); });
  link.addEventListener('pointerleave', event => { if (event.pointerType !== 'touch') show(false); });
  link.addEventListener('pointerdown', event => { touch = event.pointerType === 'touch'; });
  link.addEventListener('focus', () => show(true));
  link.addEventListener('blur', () => show(false));
  // On a touch screen the first tap brings the crab out and the next one follows it.
  link.addEventListener('click', event => {
    if (touch && out < 1) { event.preventDefault(); show(true); }
  });
  document.addEventListener('pointerdown', event => { if (touch && !link.contains(event.target)) show(false); });
  motion.addEventListener('change', () => { reduced = motion.matches; });
  pose();
}
