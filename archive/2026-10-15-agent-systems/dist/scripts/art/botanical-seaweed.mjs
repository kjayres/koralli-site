// Original revision03 Figma leaf paths; only placement matrices change.
const LEAVES = ["<g transform=\"matrix(0.042246948394 0.016772330008 -0.016772330008 0.042246948394 -3.085477880103 -5.162677096556)\"><g><path d=\"M 105.00,80.52 C 107.53,83.30 105.31,87.26 109.83,90.91 C 113.26,93.57 121.48,91.02 125.59,94.83 C 125.61,87.72 122.52,82.32 117.17,82.55 C 112.47,83.23 108.06,81.67 105.00,80.52 Z\" fill=\"#244EFF\" fill-opacity=\"0.028\" /><path d=\"M 105.00,80.52 C 109.68,85.76 118.51,85.33 125.59,94.83 C 125.61,87.72 122.52,82.32 117.17,82.55 C 112.47,83.23 108.06,81.67 105.00,80.52 Z\" fill=\"#244EFF\" fill-opacity=\"0.095\" /><path d=\"M 105.00,80.52 C 107.53,83.30 105.31,87.26 109.83,90.91 C 113.26,93.57 121.48,91.02 125.59,94.83 C 125.61,87.72 122.52,82.32 117.17,82.55 C 112.47,83.23 108.06,81.67 105.00,80.52 Z\" fill=\"none\" stroke=\"#244EFF\" stroke-width=\"0.78\" stroke-opacity=\"0.91\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M 105.00,80.52 C 109.68,85.76 118.51,85.33 125.59,94.83\" fill=\"none\" stroke=\"#244EFF\" stroke-width=\"0.45\" stroke-opacity=\"0.55\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M 114.63,85.69 C 116.63,85.37 118.39,84.43 119.94,84.76\" fill=\"none\" stroke=\"#244EFF\" stroke-width=\"0.38\" stroke-opacity=\"0.34\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></g>", "<g transform=\"matrix(0.039306177542 -0.013825176965 -0.013825176965 -0.039306177542 -4.129927558690 4.583144125082)\"><g><path d=\"M 130.00,70.88 C 129.70,66.40 126.69,63.64 126.46,58.64 C 125.39,53.42 132.33,46.40 135.01,43.16 C 132.77,49.80 139.18,52.13 137.77,58.98 C 136.88,64.39 131.72,64.93 130.00,70.88 Z\" fill=\"#244EFF\" fill-opacity=\"0.028\" /><path d=\"M 126.46,58.64 C 125.39,53.42 132.33,46.40 135.01,43.16 C 126.79,55.98 133.11,61.64 130.00,70.88 C 129.70,66.40 126.69,63.64 126.46,58.64 Z\" fill=\"#244EFF\" fill-opacity=\"0.095\" /><path d=\"M 130.00,70.88 C 129.70,66.40 126.69,63.64 126.46,58.64 C 125.39,53.42 132.33,46.40 135.01,43.16 C 132.77,49.80 139.18,52.13 137.77,58.98 C 136.88,64.39 131.72,64.93 130.00,70.88 Z\" fill=\"none\" stroke=\"#244EFF\" stroke-width=\"0.78\" stroke-opacity=\"0.91\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M 130.00,70.88 C 133.11,61.64 126.79,55.98 135.01,43.16\" fill=\"none\" stroke=\"#244EFF\" stroke-width=\"0.45\" stroke-opacity=\"0.55\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M 129.10,57.46 Q 132.01,54.90 136.62,53.54\" fill=\"none\" stroke=\"#244EFF\" stroke-width=\"0.38\" stroke-opacity=\"0.34\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></g>", "<g transform=\"matrix(0.037502797692 0.008534055666 -0.008534055666 0.037502797692 -5.071133118941 -3.715913387111)\"><g><path d=\"M 150.00,64.95 C 154.15,65.61 157.32,67.82 159.80,72.85 C 161.26,78.12 164.41,81.40 172.79,81.90 C 174.18,72.78 167.14,74.65 165.79,69.89 C 162.58,66.35 155.60,68.47 150.00,64.95 Z\" fill=\"#244EFF\" fill-opacity=\"0.028\" /><path d=\"M 159.80,72.85 C 161.26,78.12 164.41,81.40 172.79,81.90 C 174.18,72.78 167.14,74.65 165.79,69.89 Q 164.03,72.69 159.80,72.85 Z\" fill=\"#244EFF\" fill-opacity=\"0.095\" /><path d=\"M 150.00,64.95 C 154.15,65.61 157.32,67.82 159.80,72.85 C 161.26,78.12 164.41,81.40 172.79,81.90 C 174.18,72.78 167.14,74.65 165.79,69.89 C 162.58,66.35 155.60,68.47 150.00,64.95 Z\" fill=\"none\" stroke=\"#244EFF\" stroke-width=\"0.78\" stroke-opacity=\"0.91\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M 150.00,64.95 C 161.24,67.46 161.71,77.75 172.79,81.90\" fill=\"none\" stroke=\"#244EFF\" stroke-width=\"0.45\" stroke-opacity=\"0.55\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M 159.80,72.85 Q 163.56,74.13 165.79,69.89\" fill=\"none\" stroke=\"#244EFF\" stroke-width=\"0.38\" stroke-opacity=\"0.34\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></g>"];

const clean = (s) => String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const n = (value) => Number(value).toFixed(3);

/** x/y are the leaf base; angle follows the stem in degrees; length is in px. */
export function botanicalLeafMarkup({x=0,y=0,angle=0,length=24,side=1,variant=0}={}) {
  const index=((Math.trunc(variant)%3)+3)%3;
  return `<g class="botanical-leaf" transform="translate(${n(x)} ${n(y)}) rotate(${n(angle)}) scale(${n(length)} ${n(length*(side<0?-1:1))})">${LEAVES[index]}</g>`;
}

/** A single continuous original-style stem through a sequence of [x,y] points. */
export function botanicalPath(points) {
  if (!Array.isArray(points)||points.length<2) return '';
  const p=(point)=>`${n(point[0])},${n(point[1])}`;
  let d=`M ${p(points[0])}`;
  for(let i=0;i<points.length-1;i++) {
    const a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],e=points[Math.min(points.length-1,i+2)];
    const u=[b[0]+(c[0]-a[0])/6,b[1]+(c[1]-a[1])/6];
    const v=[c[0]-(e[0]-b[0])/6,c[1]-(e[1]-b[1])/6];
    d+=` C ${p(u)} ${p(v)} ${p(c)}`;
  }
  return d;
}

/** Pass one complete SVG path or points, and explicitly positioned leaf bases. */
export function botanicalConnectorMarkup(path,leaves=[]) {
  const d=Array.isArray(path)?botanicalPath(path):path;
  return `<g class="botanical-connector"><path d="${clean(d)}" fill="none" stroke="#244EFF" stroke-width="1" stroke-opacity=".87" stroke-linecap="round" stroke-linejoin="round"/>${leaves.map(botanicalLeafMarkup).join('')}</g>`;
}
