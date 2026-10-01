// Native meshes: x sideways, y depth, z upwards. Bush roots extend below the z=0 soil line.
const TAU = Math.PI * 2;
const add = (a, b) => a.map((n, i) => n + b[i]);
const scale = (a, n) => a.map(v => v * n);
const sub = (a, b) => a.map((n, i) => n - b[i]);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = v => scale(v, 1 / (Math.hypot(...v) || 1));
const random = seed => { const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };

function mesh() {
  const vertices = [], faces = [], nodes = new Set();
  const point = p => { vertices.push(p); return vertices.length - 1; };
  const face = (a, b, c) => { faces.push([a, b, c]); };
  const ring = (centre, tangent, radius, sides, phase = 0, previousU) => {
    const direction = unit(tangent);
    const dot = previousU ? previousU.reduce((sum, n, i) => sum + n * direction[i], 0) : 0;
    const transported = previousU ? sub(previousU, scale(direction, dot)) : null;
    const u = transported && Math.hypot(...transported) > .001 ? unit(transported)
      : unit(cross(direction, Math.abs(direction[2]) > .85 ? [1, 0, 0] : [0, 0, 1]));
    const v = cross(direction, u);
    return Array.from({ length: sides }, (_, i) => {
      const angle = phase + TAU * i / sides;
      return point(add(centre, add(scale(u, Math.cos(angle) * radius), scale(v, Math.sin(angle) * radius))));
    });
  };
  const join = (a, b) => {
    for (let i = 0; i < a.length; i++) {
      const next = (i + 1) % a.length;
      face(a[i], a[next], b[next]); face(a[i], b[next], b[i]);
    }
  };
  const cap = (indices, centre, reverse = false) => {
    const index = point(centre);
    for (let i = 0; i < indices.length; i++) {
      const next = (i + 1) % indices.length;
      face(index, indices[reverse ? next : i], indices[reverse ? i : next]);
    }
    return index;
  };
  const tube = (centres, radii, { sides = 5, start, end, close = true, rounded = false } = {}) => {
    let previousU = start ? unit(sub(vertices[start[0]], centres[0])) : null;
    const rings = centres.map((centre, i) => {
      if (i === 0 && start) return start;
      if (i === centres.length - 1 && end) return end;
      const previous = centres[Math.max(0, i - 1)], next = centres[Math.min(centres.length - 1, i + 1)];
      const indices = ring(centre, sub(next, previous), radii[i], sides, 0, previousU);
      previousU = unit(sub(vertices[indices[0]], centre));
      return indices;
    });
    for (let i = 1; i < rings.length; i++) join(rings[i - 1], rings[i]);
    if (!start) cap(rings[0], centres[0], true);
    if (close && !end) {
      if (rounded) {
        const direction = unit(sub(centres.at(-1), centres.at(-2)));
        const radius = radii.at(-1);
        const crown = ring(add(centres.at(-1), scale(direction, radius * .7)), direction, radius * .7, sides, 0, previousU);
        join(rings.at(-1), crown);
        nodes.add(cap(crown, add(centres.at(-1), scale(direction, radius))));
      } else nodes.add(cap(rings.at(-1), centres.at(-1)));
    }
    return rings;
  };
  return { vertices, faces, nodes, point, face, ring, join, cap, tube };
}

function finish(drawing) {
  const valid = drawing.faces.filter(([a, b, c]) => Math.hypot(...cross(sub(drawing.vertices[b], drawing.vertices[a]), sub(drawing.vertices[c], drawing.vertices[a]))) > 1e-10);
  const used = [...new Set(valid.flat())].sort((a, b) => a - b);
  const remap = new Map(used.map((index, i) => [index, i]));
  const lowest = Math.min(...used.map(i => drawing.vertices[i][2]));
  const height = Math.max(...used.map(i => drawing.vertices[i][2])) - lowest;
  return {
    vertices: used.map(i => drawing.vertices[i].map((n, axis) => Number(((n - (axis === 2 ? lowest : 0)) / height).toFixed(6)))),
    faces: valid.map(face => face.map(i => remap.get(i))),
    nodes: [...drawing.nodes].filter(i => remap.has(i)).map(i => remap.get(i)),
  };
}

