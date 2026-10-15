// Atolla wyvillei, drawn in the journal's pale wireframe palette.
// Crown groove and the single long trailing tentacle follow MBARI observations:
// https://www.mbari.org/animal/deep-sea-crown-jelly/
// https://www.mbari.org/wp-content/uploads/2015/10/Walker.pdf
// The motion is an illustration of pulsing and drift, not a biological simulation.
const TAU = Math.PI * 2;
const hash = n => {
  const value = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return value - Math.floor(value);
};
const smooth = x => x * x * (3 - 2 * x);
const noise = (x, seed) => {
  const cell = Math.floor(x), t = smooth(x - cell);
  return (hash(cell + seed * 71) * (1 - t) + hash(cell + 1 + seed * 71) * t) * 2 - 1;
};
const elapsed = (time, options) => options.reducedMotion || !Number.isFinite(Number(time)) ? 0 : Math.max(0, Number(time));

// A short squeeze followed by a slower recovery. Both joins have zero velocity.
export function jellyPulse(time) {
  const phase = ((time / 5.8 + .18) % 1 + 1) % 1;
  return phase < .29 ? smooth(phase / .29) : 1 - smooth((phase - .29) / .71);
}

export function jellyPose(width, height, time = 0, options = {}) {
  const seconds = elapsed(time, options), compact = options.compact ?? width < 700;
  const pulse = jellyPulse(seconds);
  // The brief rise follows the contraction; slow recovery lets the animal settle.
  const thrust = jellyPulse(seconds - .38);
  return {
    seconds, compact, pulse, radius: compact ? 14 : 25,
    x: width * (compact ? .88 : .91) + noise(seconds * .023, 301) * (compact ? 8 : 25),
    y: Math.min(height * .255, 435) + noise(seconds * .03, 98) * 15 - thrust * (compact ? 2.2 : 3.8),
    tilt: .10 * Math.sin(seconds * .13 + .8) + noise(seconds * .037, 75) * .07
  };
}

/** Native 3D curves in bell-radius units, projected by the small canvas renderer. */
export function jellyGeometry(time = 0, compact = false, current = 0) {
  const seconds = Number.isFinite(time) ? time : 0;
  const water = Number.isFinite(current) ? Math.max(-1, Math.min(1, current)) : 0;
  const pulse = jellyPulse(seconds), paths = [], tentacles = [];
  const segments = compact ? 60 : 80;
  const profile = [[0, .69], [.23, .66], [.46, .56], [.61, .38], [.69, .19], [.77, .24], [.9, .13], [1, .035]];
  const surface = (row, phi) => {
    const [r, z] = profile[row];
    const outer = Math.max(0, (r - .6) / .4);
    const radius = r * (1 - pulse * .15) * (1 + outer * .045 * Math.cos(phi * 20));
    return [Math.cos(phi) * radius, Math.sin(phi) * radius,
      z * (1 + pulse * .18) + outer * .023 * Math.cos(phi * 20)];
  };
  for (let row = 1; row < profile.length; row++) {
    const points = Array.from({ length: segments + 1 }, (_, i) => surface(row, i / segments * TAU));
    paths.push({ points, strong: row === 4 || row === 7, name: row === 4 ? 'crown-groove' : 'bell-ring' });
  }
  const ribs = compact ? 20 : 40;
  for (let rib = 0; rib < ribs; rib++) {
    paths.push({ points: profile.map((_, row) => surface(row, rib / ribs * TAU)), strong: false, name: 'crown-rib' });
  }
  for (let i = 0; i < 21; i++) {
    const long = i === 20, phi = (long ? 13 : i) / 20 * TAU;
    const root = surface(7, phi);
    const count = long ? (compact ? 40 : 64) : (compact ? 16 : 24);
    const length = long ? 6.8 : 1.45 + hash(i + 431) * .95;
    const spread = long ? .04 : .30 + hash(i + 610) * .35;
    const points = [root];
    // Successive short segments preserve length as the trailing filament bends.
    for (let j = 1; j <= count; j++) {
      const u = (j - .5) / count;
      const lagged = seconds - u * (long ? 2.2 : .85);
      const lagPulse = jellyPulse(lagged);
      const wave = Math.sin(u * (long ? 7.8 : 4.8) - lagged * .55 + i * 1.73);
      const curl = Math.pow(u, 2.5) * Math.sin(seconds * .17 + i * 2.4) * (long ? .85 : .48);
      const angle = spread * Math.cos(phi) * (1 - u) + water * u * .28
        + wave * (.045 + u * (long ? .20 : .13)) + curl;
      const depthAngle = spread * Math.sin(phi) * (1 - u) + Math.sin(u * 5 - lagged * .4 + i) * u * .08;
      // Slight drawing-in during contraction varies among tentacles through lag.
      const dx = Math.sin(angle) * (1 - lagPulse * .06);
      const dy = Math.sin(depthAngle);
      const dz = -Math.sqrt(Math.max(.05, 1 - dx * dx - dy * dy));
      const norm = Math.hypot(dx, dy, dz), step = length / count;
      const last = points.at(-1);
      points.push([last[0] + dx / norm * step, last[1] + dy / norm * step, last[2] + dz / norm * step]);
    }
    const tentacle = { name: long ? 'trailing-tentacle' : 'marginal-tentacle', strong: true, points, length };
    paths.push(tentacle); tentacles.push(tentacle);
  }
  return { paths, tentacles, pulse };
}

export function drawJournalJelly(ctx, width, height, time = 0, options = {}) {
  if (!ctx || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
  const pose = jellyPose(width, height, time, options);
  // The longest fixed-length filament is 6.8 bell radii; its root and projection
  // fit within nine radii for every pulse, tilt and current.
  const reach = pose.radius * 9 + 2;
  if (options.viewport && (pose.y + reach < options.viewport.top || pose.y - reach > options.viewport.bottom)) return;
  const current = options.reducedMotion ? 0 : Number(options.current) || 0;
  const geometry = jellyGeometry(pose.seconds, pose.compact, current);
  const cos = Math.cos(pose.tilt), sin = Math.sin(pose.tilt);
  const project = ([x, y, z]) => {
    const screenY = y * .32 - z;
    return [pose.x + (x * cos - screenY * sin) * pose.radius,
      pose.y + (x * sin + screenY * cos) * pose.radius];
  };
  ctx.save();
  ctx.strokeStyle = '#9AAEDC'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const strong of [false, true]) {
    ctx.lineWidth = strong ? .54 : .42;
    ctx.globalAlpha = (pose.compact ? .19 : .25) * (strong ? 1 : .64);
    ctx.beginPath();
    for (const path of geometry.paths) {
      if (path.strong !== strong) continue;
      ctx.moveTo(...project(path.points[0]));
      for (let i = 1; i < path.points.length; i++) ctx.lineTo(...project(path.points[i]));
    }
    ctx.stroke();
  }
  ctx.restore();
}
