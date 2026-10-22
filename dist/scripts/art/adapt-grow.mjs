// Adapt & Grow, the third stage of the shared approach field. Some of what Build & Learn made falls
// into a heap at the foot of the frame, and a coral grows up from its top through grey grains still
// in the water. Every few seconds one grain becomes new evidence: a branch reaches out to it, and an old
// branch that no longer leads anywhere lets go. Everything is derived from the stage's age, so any
// moment can be drawn again exactly, and reduced motion shows one settled moment.
const TAU = Math.PI * 2;
const clamp = (n, low = 0, high = 1) => Math.max(low, Math.min(high, n));
const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const random = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const BLUE = [36, 78, 255], GREY = [112, 119, 131], CORAL = [232, 120, 131];
export const GROW_START = 3.4, GROW_DURATION = 3.1;
export const FIRST_EVENT = GROW_START + GROW_DURATION + 1.4, EVENT_INTERVAL = 6;
const EXTRA_BRANCHES = 2, RETREAT_EVERY = 3;
const EVIDENCE = .9, REACH = 1, PRUNE_START = 2.2, PRUNE = 1;
// How many grains fall into the heap, and how far either side of the middle they gather.
export const HEAP = { count: 560, halfWidth: .15, height: .072 };
const CANOPY = { left: .13, right: .87, top: .22, bottom: .74 };

const css = rgb => `rgba(${rgb.map(Math.round).join(',')},`;
const colour = (a, b, t) => a.map((v, i) => mix(v, b[i], t));
const gap = (a, b) => Math.hypot(a.u - b.u, a.v - b.v);
function segmentGap(p, a, b) {
  const du = b.u - a.u, dv = b.v - a.v, t = clamp(((p.u - a.u) * du + (p.v - a.v) * dv) / (du * du + dv * dv || 1));
  return Math.hypot(p.u - a.u - du * t, p.v - a.v - dv * t);
}
function crosses(a, b, c, d) {
  const turn = (p, q, r) => (q.u - p.u) * (r.v - p.v) - (q.v - p.v) * (r.u - p.u);
  return turn(a, b, c) * turn(a, b, d) < 0 && turn(c, d, a) * turn(c, d, b) < 0;
}

// Where each heap grain gathers across the floor: most near the middle, a few out at the foot.
const heapOffset = id => ((random(id * 5.3 + 1) + random(id * 9.1 + 7)) - 1) * HEAP.halfWidth;

// A pre-stacked heap for reduced motion, packed from the floor up under a cone with a ragged top.
function stillHeap(count) {
  const spots = [], step = .0049;
  for (let row = 0; spots.length < count * 3 && row < 80; row++) {
    const v = .998 - row * step * .87;
    for (let u = .5 - HEAP.halfWidth + (row % 2) * step / 2; u <= .5 + HEAP.halfWidth; u += step) {
      const top = 1 - HEAP.height * 1.6 * Math.max(0, 1 - Math.abs(u - .5) / HEAP.halfWidth) * (1 + .12 * (random(u * 431) - .5));
      if (v >= top) spots.push({ u: u + (random(u * 97 + row) - .5) * .0012, v });
    }
  }
  // Filled from the floor up, the last row stops short: the top stays ragged, as sand does.
  return spots.slice(0, count);
}

/** Fixed roles for the stage: which grains form the rock, and the coral they start from. */
export function createAdaptGrow(locations, studies, reserved = new Set()) {
  const { study, ids } = studies[0];
  const coralIds = new Set(ids);
  const taken = new Set([...reserved, ...studies.flatMap(item => item.ids)]);
  // The heap draws its grains evenly from across the water, so the field thins without a gap.
  const pool = locations.map((_, id) => id).filter(id => !taken.has(id))
    .sort((a, b) => random(a * 3.7 + 11) - random(b * 3.7 + 11)).slice(0, HEAP.count);
  pool.sort((a, b) => heapOffset(a) - heapOffset(b));
  const still = stillHeap(pool.length).sort((a, b) => a.u - b.u);
  const rock = new Map(pool.map((id, i) => [id, { offset: heapOffset(id), still: still[i] }]));
  const base = study.nodes.map(([, , parent], i) => ({ id: ids[i], parent: parent < 0 ? -1 : ids[parent], arrival: study.arrivals[i] }));
  const candidates = locations.map((location, id) => ({ ...location, id }))
    .filter(({ id, u, v }) => !rock.has(id) && !coralIds.has(id)
      && u > CANOPY.left && u < CANOPY.right && v > CANOPY.top && v < CANOPY.bottom);
  const placed = locations.map((location, id) => coralIds.has(id) ? { u: .5 + (location.u - .5) * 1.08, v: .15 + (location.v - .20) * 1.15 } : location);
  return { rock, root: ids[0], coral: coralIds, base, parents: new Map(base.map(node => [node.id, node.parent])), candidates, locations: placed, events: [], dormant: [] };
}