function staghorn(seed = 1) {
  const m = mesh();
  const attach = (rings, parent) => {
    const point = m.vertices[rings[0][0]];
    const nearest = parent.reduce((best, index) => {
      const distance = m.vertices[index].reduce((sum, n, axis) => sum + (n - point[axis]) ** 2, 0);
      return distance < best.distance ? { index, distance } : best;
    }, { index: parent[0], distance: Infinity }).index;
    m.face(nearest, rings[0][0], rings[0][1]);
    return rings;
  };
  const root = [[0, 0, 0], [.008, -.005, .045]];
  const trunk = m.tube(root, [.058, .046], { close: false });
  for (let branch = 0; branch < 6; branch++) {
    const key = seed + branch * 71;
    const angle = branch * TAU / 6 + (random(key) - .5) * .65;
    const radial = [Math.cos(angle), Math.sin(angle), 0];
    const side = [-radial[1], radial[0], 0];
    const reach = .19 + random(key + 11) * .19;
    const rise = .20 + random(key + 17) * .13;
    const end = add(scale(radial, reach), [0, 0, rise]);
    const bend = add(scale(end, .54), scale(side, (random(key + 23) - .5) * .12));
    bend[2] *= .74;
    const primary = m.tube([root[1], bend, end], [.046, .040, .028], { start: trunk[1], close: false });
    const forks = random(key + 29) > .3 ? 3 : 2;
    for (let fork = 0; fork < forks; fork++) {
      const forkKey = key + fork * 19;
      const direction = angle + (fork - (forks - 1) / 2) * .93 + (random(forkKey + 31) - .5) * .55;
      const reach2 = .09 + random(forkKey + 37) * .14;
      const rise2 = .13 + random(forkKey + 41) * .15;
      const drift = [Math.cos(direction) * reach2, Math.sin(direction) * reach2, rise2];
      const elbow = add(end, scale(drift, .57));
      elbow[0] += .025 * Math.sin(forkKey);
      elbow[1] += .025 * Math.cos(forkKey);
      const tip = add(end, drift);
      const secondary = m.tube([end, elbow, tip], [.028, .022, .017], { start: primary[2], close: false });
      const twigs = random(forkKey + 43) > .72 ? 3 : 2;
      for (let twig = 0; twig < twigs; twig++) {
        const twigKey = forkKey + twig * 43;
        const turn = direction + (twig - (twigs - 1) / 2) * 1.12 + (random(twigKey + 47) - .5) * .6;
        const length = .04 + random(twigKey + 53) * .105;
        const growth = [Math.cos(turn) * length, Math.sin(turn) * length, .04 + random(twigKey + 59) * .125];
        const middle = add(tip, scale(growth, .6));
        middle[0] += .020 * Math.cos(turn + 1.1);
        middle[1] += .015 * Math.sin(turn - .7);
        attach(m.tube([tip, middle, add(tip, growth)], [.014, .010, .007], { rounded: true }), secondary[2]);
      }
      const sideAngle = direction + (random(forkKey + 61) > .5 ? 1.6 : -1.3);
      const sideGrowth = [Math.cos(sideAngle) * (.05 + random(forkKey + 67) * .035),
        Math.sin(sideAngle) * (.05 + random(forkKey + 71) * .035), .035 + random(forkKey + 73) * .055];
      attach(m.tube([elbow, add(elbow, scale(sideGrowth, .62)), add(elbow, sideGrowth)],
        [.010, .006, .003], { rounded: true }), secondary[1]);
    }
    if (branch % 2 === 0) {
      const nub = add(bend, add(scale(side, .10), [0, 0, .14 + random(key + 67) * .09]));
      attach(m.tube([bend, scale(add(bend, nub), .5), nub], [.017, .011, .006], { rounded: true }), primary[1]);
    }
  }
  return finish(m);
}

function hemisphere(levels = 4) {
  const directions = [[0, 0, 1], [1, 0, 0], [0, 1, 0], [-1, 0, 0], [0, -1, 0]];
  let triangles = [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1]];
  for (let level = 0; level < levels; level++) {
    const cache = new Map(), refined = [];
    const midpoint = (a, b) => {
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      if (!cache.has(key)) {
        cache.set(key, directions.length);
        directions.push(unit(add(directions[a], directions[b])));
      }
      return cache.get(key);
    };
    for (const [a, b, c] of triangles) {
      const ab = midpoint(a, b), bc = midpoint(b, c), ca = midpoint(c, a);
      refined.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]);
    }
    triangles = refined;
  }
  return { directions, triangles };
}

