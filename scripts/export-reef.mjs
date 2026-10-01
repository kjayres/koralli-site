import { mkdirSync, writeFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const number = value => {
  if (!Number.isFinite(value)) throw new TypeError(`Non-finite reef coordinate: ${value}`);
  return String(Math.round(value * 10) / 10);
};

function recorder() {
  const elements = [], classes = new Map(), stack = [];
  let path = '', x = 0, y = 0;
  const style = rule => {
    if (!classes.has(rule)) classes.set(rule, `s${classes.size}`);
    return classes.get(rule);
  };
  // The renderer still builds its depth buffer. Its opaque raster underpainting
  // is omitted; the exported strokes and nodes have already passed depth tests.
  const surface = () => ({
    width: 0, height: 0,
    getContext() {
      return {
        createImageData(width, height) { return { data: new Uint8ClampedArray(width * height * 4) }; },
        putImageData() {},
      };
    },
  });
  const ctx = {
    canvas: { ownerDocument: { createElement: surface } },
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1,
    getTransform() { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; },
    save() { stack.push([this.fillStyle, this.strokeStyle, this.lineWidth]); },
    restore() { [this.fillStyle, this.strokeStyle, this.lineWidth] = stack.pop(); },
    clearRect() { elements.length = 0; },
    drawImage() {},
    beginPath() { path = ''; },
    moveTo(px, py) {
      x = Number(number(px)); y = Number(number(py));
      path += `M${x} ${y}`;
    },
    lineTo(px, py) {
      const nx = Number(number(px)), ny = Number(number(py));
      if (nx !== x || ny !== y) {
        const relative = `l${number(nx - x)} ${number(ny - y)}`, absolute = `L${nx} ${ny}`;
        path += relative.length < absolute.length ? relative : absolute;
      }
      x = nx; y = ny;
    },
    closePath() { path += 'Z'; },
    arc(cx, cy, radius, start, end) {
      if (Math.abs(end - start - Math.PI * 2) > .000001) throw new Error('Reef exporter only supports complete node circles.');
      const r = Number(number(radius)), diameter = number(r * 2);
      path += `M${number(cx + r)} ${number(cy)}a${r} ${r} 0 1 0 -${diameter} 0a${r} ${r} 0 1 0 ${diameter} 0Z`;
    },
    fillRect(rx, ry, width, height) {
      elements.push(`<path class="${style(`fill:${this.fillStyle}`)}" d="M${number(rx)} ${number(ry)}h${number(width)}v${number(height)}h-${number(width)}Z"/>`);
    },
    fill() {
      if (path) elements.push(`<path class="${style(`fill:${this.fillStyle}`)}" d="${path}"/>`);
    },
    stroke() {
      if (path) elements.push(`<path class="${style(`fill:none;stroke:${this.strokeStyle};stroke-width:${Math.round(this.lineWidth * 100) / 100}`)}" d="${path}"/>`);
    },
  };
  return {
    ctx,
    svg(width, height) {
      const css = [...classes].map(([rule, name]) => `.${name}{${escape(rule)}}`).join('');
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="title desc" stroke-linecap="round" stroke-linejoin="round"><title id="title">Koralli reef</title><desc id="desc">A low view across varied coral colonies, ribbon seaweed, blue-green chromis and two hawksbill turtles. Native wireframe geometry with hidden edges removed.</desc><defs><style>${css}</style></defs>${elements.join('')}</svg>\n`;
    },
  };
}

export function reefSnapshot(Reef, { width = 1440, height = 560, seconds = 0 } = {}) {
  const drawing = recorder(), reef = new Reef();
  const state = { ctx: drawing.ctx, w: width, h: height, t: seconds * 60, reefSkipCache: true };
  reef.drawReef(state);
  return { svg: drawing.svg(width, height), stats: state.reefFrameStats };
}

export async function exportReefVariants({ modulePath = 'src/scripts/art/reef.mjs', outputDir = 'src/assets/artwork' } = {}) {
  const { Reef } = await import(pathToFileURL(resolve(modulePath)).href);
  mkdirSync(outputDir, { recursive: true });
  return [['reef', 1440, 560], ['reef-mobile', 390, 440]].map(([name, width, height]) => {
    const { svg, stats } = reefSnapshot(Reef, { width, height });
    const path = resolve(outputDir, `${name}.svg`);
    writeFileSync(path, svg);
    return { path, bytes: Buffer.byteLength(svg), ...stats };
  });
}

// Run from the project root: node scripts/export-reef.mjs
if (process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])) {
  for (const result of await exportReefVariants({ modulePath: process.argv[2], outputDir: process.argv[3] })) {
    console.log(`${result.path}: ${result.bytes} bytes; ${result.triangles} source triangles.`);
  }
}
