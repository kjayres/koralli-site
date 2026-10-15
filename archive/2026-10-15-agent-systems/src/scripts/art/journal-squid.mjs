const TAU = Math.PI * 2;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const mix = (a, b, t) => a + (b - a) * t;
const wrap = (value, span) => ((value % span) + span) % span;
const smooth = value => { const u = clamp(value, 0, 1); return u * u * (3 - 2 * u); };
const hash = seed => { const n = Math.sin(seed * 91.73 + 17.19) * 41738.31; return n - Math.floor(n); };
const unit = vector => { const length = Math.hypot(...vector) || 1; return vector.map(value => value / length); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** A mantle-first pass. Both ends of the 45-second cycle are fully offstage. */
export function squidPose(width, height, seconds = 0, { compact = false, reducedMotion = false, scrollProgress = 0 } = {}) {
  const elapsed = Number(seconds);
  const time = reducedMotion ? 11.5 : Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  const phase = wrap(time + 1.2, 45), cycle = Math.floor((time + 1.2) / 45), duration = 31;
  const order = hash(Math.floor(cycle / 3) + 419) > .5 ? [0, 1, 2] : [0, 2, 1];
  const lane = reducedMotion ? 0 : order[cycle % 3], variation = hash(cycle + 127);
  const laneY = cycle === 0 || reducedMotion ? (compact ? 164 : 145)
    : lane === 0 ? (compact ? 155 + variation * 20 : 136 + variation * 28)
      : height * (lane === 1 ? .43 + variation * .13 : .72 + variation * .15);
  const length = compact ? Math.min(width * .86, 330) : Math.min(width * .68, 1000);
  const scale = length / 3.06, margin = 28;
  const start = -1.12 * scale - margin, finish = width + 1.94 * scale + margin;
  const progress = Math.min(phase / duration, 1);
  const x = reducedMotion ? width * .5 + scale * .42 : mix(start, finish, progress - .007 * Math.sin(progress * TAU * 4));
  const centre = x - scale * .42;
  const quiet = .60 + .40 * clamp(Math.abs(centre - width * .5) / (width * .36), 0, 1);
  return { x, y: clamp(laneY, Math.min(height / 2, 100), Math.max(height / 2, height - 100)) + Math.sin(time * .095 + .4) * (compact ? 3 : 5)
      + (reducedMotion ? 0 : clamp(Number(scrollProgress) || 0, 0, 1) * 3),
    scale, time, phase, cycle, lane, laneY, active: reducedMotion || phase <= duration,
    yaw: .13 + .035 * Math.sin(time * .07), roll: .10 * Math.sin(time * .08 + .5),
    pitch: .01 * Math.sin(time * .10), alpha: (compact ? .23 : .27) * quiet };
}

/** Native three-dimensional curves: eight arms and two much longer tentacles. */
export function squidGeometry(time = 0, compact = false) {
  const paths = [], appendages = [];
  const path = (points, tone = 0, name = '') => { paths.push({ points, tone, name }); return points; };
  const segments = compact ? 8 : 12;

  function tube(centres, radii, sides = segments, name = '', outline = true, follow = false) {
    const rings = centres.map(([x, y, z], row) => {
      let n, b;
      if (follow) {
        const previous = centres[Math.max(0, row - 1)], next = centres[Math.min(centres.length - 1, row + 1)];
        const tangent = unit(next.map((v, i) => v - previous[i]));
        n = unit([tangent[1], -tangent[0], 0]); b = cross(n, tangent);
      }
      return Array.from({ length: sides + 1 }, (_, j) => {
        const angle = j / sides * TAU;
        if (follow) return [x, y, z].map((v, i) => v + n[i] * Math.cos(angle) * radii[row][0] + b[i] * Math.sin(angle) * radii[row][1]);
        return [x, y + Math.cos(angle) * radii[row][0], z + Math.sin(angle) * radii[row][1]];
      });
    });
    for (const ring of rings) path(ring, 0, name);
    for (let j = 0; j < sides; j++) path(rings.map(ring => ring[j]), outline && (j === 0 || j === sides / 2) ? 2 : 0, name);
    if (!compact) for (let row = 0; row < rings.length - 1; row += 2) for (let j = 0; j < sides; j += 2)
      path([rings[row][j], rings[row + 1][j + 1]], 0, name);
    return rings;
  }

  function suckers(centres, radii, preferredNormal, count, from, to) {
    for (let row = 0; row < count; row++) {
      const u = mix(from, to, (row + .5) / count), along = u * (centres.length - 1), index = Math.floor(along), fraction = along - index;
      const previous = centres[Math.max(0, index - 1)], next = centres[Math.min(centres.length - 1, index + 1)];
      const tangent = unit(next.map((v, i) => v - previous[i])), dot = tangent.reduce((sum, v, i) => sum + v * preferredNormal[i], 0);
      const normal = unit(preferredNormal.map((v, i) => v - tangent[i] * dot)), across = cross(tangent, normal);
      const radius = mix(radii[index][0], radii[index + 1][0], fraction), cup = Math.min(.0045, radius * .34);
      for (const side of [-1, 1]) {
        const centre = centres[index].map((v, i) => mix(v, centres[index + 1][i], fraction)
          + normal[i] * radius * .80 + across[i] * side * radius * .42);
        const ring = Array.from({ length: 7 }, (_, j) => {
          const angle = j / 6 * TAU;
          return centre.map((v, i) => v + (tangent[i] * Math.cos(angle) + across[i] * Math.sin(angle)) * cup);
        });
        path(ring, 2, 'sucker');
        path([ring[0], centre.map((v, i) => v - normal[i] * cup * .4), ring[3]], 0, 'sucker-cup');
      }
    }
  }

  // The long tapering mantle leads; the head and appendages trail behind it.
  const profile = [[.13, .078], [.22, .091], [.36, .108], [.51, .105], [.65, .087], [.78, .060], [.89, .030], [.99, .003]];
  const centres = [], radii = [], mantleRows = compact ? 15 : 23;
  const pulse = (.5 + .5 * Math.sin(time * .84 - .4)) ** 5, contraction = 1 - .065 * pulse;
  for (let row = 0; row <= mantleRows; row++) {
    const x = mix(.13, .99, row / mantleRows);
    let i = 1;
    while (i < profile.length - 1 && x > profile[i][0]) i++;
    const [a, ra] = profile[i - 1], [b, rb] = profile[i];
    const radius = mix(ra, rb, (x - a) / (b - a));
    centres.push([.13 + (x - .13) * (1 + .018 * pulse), 0, 0]); radii.push([radius * contraction, radius * .87 * contraction]);
  }
  tube(centres, radii, segments, 'mantle');
  tube([[-.115, 0, 0], [-.08, 0, 0], [-.04, 0, 0], [0, 0, 0], [.04, 0, 0], [.085, 0, 0], [.13, 0, 0]],
    [[.064, .061], [.077, .073], [.089, .086], [.090, .089], [.084, .083], [.078, .075], [.074, .070]], segments, 'head');

  // The paired fins are membranes at the tapered end of the mantle. Their
  // root stays attached while a small wave travels along the free edge.
  for (const side of [-1, 1]) {
    const grid = [], rows = compact ? 8 : 12;
    for (let row = 0; row <= rows; row++) {
      const u = row / rows, x = mix(.52, .98, u);
      const root = .103 * (1 - u) ** .83 + .002;
      const reach = .082 * Math.sin(Math.PI * u) ** .8;
      grid.push(Array.from({ length: 4 }, (_, j) => {
        const v = j / 3;
        return [.13 + (x - .13) * (1 + .018 * pulse), side * (root * contraction + reach * v),
          .038 * v * Math.sin(Math.PI * u) * Math.sin(time * .75 - u * 4 + side * .25)];
      }));
    }
    for (const row of grid) path(row, 0, 'fin');
    for (let j = 0; j < 4; j++) path(grid.map(row => row[j]), j === 3 ? 2 : 0, 'fin');
  }

  const armRows = compact ? 14 : 20, armSides = compact ? 4 : 6;
  for (let arm = 0; arm < 8; arm++) {
    const angle = arm / 8 * TAU + .18, length = [.73, .66, .81, .70, .77, .64, .83, .72][arm];
    const centres = [], radii = [];
    let centre = [-.10, .054 * Math.cos(angle), .052 * Math.sin(angle)];
    const curl = (arm % 3 === 0 ? -1 : 1) * (1.05 + .60 * Math.sin(time * .24 + arm * 1.3));
    for (let row = 0; row <= armRows; row++) {
      const u = row / armRows;
      if (row) {
        const bend = .055 + .18 * u * Math.sin(time * .32 + arm * .9 - u * 4)
          + .08 * Math.sin(Math.PI * u) * Math.sin(time * .22 + arm * 1.8) + curl * smooth((u - .72) / .28);
        const turn = angle + .18 * u * Math.sin(time * .20 + arm * .73), step = length / armRows;
        centre = [centre[0] - Math.cos(bend) * step, centre[1] + Math.sin(bend) * Math.cos(turn) * step,
          centre[2] + Math.sin(bend) * Math.sin(turn) * step];
      }
      centres.push(centre);
      const radius = .017 * (1 - u) ** 1.22 + .001;
      radii.push([radius, radius * .78]);
    }
    tube(centres, radii, armSides, `arm-${arm}`, false, true);
    if (compact ? arm === 1 || arm === 3 : arm < 4) suckers(centres, radii, [0, -Math.cos(angle), -Math.sin(angle)], compact ? 6 : 8, .14, .74);
    appendages.push({ kind: 'arm', root: centres[0], tip: centres.at(-1), length, centres });
  }

  // Two thin feeding tentacles extend well beyond the arm crown. The final
  // section broadens into a club; their length is not eight identical curls.
  for (const side of [-1, 1]) {
    const centres = [], radii = [], rows = compact ? 23 : 32;
    const length = side < 0 ? 1.68 : 1.79;
    for (let row = 0; row <= rows; row++) {
      const u = row / rows, reach = u * u;
      centres.push([-.10 - length * u + .025 * reach * Math.sin(time * .42 + side - u * 3),
        side * (.038 + .055 * u) + .070 * u ** .8 * Math.sin(time * .49 - u * 5.2 + side * .8),
        side * .030 + .060 * u ** .85 * Math.cos(time * .42 - u * 4.4 + side)]);
      const club = Math.sin(clamp((u - .82) / .18, 0, 1) * Math.PI) ** .70;
      const radius = (.006 * (1 - .62 * u) + .019 * club) * (u === 1 ? .22 : 1);
      radii.push([radius, radius * .68]);
    }
    tube(centres, radii, armSides, `tentacle-${side}`, true, true);
    suckers(centres, radii, [0, 0, -1], compact ? 5 : 8, .845, .985);
    appendages.push({ kind: 'tentacle', root: centres[0], tip: centres.at(-1), length, centres });
  }

  // A shallow globe with meridians, iris and pupil. There is no animated lid:
  // the changing view comes from the head's three-dimensional orientation.
  for (const side of [-1, 1]) {
    const point = (latitude, angle) => [-.018 + Math.cos(angle) * .039 * Math.sin(latitude),
      Math.sin(angle) * .042 * Math.sin(latitude), side * (.078 + .035 * Math.cos(latitude))];
    for (const latitude of [Math.PI / 6, Math.PI / 3, Math.PI / 2]) {
      const ring = Array.from({ length: 17 }, (_, j) => {
        const angle = j / 16 * TAU;
        return point(latitude, angle);
      });
      path(ring, side < 0 ? 2 : 0, 'eye-globe');
    }
    for (let meridian = 0; meridian < 6; meridian++) path(Array.from({ length: 5 }, (_, row) => point(row / 4 * Math.PI / 2, meridian / 6 * TAU)), 0, 'eye-globe');
    path(Array.from({ length: 13 }, (_, j) => [-.018 + Math.cos(j / 12 * TAU) * .009,
      Math.sin(j / 12 * TAU) * .012, side * .1135]), side < 0 ? 2 : 0, 'eye-pupil');
  }
  return { paths, appendages, mantlePulse: pulse };
}

/** Draw after setting the canvas DPR transform; dimensions are CSS pixels. */
export function drawJournalSquid(ctx, width, height, seconds = 0, options = {}) {
  if (!ctx || !Number.isFinite(width + height) || width <= 0 || height <= 0) return;
  const pose = squidPose(width, height, seconds, options);
  if (!pose.active) return;
  const compact = options.compact ?? false;
  const cy = Math.cos(pose.yaw), sy = Math.sin(pose.yaw), cr = Math.cos(pose.roll), sr = Math.sin(pose.roll);
  const cp = Math.cos(pose.pitch), sp = Math.sin(pose.pitch);
  // Local bounds include the longest feeding tentacle, fixed-length curled arms,
  // tube radii and suckers. Project the box before constructing any live geometry.
  const vertical = [cy * sp - sy * .26 * cp,
    sr * sy * sp + (cr * .965 + sr * cy * .26) * cp,
    cr * sy * sp + (-sr * .965 + cr * cy * .26) * cp];
  const reach = (1.94 * Math.abs(vertical[0]) + .92 * Math.abs(vertical[1]) + .92 * Math.abs(vertical[2])) * pose.scale + 2;
  if (options.viewport && (pose.y + reach < options.viewport.top || pose.y - reach > options.viewport.bottom)) return;
  const geometry = squidGeometry(pose.time, compact);
  const project = ([x, y, z]) => {
    const ry = y * cr - z * sr, rz = y * sr + z * cr;
    const px = x * cy + rz * sy, py = ry * .965 + (rz * cy - x * sy) * .26;
    return [pose.x + (px * cp - py * sp) * pose.scale, pose.y + (px * sp + py * cp) * pose.scale];
  };
  ctx.save();
  ctx.strokeStyle = '#B5C4FA'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const tone of [0, 2]) {
    ctx.globalAlpha = pose.alpha * (tone ? 1 : .58);
    ctx.lineWidth = tone ? (compact ? .56 : .58) : (compact ? .39 : .41);
    ctx.beginPath();
    for (const item of geometry.paths) if (item.tone === tone) {
      const first = project(item.points[0]); ctx.moveTo(first[0], first[1]);
      for (let i = 1; i < item.points.length; i++) {
        const point = project(item.points[i]); ctx.lineTo(point[0], point[1]);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
}