function brainLobes(seed = 1, ridged = false) {
  const m = mesh();
  const lobes = [[.025, -.02, .48, .43 + .13 * random(seed + 2)]];
  const count = 3 + Math.floor(random(seed + 13) * 2);
  for (let i = 0; i < count; i++) {
    const angle = i * TAU / count + .55 * (random(seed + i * 11) - .5);
    const distance = .20 + .13 * random(seed + i * 23);
    lobes.push([Math.cos(angle) * distance, Math.sin(angle) * distance,
      .39 + .09 * random(seed + i * 29), .38 + .23 * random(seed + i * 37)]);
  }
  const surface = (x, y) => {
    const heights = lobes.map(([cx, cy, radius, height]) => height * Math.sqrt(Math.max(0, 1 - ((x - cx) ** 2 + (y - cy) ** 2) / radius ** 2)));
    const dome = heights.reduce((sum, height) => sum + height ** 8, 0) ** (1 / 8);
    const winding = Math.cos(22 * x + 3.2 * Math.sin(6 * y + seed) + 1.3 * Math.sin(8 * x - 5 * y));
    return dome * (1 + (ridged ? .014 : .065) * winding);
  };
  const { directions, triangles } = hemisphere();
  for (let i = 0; i < directions.length; i++) {
    const p = directions[i];
    const theta = Math.atan2(p[1], p[0]) + seed * .47;
    const dx = Math.cos(theta), dy = Math.sin(theta);
    const reach = Math.max(...lobes.map(([x, y, radius]) => {
      const along = x * dx + y * dy;
      return along + Math.sqrt(Math.max(0, radius * radius - (x * x + y * y - along * along)));
    }));
    const r = Math.hypot(p[0], p[1]);
    const x = r * reach * dx, y = r * reach * dy;
    const warp = ridged ? 1 : 1 + .04 * Math.sin(theta * 7 + seed) * r + .025 * Math.cos(theta * 11 - seed) * r * r;
    const jitter = !ridged && p[2] > 0 ? .009 * Math.sin(i * 19 + seed) : 0;
    m.point([x * warp + jitter, y * warp * .83 + jitter * .7, p[2] === 0 ? 0 : surface(x, y)]);
    if (i % 17 === 0 && p[2] > 0) m.nodes.add(i);
  }
  for (const face of triangles) m.face(...face);
  const rim = directions.map((p, i) => ({ p, i })).filter(({ p }) => p[2] === 0)
    .sort((a, b) => Math.atan2(a.p[1], a.p[0]) - Math.atan2(b.p[1], b.p[0])).map(({ i }) => i);
  m.cap(rim, [0, 0, 0], true);
  if (ridged) brainMaze(m, surface, seed);
  return finish(m);
}

function brainMaze(m, surface, seed) {
  const divisions = 64, extent = .82, spacing = extent * 2 / divisions;
  const field = (x, y) => {
    const u = x + .055 * Math.sin(7 * y + seed), v = y + .055 * Math.cos(7 * x - seed);
    const z = surface(x, y);
    return Math.sin(20 * u + 9 * z + seed) + .91 * Math.sin(13 * u + 16 * v - 11 * z + 1.7)
      + .84 * Math.sin(-17 * u + 10 * v + 8 * z + seed * .3) + .77 * Math.sin(-7 * u - 13 * v + 18 * z + 2.1);
  };
  const values = Array.from({ length: divisions + 1 }, (_, y) => Array.from({ length: divisions + 1 }, (_, x) =>
    field(-extent + x * spacing, -extent + y * spacing)));
  const intersections = new Map(), points = [], neighbours = [];
  const crossing = (x, y, edge) => {
    const pairs = [[[x, y], [x + 1, y]], [[x + 1, y], [x + 1, y + 1]],
      [[x, y + 1], [x + 1, y + 1]], [[x, y], [x, y + 1]]];
    const [[ax, ay], [bx, by]] = pairs[edge], key = `${ax}:${ay}:${bx}:${by}`;
    if (!intersections.has(key)) {
      const a = values[ay][ax], b = values[by][bx], t = a / (a - b);
      intersections.set(key, points.length); neighbours.push([]);
      points.push([-extent + (ax + (bx - ax) * t) * spacing, -extent + (ay + (by - ay) * t) * spacing]);
    }
    return intersections.get(key);
  };
  const connect = (a, b) => { neighbours[a].push(b); neighbours[b].push(a); };
  for (let y = 0; y < divisions; y++) for (let x = 0; x < divisions; x++) {
    const v = [values[y][x], values[y][x + 1], values[y + 1][x + 1], values[y + 1][x]];
    const edges = [];
    for (let e = 0; e < 4; e++) if ((v[e] >= 0) !== (v[(e + 1) % 4] >= 0)) edges.push(crossing(x, y, e));
    if (edges.length === 2) connect(...edges);
    else if (edges.length === 4) {
      if (v.reduce((a, b) => a + b, 0) > 0) { connect(edges[0], edges[1]); connect(edges[2], edges[3]); }
      else { connect(edges[0], edges[3]); connect(edges[1], edges[2]); }
    }
  }
  const used = new Set(), paths = [];
  const starts = points.map((_, i) => i).sort((a, b) => neighbours[a].length - neighbours[b].length);
  for (const start of starts) if (!used.has(start)) {
    const path = []; let current = start;
    while (current !== undefined && !used.has(current)) {
      used.add(current); path.push(points[current]); current = neighbours[current].find(i => !used.has(i));
    }
    let part = [];
    for (const p of path) {
      if (surface(...p) > .07) part.push(p);
      else { if (part.length > 5) paths.push(part); part = []; }
    }
    if (part.length > 5) paths.push(part);
  }
  const bodyCount = m.vertices.length;
  for (const path of paths) {
    const rounded = [path[0]];
    for (let i = 0; i < path.length - 1; i++) {
      rounded.push(add(scale(path[i], .75), scale(path[i + 1], .25)), add(scale(path[i], .25), scale(path[i + 1], .75)));
    }
    rounded.push(path.at(-1));
    const centres = [rounded[0]];
    for (let i = 1; i < rounded.length; i++) if (Math.hypot(...sub(rounded[i], centres.at(-1))) >= .023) centres.push(rounded[i]);
    if (centres.length < 4) continue;
    const rows = [];
    for (let i = 0; i < centres.length; i++) {
      const p = centres[i], previous = centres[Math.max(0, i - 1)], next = centres[Math.min(centres.length - 1, i + 1)];
      const tangent = unit(sub(next, previous)), across = [-tangent[1], tangent[0]];
      const taper = Math.min(1, i / 1.4, (centres.length - 1 - i) / 1.4);
      const width = .028 + .003 * Math.sin(i * .45 + seed);
      const height = (.037 + .005 * Math.sin(i * .6 - seed)) * taper;
      const row = [-1, -.58, 0, .58, 1].map((offset, j) => {
        const x = p[0] + across[0] * offset * width, y = p[1] + across[1] * offset * width;
        return m.point([x, y * .83, surface(x, y) + [0, .78, 1, .78, 0][j] * height]);
      });
      if (rows.length) for (let j = 0; j < row.length - 1; j++) {
        const prev = rows.at(-1);
        m.face(prev[j], row[j + 1], prev[j + 1]); m.face(prev[j], row[j], row[j + 1]);
      }
      rows.push(row);
      if (i % 12 === 6) m.nodes.add(row[2]);
    }
    let nearest = 0, distance = Infinity;
    const first = m.vertices[rows[0][2]];
    for (let i = 0; i < bodyCount; i++) {
      const d = m.vertices[i].reduce((sum, n, axis) => sum + (n - first[axis]) ** 2, 0);
      if (d < distance) { distance = d; nearest = i; }
    }
    m.face(nearest, rows[0][1], rows[0][2]);
  }
}

