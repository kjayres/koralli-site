const TAU = Math.PI * 2;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const mix = (a, b, t) => a + (b - a) * t;
const wrap = (value, span) => ((value % span) + span) % span;

/** A mantle-first pass. Both ends of the 45-second cycle are fully offstage. */
export function squidPose(width, height, seconds = 0, { compact = false, reducedMotion = false, scrollProgress = 0 } = {}) {
  const elapsed = Number(seconds);
  const time = reducedMotion ? 11.5 : Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  const phase = wrap(time + 1.2, 45), duration = 31;
  const length = compact ? Math.min(width * .86, 330) : Math.min(width * .68, 1000);
  const scale = length / 3.06, margin = 28;
  const start = -1.12 * scale - margin, finish = width + 1.94 * scale + margin;
  const x = reducedMotion ? width * .5 + scale * .42 : mix(start, finish, Math.min(phase / duration, 1));
  const centre = x - scale * .42;
  const quiet = .76 + .24 * clamp(Math.abs(centre - width * .5) / (width * .36), 0, 1);
  return { x, y: Math.min(height * .18, compact ? 164 : 145) + Math.sin(time * .095 + .4) * (compact ? 3 : 5)
      + (reducedMotion ? 0 : clamp(Number(scrollProgress) || 0, 0, 1) * 3),
    scale, time, phase, active: reducedMotion || phase <= duration,
    yaw: .13 + .035 * Math.sin(time * .07), roll: .10 * Math.sin(time * .08 + .5),
    pitch: .01 * Math.sin(time * .10), alpha: (compact ? .23 : .27) * quiet };
}

/** Native three-dimensional curves: eight arms and two much longer tentacles. */
export function squidGeometry(time = 0, compact = false) {
  const paths = [], appendages = [];
  const path = (points, tone = 0, name = '') => { paths.push({ points, tone, name }); return points; };
  const segments = compact ? 8 : 12;

  function tube(centres, radii, sides = segments, name = '', outline = true) {
    const rings = centres.map(([x, y, z], row) => Array.from({ length: sides + 1 }, (_, j) => {
      const angle = j / sides * TAU;
      return [x, y + Math.cos(angle) * radii[row][0], z + Math.sin(angle) * radii[row][1]];
    }));
    for (const ring of rings) path(ring, 0, name);
    for (let j = 0; j < sides; j++) path(rings.map(ring => ring[j]), outline && (j === 0 || j === sides / 2) ? 2 : 0, name);
    if (!compact) for (let row = 0; row < rings.length - 1; row += 2) for (let j = 0; j < sides; j += 2)
      path([rings[row][j], rings[row + 1][j + 1]], 0, name);
    return rings;
  }

  // The long tapering mantle leads; the head and appendages trail behind it.
  const profile = [[.13, .078], [.22, .091], [.36, .108], [.51, .105], [.65, .087], [.78, .060], [.89, .030], [.99, .003]];
  const centres = [], radii = [], mantleRows = compact ? 15 : 23;
  for (let row = 0; row <= mantleRows; row++) {
    const x = mix(.13, .99, row / mantleRows);
    let i = 1;
    while (i < profile.length - 1 && x > profile[i][0]) i++;
    const [a, ra] = profile[i - 1], [b, rb] = profile[i];
    const radius = mix(ra, rb, (x - a) / (b - a));
    centres.push([x, 0, 0]); radii.push([radius, radius * .87]);
  }
  tube(centres, radii, segments, 'mantle');
  tube([[-.115, 0, 0], [-.07, 0, 0], [-.015, 0, 0], [.055, 0, 0], [.13, 0, 0]],
    [[.064, .061], [.079, .075], [.088, .087], [.080, .078], [.074, .070]], segments, 'head');

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
        return [x, side * (root + reach * v), .029 * v * Math.sin(Math.PI * u) * Math.sin(time * .75 - u * 4 + side * .25)];
      }));
    }
    for (const row of grid) path(row, 0, 'fin');
    for (let j = 0; j < 4; j++) path(grid.map(row => row[j]), j === 3 ? 2 : 0, 'fin');
  }

  const armRows = compact ? 11 : 16, armSides = compact ? 4 : 6;
  for (let arm = 0; arm < 8; arm++) {
    const angle = arm / 8 * TAU + .18, length = [.73, .66, .81, .70, .77, .64, .83, .72][arm];
    const centres = [], radii = [];
    for (let row = 0; row <= armRows; row++) {
      const u = row / armRows, trail = u * u;
      centres.push([-.10 - length * u,
        Math.cos(angle) * (.054 + .080 * Math.sin(u * Math.PI / 2))
          + .016 * trail * Math.sin(time * .63 - u * 5.4 + arm * .79),
        Math.sin(angle) * (.052 + .080 * Math.sin(u * Math.PI / 2))
          + .014 * trail * Math.cos(time * .57 - u * 5 + arm)]);
      const radius = .017 * (1 - u) ** 1.22 + .001;
      radii.push([radius, radius * .78]);
    }
    tube(centres, radii, armSides, `arm-${arm}`, false);
    appendages.push({ kind: 'arm', root: centres[0], tip: centres.at(-1), length });
  }

  // Two thin feeding tentacles extend well beyond the arm crown. The final
  // section broadens into a club; their length is not eight identical curls.
  for (const side of [-1, 1]) {
    const centres = [], radii = [], rows = compact ? 23 : 32;
    const length = side < 0 ? 1.68 : 1.79;
    for (let row = 0; row <= rows; row++) {
      const u = row / rows, reach = u * u;
      centres.push([-.10 - length * u,
        side * (.038 + .070 * u) + .026 * reach * Math.sin(time * .52 - u * 5.4 + side * .8),
        side * .030 + .029 * reach * Math.cos(time * .47 - u * 4.8 + side)]);
      const club = Math.sin(clamp((u - .82) / .18, 0, 1) * Math.PI) ** .70;
      const radius = (.006 * (1 - .62 * u) + .019 * club) * (u === 1 ? .22 : 1);
      radii.push([radius, radius * .68]);
    }
    tube(centres, radii, armSides, `tentacle-${side}`, true);
    appendages.push({ kind: 'tentacle', root: centres[0], tip: centres.at(-1), length });
  }

  // Large lateral eyes sit in the head. Fine concentric curves describe the
  // globe without turning it into a solid cartoon eye.
  for (const side of [-1, 1]) {
    for (const radius of [1, .65, .27]) {
      const ring = Array.from({ length: 17 }, (_, j) => {
        const angle = j / 16 * TAU;
        return [-.018 + Math.cos(angle) * .034 * radius, Math.sin(angle) * .038 * radius,
          side * (.081 + .020 * Math.sqrt(1 - radius * radius))];
      });
      path(ring, side < 0 ? 2 : 0, 'eye');
    }
  }
  return { paths, appendages };
}

/** Draw after setting the canvas DPR transform; dimensions are CSS pixels. */
export function drawJournalSquid(ctx, width, height, seconds = 0, options = {}) {
  if (!ctx || !Number.isFinite(width + height) || width <= 0 || height <= 0) return;
  const pose = squidPose(width, height, seconds, options);
  if (!pose.active) return;
  const compact = options.compact ?? false, geometry = squidGeometry(pose.time, compact);
  const cy = Math.cos(pose.yaw), sy = Math.sin(pose.yaw), cr = Math.cos(pose.roll), sr = Math.sin(pose.roll);
  const cp = Math.cos(pose.pitch), sp = Math.sin(pose.pitch);
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
