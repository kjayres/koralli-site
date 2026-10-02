import { ORGANIC_CORALS } from './reef-organic.mjs?v=677519222157';

const random = seed => { const n = Math.sin(seed * 91.73 + 17.19) * 41738.31; return n - Math.floor(n); };

/** The camera stays low; local knolls and a shallow channel reveal the depth. */
export function reefFloorHeight(x, y, compact = false) {
  const xx = compact ? x * 3.2 : x, yy = compact ? y / .52 : y;
  const rise = 1 / (1 + Math.exp(-(yy + 110) / 130));
  const mound = (cx, cy, rx, ry) => Math.exp(-(((xx - cx) / rx) ** 2) - ((yy - cy) / ry) ** 2);
  return (compact ? .9 : 1) * (66 + 258 * rise
    + 48 * mound(-690, -130, 390, 205) + 54 * mound(510, 75, 440, 230)
    + 30 * mound(-90, 290, 290, 170) - 32 * mound(-80, -90, 185, 300)
    + 6 * Math.sin(xx * .009 + yy * .012) + 3 * Math.cos(xx * .018 - yy * .023));
}

function footprint(kind, height, spread, depth, yaw) {
  const mesh = ORGANIC_CORALS[kind], c = Math.cos(yaw), s = Math.sin(yaw);
  let rx = 0, ry = 0;
  for (const [x, y] of mesh.vertices) {
    rx = Math.max(rx, Math.abs(x * c - y * s) * height * spread);
    ry = Math.max(ry, Math.abs(x * s + y * c) * height * spread * depth);
  }
  return { rx, ry };
}