function shelfCoral(seed = 1) {
  const m = mesh(), sectors = 30;
  const centres = [[0, 0, 0], [-.035, -.012, .12], [.018, .008, .25], [-.015, .025, .38]];
  const stem = m.tube(centres, [.065, .052, .044, .035], { close: false });
  for (let level = 1; level <= 3; level++) {
    const centre = centres[level], extent = [.0, .64, .77, .55][level];
    let previous = stem[level], outer;
    for (let row = 1; row <= 4; row++) {
      const t = row / 4, current = [];
      for (let i = 0; i < sectors; i++) {
        const angle = TAU * i / sectors + Math.PI / 2;
        const rim = 1 + .07 * Math.sin(5 * angle + level + seed) + .035 * Math.cos(3 * angle - level);
        const radius = extent * t * (1 + (rim - 1) * t);
        const wave = .038 * Math.sin(3 * angle + level) * t ** 1.3 + .018 * Math.sin(5 * angle + seed) * t ** 3;
        current.push(m.point([centre[0] + radius * Math.cos(angle), centre[1] + radius * .87 * Math.sin(angle), centre[2] + .062 * t * t + wave + .02 * t * Math.cos(angle + level)]));
      }
      if (row === 1) {
        for (let i = 0; i < sectors; i++) {
          const inner = Math.floor(i / 6), next = (i + 1) % sectors;
          m.face(previous[inner], current[i], current[next]);
          if (i % 6 === 5) m.face(previous[inner], current[next], previous[(inner + 1) % 5]);
        }
      } else m.join(current, previous);
      previous = current; outer = current;
    }
    const underside = outer.map(i => m.point(add(m.vertices[i], [0, 0, -.018])));
    m.join(underside, outer);
    m.cap(underside, add(centre, [0, 0, -.018]), true);
    for (let i = 0; i < sectors; i += 3) m.nodes.add(outer[i]);
  }
  return finish(m);
}

function cauliflower(seed = 1, detail = 5) {
  const m = mesh(), { directions, triangles } = hemisphere(detail);
  const lobes = [];
  for (let i = 0; i < 37; i++) {
    const z = .08 + .9 * (i + .5) / 37;
    const angle = i * 2.399963 + (random(seed + i * 13) - .5) * .35;
    const radius = Math.sqrt(1 - z * z);
    lobes.push({ direction: [Math.cos(angle) * radius, Math.sin(angle) * radius, z],
      height: .20 + random(seed + i * 19) * .29, width: .019 + random(seed + i * 31) * .025 });
  }
  for (let i = 0; i < directions.length; i++) {
    const p = directions[i];
    const growth = lobes.reduce((sum, lobe) => {
      const d = lobe.direction.reduce((v, n, axis) => v + (n - p[axis]) ** 2, 0);
      return sum + lobe.height * Math.exp(-d / lobe.width);
    }, 0);
    const angle = Math.atan2(p[1], p[0]);
    const edge = 1 + .085 * Math.sin(angle * 3 + seed) + .045 * Math.sin(angle * 7 - seed);
    const volume = 1 + growth;
    m.point([p[0] * .57 * volume * edge, p[1] * .51 * volume,
      p[2] === 0 ? 0 : p[2] * .63 * volume * (1 + .08 * p[0] - .07 * p[1])]);
    if (i % 19 === 0 && p[2] > 0) m.nodes.add(i);
  }
  for (const face of triangles) m.face(...face);
  const rim = directions.map((p, i) => ({ p, i })).filter(({ p }) => p[2] === 0)
    .sort((a, b) => Math.atan2(a.p[1], a.p[0]) - Math.atan2(b.p[1], b.p[0])).map(({ i }) => i);
  m.cap(rim, [0, 0, 0], true);
  return finish(m);
}

