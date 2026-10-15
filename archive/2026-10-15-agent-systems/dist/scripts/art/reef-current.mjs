const clamp = (value, low = -1, high = 1) => Math.max(low, Math.min(high, value));
const smooth = value => value * value * (3 - 2 * value);
const seconds = time => Number.isFinite(time) ? Math.max(0, time) : 0;
const coordinate = value => Number.isFinite(value) ? clamp(value) : 0;
const wrap = value => ((value + 1) % 2 + 2) % 2 - 1;
const random = seed => {
  let n = Math.imul(seed + 271, 374761393);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};

/**
 * Shared dimensionless flow in [-1,1]. Time is seconds; x/y are normalised
 * habitat coordinates. Slow waves with different periods vary the current
 * without frame-by-frame randomness. This is an artistic field, not fluid physics.
 * For flexible growth, weight displacement by squared height above its base;
 * leave rigid geometry unchanged. Time 0 supplies the reduced-motion still.
 */
export function reefCurrent(time, x = 0, y = 0) {
  const t = seconds(time), px = coordinate(x), py = coordinate(y);
  const phase = .36 * px + .21 * py;
  return {
    x: .62 * Math.sin(.21 * t + phase + .4)
      + .25 * Math.sin(.083 * t - .22 * py + 1.6)
      + .13 * Math.sin(.031 * t + .17 * px + 4.1),
    y: .60 * Math.sin(.17 * t + phase + 2)
      + .27 * Math.sin(.067 * t + .30 * px - .15 * py + .2)
      + .13 * Math.sin(.023 * t + .13 * py + 5.5),
    z: .55 * Math.sin(.13 * t + .20 * px + .27 * py + 3.2)
      + .30 * Math.sin(.053 * t - .23 * px + 1.4)
      + .15 * Math.sin(.019 * t + .15 * py + .8),
  };
}

/**
 * Stable plankton tracks: x/y/z in [-1,1], size a relative radius (.55–1.20),
 * alpha in [0,.22]. The caller maps coordinates into its world and chooses the
 * particle count. Only x wraps, fading to zero at both edges. Compact mode keeps
 * the same tracks while slightly reducing their size/opacity. No state or clock
 * is retained; use time 0 for reduced motion and the same index after a resize.
 */
export function reefPlankton(time, index, compact = false) {
  const t = seconds(time), id = Number.isFinite(index) ? Math.trunc(index) : 0;
  const homeX = random(id * 19 + 1) * 2 - 1;
  const homeY = random(id * 19 + 3) * 2 - 1;
  const homeZ = random(id * 19 + 7) * 2 - 1;
  const flow = reefCurrent(t, homeX, homeY);
  const speed = .006 + random(id * 19 + 11) * .004;
  const x = wrap(homeX + t * speed + flow.x * .055);
  const y = homeY * .90 + flow.y * .065;
  const z = homeZ * .88 + flow.z * .05 + Math.sin(t * .11 + homeY * 4) * .025;
  const fade = smooth(clamp((1 - Math.abs(x)) / .18, 0, 1));
  return {
    x, y, z,
    size: (.55 + random(id * 19 + 13) * .65) * (compact ? .88 : 1),
    alpha: (.07 + random(id * 19 + 17) * .15) * fade * (compact ? .8 : 1),
  };
}