/** Seeded clusters are packed by their actual mesh envelopes, not a row/grid. */
export function reefHabitat(compact = false) {
  const colonies = [], distance = compact ? 1500 : 2800;
  const depthScale = compact ? .52 : 1, halfWidth = compact ? 337 : 1120;
  const groups = [
    { kinds: ['seaweed_ribbons', 'seaweed_ribbons_open'], count: compact ? 3 : 5, low: 235, high: 315, flex: .085 },
    { kinds: ['massive_coral', 'massive_lobed', 'massive_coral_2', 'massive_lobed_2'], count: compact ? 10 : 20, low: 40, high: 79 },
    { kinds: ['branching_compact', 'branching_spreading', 'branching_compact_2', 'branching_compact_3'], count: compact ? 25 : 60, low: 58, high: 94 },
    { kinds: ['soft_tuft', 'soft_tuft_open'], count: compact ? 4 : 7, low: 46, high: 69, flex: .07 },
    { kinds: ['foliose_coral'], count: compact ? 14 : 30, low: 25, high: 42 },
    { kinds: ['cauliflower_small', 'brain_lobes'], count: compact ? 10 : 24, low: 36, high: 61 },
    { kinds: ['young_encrusting'], count: compact ? 8 : 18, low: 10, high: 19 },
  ];
  let serial = 0;
  for (const [groupIndex, group] of groups.entries()) {
    let placed = 0;
    for (let attempt = 0; attempt < group.count * 100 && placed < group.count; attempt++) {
      const key = ++serial * 23 + groupIndex * 977;
      const tall = group.low > 100;
      const depthPosition = tall ? [.58,.51,.76,.35,.28][placed] + (random(key + 1)-.5)*.08 : random(key + 1);
      const nativeY = -390 + depthPosition * 735;
      const y = nativeY * depthScale;
      const nx = tall ? [-.76,.60,-.39,.88,-.95][placed] + (random(key + 2)-.5)*.08 : (random(key + 2) * 2 - 1) * 1.09;
      const channel = -.07 + .19 * Math.sin(depthPosition * 3.6);
      if (Math.abs(nx - channel) < .042 && depthPosition < .78) continue;
      // Pockets of growth leave connected sand channels rather than even gaps.
      const habitat = Math.max(
        Math.exp(-(((nx + .66) / .39) ** 2) - ((depthPosition - .28) / .46) ** 2),
        Math.exp(-(((nx - .59) / .46) ** 2) - ((depthPosition - .48) / .49) ** 2),
        Math.exp(-(((nx + .05) / .62) ** 2) - ((depthPosition - .91) / .28) ** 2));
      if (!tall && random(key + 3) > .06 + .94 * habitat) continue;
      // Long flexible growth is sparse, behind the foreground colonies.
      const x = nx * halfWidth * (distance + y * 3.1) / distance;
      let kind = group.kinds[Math.floor(random(key + 4) * group.kinds.length)];
      const height = (group.low + random(key + 5) * (group.high - group.low))
        * (1.10 - .23 * depthPosition) * (compact ? .85 : 1);
      const yaw = random(key + 6) * Math.PI * 2;
      const width = (kind.startsWith('branching_compact') ? 1.25 : .92) + random(key + 7) * .20;
      const depth = .82 + random(key + 8) * .22;
      const envelope = footprint(kind, height, width, depth, yaw);
      if (group.flex) { envelope.rx += height * group.flex * 1.3; envelope.ry += height * group.flex * .7; }
      // The y coordinates are stretched into world depth by the renderer.
      if (colonies.some(other => Math.abs(x - other.origin[0]) < (envelope.rx + other.envelope.rx) * 1.015 + 2
        && Math.abs(y - other.origin[1]) * 3.1 < (envelope.ry + other.envelope.ry) * 1.015 + 2)) continue;
      const colourField = Math.sin(nx * 4.1 + depthPosition * 3.3) + .42 * Math.cos(key * .4);
      colonies.push({ name: `Habitat colony ${colonies.length + 1}`, kind, height,
        origin: [x, y, reefFloorHeight(x, y, compact)], yaw: yaw * 180 / Math.PI,
        width, depth, material: group.flex ? 'blue' : colourField > .40 ? 'coral' : 'blue',
        motion: Boolean(group.flex), flex: group.flex || 0, envelope, burial: compact ? 4.5 : 1.5, bank: true });
      placed++;
    }
  }
  // Recruitment gathers unevenly around established colonies. Keep the sand
  // channels and reserve each neighbour's full envelope, including its sway.
  const mature = colonies.filter(colony => !colony.motion && colony.height > 30);
  const youngKinds = ['young_lobed', 'young_encrusting', 'young_fingers', 'young_fingers_2'];
  const target = compact ? 40 : 124;
  let added = 0;
  for (let index = 0; index < mature.length && added < target; index++) {
    const parent = mature[index], seed = 11003 + index * 193;
    if (random(seed) < .20) continue;
    const count = 1 + Math.floor(random(seed + 1) * 4), side = random(seed + 2) * Math.PI * 2;
    let placed = 0;
    for (let attempt = 0; attempt < 48 && placed < count && added < target; attempt++) {
      const key = seed + attempt * 31;
      const kind = youngKinds[Math.floor(random(key + 3) * youngKinds.length)];
      const height = (kind === 'young_encrusting' ? 6 + random(key + 4) * 6 : 10 + random(key + 4) * 15)
        * (compact ? .82 : 1);
      const yaw = random(key + 5) * Math.PI * 2;
      const width = .88 + random(key + 6) * .30, depth = .85 + random(key + 7) * .24;
      const envelope = footprint(kind, height, width, depth, yaw);
      const angle = side + (random(key + 8) - .5) * 2.2;
      // Rectangular envelopes are conservative: grow off one clear side rather
      // than placing a circular skirt through a neighbour's branches.
      const c = Math.cos(angle), s = Math.sin(angle);
      const reach = Math.min((parent.envelope.rx + envelope.rx + 3) / Math.max(.001, Math.abs(c)),
        (parent.envelope.ry + envelope.ry + 3) / Math.max(.001, Math.abs(s))) * (1.025 + random(key + 9) * .20);
      const x = parent.origin[0] + c * reach, y = parent.origin[1] + s * reach / 3.1;
      const depthPosition = (y / depthScale + 390) / 735;
      const nx = x / (halfWidth * (distance + y * 3.1) / distance);
      if (depthPosition < 0 || depthPosition > 1 || Math.abs(nx) > 1.09) continue;
      if (Math.abs(nx - (-.07 + .19 * Math.sin(depthPosition * 3.6))) < .042 && depthPosition < .78) continue;
      if (colonies.some(other => Math.abs(x - other.origin[0]) < (envelope.rx + other.envelope.rx) * 1.015 + 2
        && Math.abs(y - other.origin[1]) * 3.1 < (envelope.ry + other.envelope.ry) * 1.015 + 2)) continue;
      colonies.push({ name: `Young colony ${added + 1}`, kind, height,
        origin: [x, y, reefFloorHeight(x, y, compact)], yaw: yaw * 180 / Math.PI,
        width, depth, material: random(key + 10) < .78 ? parent.material : parent.material === 'blue' ? 'coral' : 'blue',
        motion: false, flex: 0, envelope, burial: compact ? 3 : 1.5, bank: true });
      placed++; added++;
    }
  }
  return colonies;
}