function coralBush(seed = 1) {
  const m = mesh(), rows = 4, slices = 16;
  const top = m.point([0, 0, .012]), rings = [];
  for (let row = 1; row <= rows; row++) {
    const latitude = row / rows * Math.PI / 2, ring = [];
    for (let i = 0; i < slices; i++) {
      const angle = i * TAU / slices;
      const radius = .25 * Math.sin(latitude) * (1 + .06 * Math.sin(3 * angle + seed));
      ring.push(m.point([radius * Math.cos(angle), radius * Math.sin(angle), row === rows ? 0 : .012 * Math.cos(latitude)]));
    }
    if (!rings.length) for (let i = 0; i < slices; i++) m.face(top, ring[i], ring[(i + 1) % slices]);
    else m.join(ring, rings.at(-1));
    rings.push(ring);
  }
  m.cap(rings.at(-1), [0, 0, 0], true);
  const baseCount = m.vertices.length;
  const attach = (centres, radii, parent) => {
    const result = m.tube(centres, radii, { sides: 5, rounded: true });
    const start = m.vertices[result[0][0]];
    let closest = parent[0], distance = Infinity;
    for (const index of parent) {
      const d = m.vertices[index].reduce((sum, n, axis) => sum + (n - start[axis]) ** 2, 0);
      if (d < distance) { closest = index; distance = d; }
    }
    m.face(closest, result[0][0], result[0][1]);
    return result;
  };
  for (let stem = 0; stem < 14; stem++) {
    const key = seed + stem * 97, angle = stem * 2.399963 + random(key) * .35;
    const reach = .205 * Math.sqrt((stem + .5) / 14);
    const radial = [Math.cos(angle), Math.sin(angle), 0];
    const start = add(scale(radial, reach), [0, 0, .012 * Math.sqrt(1 - reach * reach / .25 ** 2) - .002]);
    const crownHeight = .035 + .020 * (1 - reach / .205) + random(key + 11) * .020;
    const growth = [.018 * Math.cos(key + 5), .018 * Math.sin(key + 8), crownHeight - start[2]];
    const elbow = add(start, scale(growth, .48));
    elbow[0] += .014 * Math.cos(key);
    const crown = add(start, growth);
    const primary = attach([start, elbow, crown], [.013, .011, .009], Array.from({ length: baseCount }, (_, i) => i));
    const shoots = 3 + (random(key + 13) > .72 ? 1 : 0);
    for (let shoot = 0; shoot < shoots; shoot++) {
      const shootKey = key + shoot * 23;
      const turn = angle + shoot * 2.399963 + random(shootKey + 17) * .7;
      const length = .035 + random(shootKey + 19) * .040;
      const base = shoot % 2 ? elbow : crown;
      const parent = base === elbow ? primary[1] : primary[2];
      const drift = [Math.cos(turn) * length, Math.sin(turn) * length, .030 + random(shootKey + 29) * .040];
      const middle = add(base, scale(drift, .52));
      middle[1] += .012 * Math.sin(shootKey + 3);
      const tip = add(base, drift);
      const secondary = attach([base, middle, tip], [.009, .007, .0055], parent);
      const terminals = 2 + (random(shootKey + 37) > .25 ? 1 : 0);
      for (let twig = 0; twig < terminals; twig++) {
        const twigKey = shootKey + twig * 41;
        const direction = turn + twig * 2.1 + (random(twigKey + 43) - .5) * .9;
        const outward = .013 + random(twigKey + 47) * .023;
        const twigEnd = add(tip, [Math.cos(direction) * outward, Math.sin(direction) * outward,
          .013 + random(twigKey + 53) * .025]);
        attach([tip, twigEnd], [.006, .0045], secondary[2]);
      }
    }
  }
  const colony = finish(m);
  // The shared root and lower stems sit below the soil line, not on a visible mat.
  for (const vertex of colony.vertices) vertex[2] = Number(((vertex[2] - .30) / .70).toFixed(6));
  return colony;
}

