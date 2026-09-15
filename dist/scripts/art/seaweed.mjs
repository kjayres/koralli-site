const BLUE = '#244EFF';
const num = (n) => Math.round(Number(n) * 1000) / 1000;
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/** A small, original seaweed sprig. Angle is in degrees; its axis points right. */
export function leafMarkup({ x = 0, y = 0, angle = 0, scale = 1, side = 1 } = {}) {
  return `<g class="seaweed-leaves" transform="translate(${num(x)} ${num(y)}) rotate(${num(angle)}) scale(${num(scale)} ${num(scale * (side < 0 ? -1 : 1))})" stroke="${BLUE}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 .1 C13 -2 20 -15 33 -18 C31 -10 26 -2 17 .7 C11 2.1 6 1.3 3 .1Z" fill="${BLUE}" fill-opacity=".035" stroke-width=".65"/>
    <path d="M3 .1 C14 -1 22 -6 29 -13 C25 -5 18 .8 11 1.2Z" fill="${BLUE}" fill-opacity=".045" stroke="none"/>
    <path d="M18 -1.2 C25 3 30 11 42 10 C38 4 29 -.5 18 -1.2Z" fill="${BLUE}" fill-opacity=".035" stroke-width=".62"/>
    <path d="M28 -1.7 C37 -3.6 43 -10 51 -9 C47 -3 39 .1 28 -1.7Z" fill="none" stroke-width=".60"/>
    <path d="M-4 1.8 C11 -1 27 -.6 47 -7" fill="none" stroke-width=".72"/>
    <g fill="none" stroke-width=".42" opacity=".40">
      <path d="M10 -.7 l3 -2.3 M14 -1.5 l3 -3.1 M18 -3 l2.6 -3.4 M22 -5.3 l2.2 -3.4"/>
      <path d="M26 2.7 l2.5 .4 M29 4.7 l2.5 .3 M32 6.7 l2.3 -.1 M36 -2.5 l2.8 -2.3 M40 -3.8 l2.5 -2.1"/>
    </g>
  </g>`;
}

/** Position and clockwise tangent angle on one cubic Bézier, in SVG pixels. */
export function pointOnCubic(points, t) {
  if (!Array.isArray(points) || points.length !== 4) throw new TypeError('Provide four [x, y] cubic control points.');
  const [a,b,c,d] = points;
  const u = 1 - t;
  const x = u*u*u*a[0] + 3*u*u*t*b[0] + 3*u*t*t*c[0] + t*t*t*d[0];
  const y = u*u*u*a[1] + 3*u*u*t*b[1] + 3*u*t*t*c[1] + t*t*t*d[1];
  const dx = 3*u*u*(b[0]-a[0]) + 6*u*t*(c[0]-b[0]) + 3*t*t*(d[0]-c[0]);
  const dy = 3*u*u*(b[1]-a[1]) + 6*u*t*(c[1]-b[1]) + 3*t*t*(d[1]-c[1]);
  return { x, y, angle: Math.atan2(dy,dx) * 180 / Math.PI };
}

function wavyPosition(points, t, { amplitude = 2.2, waves = 2.4, phase = 0 } = {}) {
  const p = pointOnCubic(points, t);
  const angle = p.angle * Math.PI / 180;
  const offset = Math.sin(t * Math.PI) * Math.sin(t * Math.PI * 2 * waves + phase) * amplitude;
  return { x: p.x - Math.sin(angle) * offset, y: p.y + Math.cos(angle) * offset };
}

/** Position leaves on the wavering line itself, including its local tangent. */
export function pointOnSeaweed(points, t, options = {}) {
  const p = wavyPosition(points, t, options);
  const before = wavyPosition(points, Math.max(0, t-.0001), options);
  const after = wavyPosition(points, Math.min(1, t+.0001), options);
  return { ...p, angle: Math.atan2(after.y-before.y,after.x-before.x) * 180 / Math.PI };
}

/**
 * A restrained wavering stem along an arbitrary cubic. Endpoints stay fixed.
 * Use phase=0 for static art; optional phase can be updated slowly by a caller.
 */
export function seaweedPath(points, { amplitude = 2.2, waves = 2.4, phase = 0 } = {}) {
  const samples = Array.from({ length: 25 }, (_, i) => {
    const p = wavyPosition(points, i/24, {amplitude,waves,phase});
    return [p.x, p.y];
  });
  let result = `M${num(samples[0][0])} ${num(samples[0][1])}`;
  for (let i = 0; i < samples.length - 1; i++) {
    const p0 = samples[Math.max(0,i-1)], p1 = samples[i], p2 = samples[i+1], p3 = samples[Math.min(samples.length-1,i+2)];
    result += ` C${num(p1[0]+(p2[0]-p0[0])/6)} ${num(p1[1]+(p2[1]-p0[1])/6)},${num(p2[0]-(p3[0]-p1[0])/6)} ${num(p2[1]-(p3[1]-p1[1])/6)},${num(p2[0])} ${num(p2[1])}`;
  }
  return result;
}

/**
 * Insert this SVG group beneath the stones. `path` can be SVG path data or four
 * cubic control points. Leaves use {x,y,angle,scale,side}, or {t,scale,side} when
 * a cubic is supplied. A leaf near t=.85 gives the connector a small living tip.
 */
export function seaweedMarkup(path, leaves = [], options = {}) {
  const cubic = Array.isArray(path) ? path : null;
  const d = cubic ? seaweedPath(cubic, options) : path;
  const { opacity = .74, strokeWidth = .8 } = options;
  const leafPoints = leaves.map((leaf) => cubic && Number.isFinite(leaf.t) ? { ...pointOnSeaweed(cubic,leaf.t,options), ...leaf } : leaf);
  return `<g class="seaweed-connector" opacity="${num(opacity)}"><path class="seaweed-stem" d="${escape(d)}" fill="none" stroke="${BLUE}" stroke-width="${num(strokeWidth)}" stroke-linecap="round" stroke-linejoin="round"/>${leafPoints.map(leafMarkup).join('')}</g>`;
}