function depthOf(nodes, id) {
  let depth = 0;
  for (let node = nodes.get(id); node && node.parent >= 0; node = nodes.get(node.parent)) depth++;
  return depth;
}

// Each event grows one branch towards a grain of evidence. The coral keeps its shape: growth
// beyond two extra branches lets the oldest of them go, and now and then one of the original twigs
// retreats, to regrow later where it was. Branches only reach upwards or sideways into open water.
function nextEvent(grow, nodes, index) {
  const recent = grow.events.slice(-4).flatMap(event => [event.add, event.prune]);
  const branches = [...nodes].filter(([, node]) => node.parent >= 0)
    .map(([id, node]) => ({ id, parent: node.parent, a: grow.locations[node.parent], b: grow.locations[id] }));
  const members = [...nodes.keys()].filter(id => depthOf(nodes, id) >= 2).map(id => ({ id, ...grow.locations[id] }));
  let choice = null;
  // A twig that retreated earlier grows back first, so the original form keeps returning.
  const regrow = grow.dormant.find(id => nodes.has(grow.parents.get(id)) && !recent.includes(id));
  if (regrow !== undefined) choice = { candidate: { id: regrow, ...grow.locations[regrow] }, parent: { id: grow.parents.get(regrow) } };
  else {
    const options = [];
    for (const candidate of grow.candidates) {
      if (nodes.has(candidate.id) || recent.includes(candidate.id)) continue;
      let parent = null, parentGap = Infinity, crowding = Infinity;
      for (const member of members) {
        const distance = gap(member, candidate);
        crowding = Math.min(crowding, distance);
        if (member.v >= candidate.v - .02 && distance < parentGap) { parent = member; parentGap = distance; }
      }
      for (const id of nodes.keys()) crowding = Math.min(crowding, gap(grow.locations[id], candidate));
      if (!parent || crowding < .04 || parentGap < .045 || parentGap > .12) continue;
      // New growth reaches into open water: clear of every branch, and crossing none of them.
      if (branches.some(({ a, b }) => segmentGap(candidate, a, b) < .035)) continue;
      if (branches.some(({ id, parent: from, a, b }) => id !== parent.id && from !== parent.id && crosses(parent, candidate, a, b))) continue;
      options.push({ candidate, parent });
    }
    if (options.length) choice = options[Math.floor(random(index * 7.31 + 3.17) * options.length)];
  }
  if (!choice) return { add: -1, parent: -1, prune: -1 };
  if (regrow !== undefined) grow.dormant.splice(grow.dormant.indexOf(regrow), 1);
  const children = new Set([...nodes.values()].map(node => node.parent));
  const leaves = [...nodes.keys()].filter(id => !children.has(id) && id !== choice.parent.id && id !== choice.candidate.id);
  const extra = leaves.filter(id => !grow.parents.has(id)).sort((a, b) => nodes.get(a).joined - nodes.get(b).joined);
  const added = [...nodes.keys()].filter(id => !grow.parents.has(id)).length + (grow.parents.has(choice.candidate.id) ? 0 : 1);
  let prune = -1;
  if (added > EXTRA_BRANCHES && extra.length) prune = extra[0];
  else if (index % RETREAT_EVERY === RETREAT_EVERY - 1) {
    const twigs = leaves.filter(id => grow.parents.has(id) && depthOf(nodes, id) >= 3 && !grow.dormant.includes(id));
    if (twigs.length) { prune = twigs[Math.floor(random(index * 3.1 + .7) * twigs.length)]; grow.dormant.push(prune); }
  }
  return { add: choice.candidate.id, parent: choice.parent.id, prune };
}

/** The coral as it stands once the given number of events have finished. */
function structureAfter(grow, count) {
  const nodes = new Map(grow.base.map(node => [node.id, { parent: node.parent, joined: node.arrival - 1 }]));
  for (let index = 0; index < count; index++) {
    if (!grow.events[index]) grow.events[index] = nextEvent(grow, nodes, index);
    const { add, parent, prune } = grow.events[index];
    if (add >= 0) nodes.set(add, { parent, joined: index });
    if (prune >= 0) nodes.delete(prune);
  }
  return nodes;
}