function laceFan(seed = 1) {
  const m = mesh(), arms = [];
  const root = [[0, 0, 0], [0, 0, .12]];
  const trunk = m.tube(root, [.024, .018], { sides: 3, close: false });
  for (let rib = 0; rib < 9; rib++) {
    const angle = -1.14 + rib * .285 + (random(seed + rib * 17) - .5) * .05;
    const endX = Math.sin(angle) * .86;
    const endZ = .19 + Math.cos(angle) * (.77 + random(seed + rib * 23) * .06);
    const centres = [root[1]];
    for (let row = 1; row <= 4; row++) {
      const t = row / 4;
      centres.push([endX * t ** .83 + .015 * Math.sin(t * Math.PI * 2 + rib) * t,
        (.055 * Math.sin(rib * .65) + .027 * Math.sin(t * 5 + rib + seed)) * t,
        .12 + (endZ - .12) * t]);
    }
    const rings = m.tube(centres, [.018, .012, .009, .006, .003], { sides: 3, start: trunk[1] });
    arms.push({ centres, rings });
    for (const side of [-1, 1]) {
      const base = centres[3];
      const reach = .06 + random(seed + rib * 11 + side) * .05;
      m.tube([base, add(base, [side * reach * .7, .013 * side, .07]), add(base, [side * reach, .019 * side, .14 + random(rib + seed * 4) * .05])], [.006, .004, .002], { sides: 3, start: rings[3] });
    }
  }
  // Curved cross-links make an open living lattice, with holes between branches.
  for (let rib = 0; rib < arms.length - 1; rib++) {
    for (const row of [2, 3]) {
      const a = arms[rib], b = arms[rib + 1];
      const centre = scale(add(a.centres[row], b.centres[row]), .5);
      centre[1] += .015 * Math.sin(rib + row + seed);
      centre[2] += .018 * Math.sin(rib * 1.7 + row);
      m.tube([a.centres[row], centre, b.centres[row]], [.005, .003, .005], { sides: 3, start: a.rings[row], end: b.rings[row] });
    }
  }
  return finish(m);
}

// Smaller colonies vary their overall habit, not only the position of their tips.
function compactBranches(seed, spreading = false) {
  const m = mesh(), count = spreading ? 5 : 6;
  const curve = (a, b, bend, steps) => Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1);
    return add(add(scale(a, 1 - t), scale(b, t)), scale(bend, Math.sin(Math.PI * t)));
  });
  const root = [[0, 0, 0], [.006, -.004, .035]];
  const trunk = m.tube(root, [.065, .046], { sides: 5, close: false });
  for (let i = 0; i < count; i++) {
    const key = seed + i * 67, angle = i * 2.399963 + .5 * random(key);
    const inner = i % 3 === 1;
    const reach = ((spreading ? .25 : .09) + random(key + 3) * (spreading ? .12 : .08)) * (inner ? .42 : 1);
    const rise = .09 + random(key + 7) * .075 + (inner ? .085 : 0);
    const end = [Math.cos(angle) * reach, Math.sin(angle) * reach, rise];
    const primaryCurve = curve(root[1], end, [-.025 * Math.sin(angle), .025 * Math.cos(angle), -.012], 5);
    const primary = m.tube(primaryCurve, [.046, .037, .030, .024, .021],
      { sides: 5, start: trunk[1], close: false });
    const forks = 3;
    for (let j = 0; j < forks; j++) {
      const twigKey = key + j * 31;
      const turn = angle + (j - (forks - 1) / 2) * 1.1 + .4 * (random(twigKey + 13) - .5);
      const length = (spreading ? .05 : .035) + random(twigKey + 17) * .045;
      const growth = [Math.cos(turn) * length, Math.sin(turn) * length,
        .09 + random(twigKey + 19) * (spreading ? .065 : .10)];
      const tip = add(end, growth);
      const secondaryCurve = curve(end, tip, [.018 * Math.sin(turn), -.018 * Math.cos(turn), .005], 4);
      const secondary = m.tube(secondaryCurve, [.021, .018, .014, .011],
        { sides: 5, start: primary.at(-1), rounded: true });
      // Unequal lateral buds break the symmetrical candelabra silhouette.
      for (let k = 0; k < 2; k++) {
        const budKey = twigKey + k * 43, parent = k ? secondary[3] : secondary[2];
        const base = secondaryCurve[k ? 3 : 2];
        const azimuth = turn + (k ? -.9 : 1.35) + .4 * random(budKey + 23);
        const reach2 = .022 + random(budKey + 29) * .026;
        const drift = [Math.cos(azimuth) * reach2, Math.sin(azimuth) * reach2,
          .035 + random(budKey + 37) * .052];
        const budCurve = curve(base, add(base, drift), [-.008 * Math.sin(azimuth), .008 * Math.cos(azimuth), 0], 3);
        m.tube(budCurve, [.012, .010, .007],
          { sides: 5, start: parent, rounded: true });
      }
    }
  }
  return finish(m);
}

function roundedColony(seed, mode = 'massive', detail = 4) {
  const m = mesh(), { directions, triangles } = hemisphere(detail);
  const low = mode === 'encrusting', lobed = mode === 'lobed';
  const bulges = Array.from({ length: lobed ? 5 : 3 }, (_, i) => {
    const angle = i * 2.399963 + seed;
    const z = .25 + random(seed + i * 17) * .58, r = Math.sqrt(1 - z * z);
    return [Math.cos(angle) * r, Math.sin(angle) * r, z];
  });
  for (let i = 0; i < directions.length; i++) {
    const p = directions[i], angle = Math.atan2(p[1], p[0]);
    const undulation = .055 * Math.sin(3 * angle + seed) + .03 * Math.cos(5 * angle - seed);
    const bumps = bulges.reduce((sum, b) => sum + Math.exp(-sub(p, b).reduce((s, n) => s + n * n, 0) / .13), 0);
    const radius = 1 + undulation + (lobed ? .42 : .055) * bumps;
    const roughness = (low ? .012 : .036) * Math.sin(p[0] * 19 + 2.8 * Math.sin(7 * p[1]) + seed)
      * Math.sin(p[1] * 15 + 2 * Math.sin(6 * p[0]) - seed);
    m.point([p[0] * .52 * radius, p[1] * .43 * radius,
      p[2] === 0 ? 0 : p[2] * (low ? .22 : .50) * (1 + .10 * p[0] - .07 * p[1] + (lobed ? .28 : .08) * bumps + roughness)]);
    if (i % 43 === 0 && p[2] > .15) m.nodes.add(i);
  }
  for (const face of triangles) m.face(...face);
  const rim = directions.map((p, i) => ({ p, i })).filter(({ p }) => p[2] === 0)
    .sort((a, b) => Math.atan2(a.p[1], a.p[0]) - Math.atan2(b.p[1], b.p[0])).map(({ i }) => i);
  m.cap(rim, [0, 0, 0], true);
  return finish(m);
}

function youngColony(seed) {
  const m = mesh();
  // A few unequal buds on a shared low base, used at the edges of mature colonies.
  for (let i = 0; i < 4; i++) {
    const key = seed + i * 37, angle = i * 2.399963 + random(key) * .8;
    const r = .07 + random(key + 1) * .10, height = .18 + random(key + 2) * .23;
    const root = [Math.cos(angle) * r, Math.sin(angle) * r, 0];
    const lean = [.09 * Math.cos(angle), .09 * Math.sin(angle), height];
    m.tube([root, add(root, scale(lean, .43)), add(root, scale(lean, .78)), add(root, lean)],
      [.058, .047, .049, .031], { sides: 5, rounded: true });
  }
  return finish(m);
}

function folioseColony(seed) {
  const m = mesh(), sectors = 18, rows = 5;
  // Offset partial plates form a low rosette; there is no stack of circular tables.
  for (let leaf = 0; leaf < 3; leaf++) {
    const key = seed + leaf * 71, turn = leaf * 2.399963 + random(key) * .5;
    const spread = 3.6 + random(key + 7) * .6, reach = .39 + random(key + 11) * .14;
    const centre = [.025 * Math.cos(turn), .025 * Math.sin(turn), .05 + leaf * .048];
    const top = [m.point(centre)], rings = [], upperFaces = [];
    for (let row = 1; row <= rows; row++) {
      const t = row / rows, ring = [];
      for (let j = 0; j <= sectors; j++) {
        const theta = turn + (j / sectors - .5) * spread;
        const edge = 1 + .09 * Math.sin(5 * theta + seed) + .045 * Math.sin(9 * theta + leaf);
        const r = reach * t * (1 + (edge - 1) * t * t);
        const z = centre[2] + .09 * t * t + .024 * Math.sin(theta * 3 + leaf) * t * t
          + .022 * Math.sin(theta - turn) * t;
        const index = m.point([centre[0] + r * Math.cos(theta), centre[1] + r * Math.sin(theta), z]);
        ring.push(index); top.push(index);
      }
      if (!rings.length) for (let j = 0; j < sectors; j++) upperFaces.push([top[0], ring[j], ring[j + 1]]);
      else for (let j = 0; j < sectors; j++) {
        const prev = rings.at(-1);
        upperFaces.push([prev[j], ring[j], ring[j + 1]], [prev[j], ring[j + 1], prev[j + 1]]);
      }
      rings.push(ring);
    }
    const bottom = new Map(top.map(i => [i, m.point(add(m.vertices[i], [0, 0, -.014]))]));
    for (const face of upperFaces) {
      m.face(...face);
      m.face(...face.map(i => bottom.get(i)).reverse());
    }
    const boundary = [top[0], ...rings.map(r => r[0]), ...rings.at(-1).slice(1),
      ...rings.slice(0, -1).reverse().map(r => r.at(-1))];
    m.join(boundary.map(i => bottom.get(i)), boundary);
    for (let j = 2; j < sectors; j += 5) m.nodes.add(rings.at(-1)[j]);
    // The folded inner portion reaches the substrate, so the rosette has no hovering centre.
    if (leaf === 0) m.tube([[0, 0, 0], centre], [.055, .045], { sides: 6, rounded: true });
  }
  return finish(m);
}