/** Caption, detail and every branch and coloured grain at this age. */
export function adaptGrowPresentation(grow, age, reducedMotion = false) {
  const seconds = reducedMotion ? FIRST_EVENT + EVENT_INTERVAL - .4 : Math.max(0, Number.isFinite(age) ? age : 0);
  const growth = reducedMotion ? 1 : clamp((seconds - GROW_START) / GROW_DURATION);
  const event = seconds < FIRST_EVENT ? -1 : Math.floor((seconds - FIRST_EVENT) / EVENT_INTERVAL);
  const local = event < 0 ? 0 : seconds - FIRST_EVENT - event * EVENT_INTERVAL;
  const nodes = structureAfter(grow, Math.max(0, event));
  const current = event >= 0 ? (structureAfter(grow, event + 1), grow.events[event]) : null;
  const baseArrival = new Map(grow.base.map(node => [node.id, node.arrival]));
  const edges = [], marks = [];
  for (const [id, node] of nodes) {
    const arrival = baseArrival.get(id);
    const reached = arrival === undefined || (growth > 0 && growth >= arrival);
    if (node.parent >= 0) {
      const parentArrival = baseArrival.get(node.parent) ?? 0;
      let progress = arrival === undefined ? 1 : clamp((growth - parentArrival) / Math.max(1e-6, arrival - parentArrival));
      if (current && id === current.prune) progress *= 1 - smooth((local - PRUNE_START) / PRUNE);
      if (progress > 0) edges.push({ from: node.parent, to: id, progress });
    }
    let tint = 1, alpha = reached ? 1 : 0;
    if (current && id === current.prune) { tint = 1 - smooth((local - PRUNE_START) / PRUNE); alpha = tint; }
    if (alpha > 0) marks.push({ id, rgb: colour(GREY, BLUE, tint), alpha, ring: 0 });
  }
  let detail = growth < 1 ? 'Growing from what we built' : 'Learning from new evidence';
  if (current && current.add >= 0) {
    const reach = smooth((local - EVIDENCE) / REACH);
    const pulse = smooth(local / .25) * (1 - smooth((local - EVIDENCE - REACH) / .3));
    edges.push({ from: current.parent, to: current.add, progress: reach });
    marks.push({ id: current.add, rgb: colour(CORAL, BLUE, smooth((local - EVIDENCE - REACH) / .3)), alpha: smooth(local / .25),
      ring: pulse, ringProgress: clamp((local % 1.2) / 1.1) });
    if (local < EVIDENCE) detail = 'New evidence arrives';
    else if (local < EVIDENCE + REACH) detail = 'Growing towards it';
    else if (local >= PRUNE_START && local < PRUNE_START + PRUNE && current.prune >= 0) detail = 'Letting an old branch go';
  }
  return { caption: '03 / ADAPT & GROW', detail, edges, marks, event, local, growth };
}

/** While the heap gathers, its grains are drawn gently towards the middle as they fall. */
export const heapPull = age => smooth(age / .5) * (1 - smooth((age - 2.7) / 1.1));

/** Fine branches between the grains, then the grains the coral has joined, in colour. */
export function drawAdaptGrow(ctx, points, state, { width, height, opacity = 1 } = {}) {
  const radius = clamp(width * .0041, 1.1, 1.7), line = clamp(Math.min(width, height) / 600, .55, .8);
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = `rgba(36,78,255,${(.48 * opacity).toFixed(3)})`; ctx.lineWidth = line;
  ctx.beginPath();
  for (const { from, to, progress } of state.edges) {
    const a = points(from), b = points(to);
    ctx.moveTo(a.x, a.y); ctx.lineTo(mix(a.x, b.x, progress), mix(a.y, b.y, progress));
  }
  ctx.stroke();
  for (const mark of state.marks) {
    const p = points(mark.id);
    if (mark.ring > 0) {
      ctx.strokeStyle = `${css(CORAL)}${(.24 * mark.ring * (1 - mark.ringProgress) ** 2 * opacity).toFixed(3)})`; ctx.lineWidth = .65;
      ctx.beginPath(); ctx.arc(p.x, p.y, mix(3, 9, mark.ringProgress) * Math.min(1, Math.min(width, height) / 360), 0, TAU); ctx.stroke();
    }
    ctx.fillStyle = `${css(mark.rgb)}${(.95 * mark.alpha * opacity).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