function softTuft(seed, open = false) {
  const m = mesh(), count = open ? 5 : 7;
  for (let i = 0; i < count; i++) {
    const key = seed + i * 47, angle = i * 2.399963 + random(key) * .55;
    const reach = .10 + random(key + 5) * (open ? .13 : .08);
    const base = [Math.cos(angle) * reach * .60, Math.sin(angle) * reach * .60, 0];
    const height = .20 + random(key + 11) * .13;
    const end = [Math.cos(angle) * reach + .06, Math.sin(angle) * reach, height];
    const centres = Array.from({ length: 5 }, (_, row) => {
      const t = row / 4;
      return [base[0] + (end[0] - base[0]) * t * t, base[1] + (end[1] - base[1]) * t * t, height * t];
    });
    const stalk = m.tube(centres, [.032, .029, .032, .033, .027], { sides: 6, rounded: true });
    const fingers = open ? 2 : 3;
    for (let finger = 0; finger < fingers; finger++) {
      const turn = angle + (finger - (fingers - 1) / 2) * 1.4;
      const attachment = finger === 0 ? 2 : finger === 1 ? 3 : 4;
      const base = centres[attachment];
      const drift = [.075 * Math.cos(turn), .075 * Math.sin(turn), .065 + random(key + finger * 19 + 17) * .06];
      m.tube([base, add(base, scale(drift, .55)), add(base, drift)], [.019, .021, .014],
        { sides: 6, start: stalk[attachment], rounded: true });
    }
  }
  return finish(m);
}

function seaweedRibbons(seed) {
  const m = mesh(), count = 4, rows = 13, across = 2;
  for (let blade = 0; blade < count; blade++) {
    const key = seed + blade * 53, turn = blade * 2.399963 + random(key) * .6;
    const length = .68 + random(key + 5) * .34, width = .044 + random(key + 7) * .024;
    const root = [.025 * Math.cos(turn), .025 * Math.sin(turn), 0];
    const rings = [], surfaceFaces = [], front = [];
    for (let row = 0; row <= rows; row++) {
      const t = row / rows, ring = [];
      const drift = .26 * t ** 1.7 + .10 * Math.sin(t * 5 + blade) * t;
      const x = root[0] + Math.cos(turn) * drift, y = root[1] + Math.sin(turn) * drift;
      const angle = turn + .6 * Math.sin(t * 4 + seed + blade);
      const breadth = width * (.20 + .80 * Math.sin(Math.PI * t) ** .65) * (1 - t * .90);
      for (let j = 0; j <= across; j++) {
        const u = (j / across - .5) * 2;
        const index = m.point([x + Math.cos(angle) * breadth * u, y + Math.sin(angle) * breadth * u,
          length * t + .012 * Math.sin(t * 9 + blade) * u * t]);
        ring.push(index); front.push({ index, angle });
      }
      if (rings.length) for (let j = 0; j < across; j++) {
        const prev = rings.at(-1);
        surfaceFaces.push([prev[j], ring[j], ring[j + 1]], [prev[j], ring[j + 1], prev[j + 1]]);
      }
      rings.push(ring);
    }
    // A thin volume remains visible from either side as the blade twists in the current.
    const back = new Map(front.map(({ index, angle }) => [index,
      m.point(add(m.vertices[index], [Math.sin(angle) * .002, -Math.cos(angle) * .002, 0]))]));
    for (const face of surfaceFaces) {
      m.face(...face); m.face(...face.map(i => back.get(i)).reverse());
    }
    const boundary = [...rings[0], ...rings.slice(1).map(r => r.at(-1)),
      ...rings.at(-1).slice(0, -1).reverse(), ...rings.slice(1, -1).reverse().map(r => r[0])];
    m.join(boundary.map(i => back.get(i)), boundary);
    m.nodes.add(rings.at(-1)[1]);
  }
  return finish(m);
}

export const ORGANIC_CORALS = {
  staghorn: staghorn(11),
  staghorn_spreading: staghorn(29),
  staghorn_tangled: staghorn(47),
  brain_lobes: brainLobes(7),
  brain_ridged: brainLobes(19, true),
  shelf_coral: shelfCoral(3),
  cauliflower: cauliflower(23),
  cauliflower_small: cauliflower(23, 4),
  coral_bush: coralBush(61),
  coral_bush_broad: coralBush(103),
  lace_fan: laceFan(13),
  branching_compact: compactBranches(83),
  branching_compact_2: compactBranches(191),
  branching_compact_3: compactBranches(227),
  branching_spreading: compactBranches(137, true),
  massive_coral: roundedColony(31),
  massive_coral_2: roundedColony(157),
  massive_lobed: roundedColony(71, 'lobed'),
  massive_lobed_2: roundedColony(193, 'lobed'),
  encrusting_coral: roundedColony(109, 'encrusting'),
  young_lobed: roundedColony(239, 'lobed', 3),
  young_encrusting: roundedColony(263, 'encrusting', 3),
  young_fingers: youngColony(281),
  young_fingers_2: youngColony(313),
  foliose_coral: folioseColony(43),
  soft_tuft: softTuft(89),
  soft_tuft_open: softTuft(149, true),
  seaweed_ribbons: seaweedRibbons(59),
  seaweed_ribbons_open: seaweedRibbons(131),
};
