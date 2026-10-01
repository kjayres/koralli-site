import { reefFishMarkup } from './reef-life.mjs';

const BLUE = '#6485FF';
const CORAL = '#FF6655';

// Organic silhouettes contain a flat mesh; every visible mark remains a line or node.
const forms = {
  branch: {
    start: [83, 228],
    curves: [
      [82, 204, 83, 181, 70, 164], [56, 152, 33, 147, 28, 129],
      [22, 109, 7, 103, 6, 85], [5, 69, 21, 68, 27, 84],
      [34, 105, 42, 116, 49, 114], [59, 111, 47, 88, 53, 80],
      [62, 69, 72, 78, 71, 94], [70, 113, 70, 128, 80, 133],
      [88, 137, 90, 112, 87, 94], [84, 74, 68, 65, 68, 48],
      [68, 34, 83, 30, 89, 47], [94, 61, 98, 72, 103, 69],
      [107, 66, 100, 37, 106, 22], [113, 8, 126, 13, 126, 28],
      [126, 46, 117, 68, 122, 78], [127, 87, 133, 67, 142, 65],
      [156, 62, 162, 74, 150, 87], [136, 102, 121, 111, 121, 133],
      [121, 146, 139, 138, 149, 124], [160, 108, 155, 93, 164, 88],
      [177, 81, 186, 96, 178, 116], [172, 131, 153, 149, 137, 157],
      [116, 168, 106, 184, 111, 226], [103, 233, 94, 233, 83, 228],
    ],
  },
  fan: {
    start: [95, 216],
    curves: [
      [94, 191, 87, 177, 73, 167], [57, 154, 29, 148, 19, 129],
      [8, 111, 15, 96, 26, 99], [41, 102, 51, 127, 65, 126],
      [75, 124, 49, 98, 36, 80], [20, 56, 24, 35, 39, 37],
      [55, 39, 63, 68, 78, 77], [91, 85, 80, 56, 76, 39],
      [68, 10, 79, 0, 93, 8], [108, 17, 103, 48, 115, 58],
      [125, 63, 122, 33, 127, 18], [134, -1, 151, 4, 153, 21],
      [155, 38, 141, 70, 150, 74], [159, 78, 168, 44, 183, 36],
      [197, 28, 210, 42, 201, 63], [193, 84, 170, 102, 175, 109],
      [181, 117, 200, 96, 213, 100], [229, 105, 224, 122, 207, 136],
      [188, 154, 164, 155, 146, 171], [127, 188, 128, 204, 127, 216],
      [118, 222, 107, 222, 95, 216],
    ],
  },
  frond: {
    start: [65, 256],
    curves: [
      [61, 233, 70, 213, 59, 200], [47, 185, 20, 190, 12, 173],
      [3, 154, 22, 147, 38, 161], [49, 171, 68, 178, 68, 163],
      [68, 148, 38, 143, 27, 130], [10, 110, 24, 97, 43, 111],
      [57, 121, 75, 133, 76, 114], [77, 99, 49, 91, 43, 77],
      [33, 57, 46, 49, 61, 63], [73, 74, 79, 86, 86, 75],
      [94, 62, 77, 47, 83, 29], [89, 7, 113, 5, 117, 17],
      [123, 35, 105, 47, 108, 64], [110, 80, 124, 56, 136, 58],
      [152, 61, 146, 80, 128, 94], [112, 108, 99, 110, 99, 125],
      [100, 139, 117, 121, 130, 125], [147, 130, 135, 148, 117, 155],
      [98, 162, 92, 172, 91, 184], [91, 201, 110, 186, 120, 193],
      [132, 202, 118, 216, 104, 219], [84, 224, 81, 239, 83, 256],
      [78, 262, 71, 261, 65, 256],
    ],
  },
  lobes: {
    start: [89, 169],
    curves: [
      [80, 151, 65, 144, 41, 143], [18, 143, 5, 128, 11, 113],
      [17, 97, 47, 101, 49, 90], [52, 79, 26, 79, 23, 63],
      [19, 45, 35, 35, 48, 43], [62, 51, 62, 74, 74, 74],
      [87, 74, 76, 44, 84, 29], [95, 7, 115, 12, 119, 27],
      [124, 44, 110, 69, 124, 70], [135, 72, 140, 51, 154, 50],
      [174, 48, 182, 65, 169, 79], [153, 96, 141, 103, 149, 110],
      [156, 117, 173, 105, 186, 113], [203, 125, 188, 143, 170, 146],
      [145, 149, 126, 145, 120, 166], [115, 177, 99, 177, 89, 169],
    ],
  },
};

const composition = [
  { form: 'branch', x: .055, scale: .58, narrow: .78, rotation: -6, colour: BLUE },
  { form: 'lobes', x: .084, scale: .40, narrow: 1.05, rotation: 6, colour: CORAL },
  { form: 'frond', x: .116, scale: .46, narrow: .60, rotation: 5, colour: BLUE },
  { form: 'fan', x: .264, scale: .62, narrow: 1.0, rotation: -5, colour: CORAL },
  { form: 'branch', x: .305, scale: .39, narrow: .7, rotation: 8, colour: BLUE },
  { form: 'lobes', x: .226, scale: .29, narrow: 1.12, rotation: -4, colour: BLUE },
  { form: 'frond', x: .474, scale: .63, narrow: .56, rotation: -3, colour: BLUE },
  { form: 'branch', x: .514, scale: .49, narrow: .79, rotation: 7, colour: CORAL },
  { form: 'lobes', x: .540, scale: .33, narrow: 1.14, rotation: 3, colour: BLUE },
  { form: 'fan', x: .721, scale: .55, narrow: 1.03, rotation: 4, colour: BLUE },
  { form: 'frond', x: .683, scale: .42, narrow: .58, rotation: -9, colour: CORAL },
  { form: 'lobes', x: .760, scale: .31, narrow: 1.20, rotation: 5, colour: CORAL },
  { form: 'branch', x: .902, scale: .65, narrow: .74, rotation: 3, colour: CORAL },
  { form: 'fan', x: .942, scale: .33, narrow: 1.08, rotation: 8, colour: BLUE },
  { form: 'frond', x: .866, scale: .41, narrow: .53, rotation: -9, colour: BLUE },
];

const mobileComposition = [
  { form: 'branch', x: .082, scale: .58, narrow: .76, rotation: -5, colour: BLUE },
  { form: 'lobes', x: .166, scale: .37, narrow: 1.13, rotation: 6, colour: CORAL },
  { form: 'frond', x: .406, scale: .69, narrow: .54, rotation: -5, colour: BLUE },
  { form: 'fan', x: .493, scale: .52, narrow: .95, rotation: 4, colour: CORAL },
  { form: 'lobes', x: .577, scale: .30, narrow: 1.08, rotation: 6, colour: BLUE },
  { form: 'branch', x: .817, scale: .60, narrow: .75, rotation: 3, colour: CORAL },
  { form: 'frond', x: .915, scale: .46, narrow: .62, rotation: 8, colour: BLUE },
];

const point = p => p.map(n => n.toFixed(2)).join(' ');

function pathData(form) {
  return `M${point(form.start)} ${form.curves.map(c => `C${point(c)}`).join(' ')} Z`;
}

function contour(form) {
  let start = form.start;
  const points = [];
  for (const c of form.curves) {
    for (let step = 0; step < 16; step++) {
      const t = step / 16, u = 1 - t;
      points.push([0, 1].map(axis => u ** 3 * start[axis] + 3 * u ** 2 * t * c[axis] + 3 * u * t ** 2 * c[axis + 2] + t ** 3 * c[axis + 4]));
    }
    start = c.slice(4);
  }
  const lengths = [0];
  for (let i = 1; i <= points.length; i++) {
    const a = points[i - 1], b = points[i % points.length];
    lengths.push(lengths.at(-1) + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const total = lengths.at(-1), count = Math.round(total / 18);
  return Array.from({ length: count }, (_, i) => {
    const distance = total * i / count;
    let j = 0;
    while (lengths[j + 1] < distance) j++;
    const a = points[j], b = points[(j + 1) % points.length];
    const t = (distance - lengths[j]) / (lengths[j + 1] - lengths[j]);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  });
}

function mesh(form) {
  const points = [], lines = [];
  const columns = 14, rows = 17, gap = 19;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const i = row * columns + col;
      points.push([
        -15 + col * gap + (row % 2) * gap / 2 + Math.sin(i * 7.31) * 2.4,
        -9 + row * gap * .87 + Math.cos(i * 2.37) * 2.0,
      ]);
      if (col) lines.push([i - 1, i]);
      if (row) {
        lines.push([i - columns, i]);
        const other = col + (row % 2 ? 1 : -1);
        if (other >= 0 && other < columns) lines.push([(row - 1) * columns + other, i]);
      }
    }
  }
  const network = lines.map(([a, b]) => `M${point(points[a])} L${point(points[b])}`).join(' ');
  const nodes = points.filter((_, i) => i % 4 === 0).map(p => `<circle cx="${p[0].toFixed(2)}" cy="${p[1].toFixed(2)}" r="1.0"/>`).join('');
  const edgeNodes = contour(form).filter((_, i) => i % 2 === 0).map(p => `<circle cx="${p[0].toFixed(2)}" cy="${p[1].toFixed(2)}" r="1.2"/>`).join('');
  return { network, nodes, edgeNodes };
}

export const seabedY = (x, width) => 442 - Math.sin(x / width * Math.PI * 2.5) * 12 - Math.sin(x / width * Math.PI * 7) * 6;

function rootPoint(form) {
  let start = form.start, root = start;
  for (const c of form.curves) {
    for (let i = 0; i <= 64; i++) {
      const t = i / 64, u = 1 - t;
      const p = [0, 1].map(axis => u ** 3 * start[axis] + 3 * u ** 2 * t * c[axis] + 3 * u * t ** 2 * c[axis + 2] + t ** 3 * c[axis + 4]);
      if (p[1] > root[1]) root = p;
    }
    start = c.slice(4);
  }
  return root;
}

function groundMarkup(width) {
  const count = Math.ceil(width / 27), rows = [];
  for (let row = 0; row < 4; row++) {
    rows.push(Array.from({length: count + 1}, (_, i) => {
      const x = i * width / count;
      return [x, seabedY(x, width) + row * 22 + Math.sin(i * .71 + row) * row * 1.5];
    }));
  }
  return rows.map((row, k) => {
    const line = `M${row.map(point).join(' L')}`;
    const links = k ? row.map((p, i) => `M${point(p)} L${point(rows[k - 1][i])}${i < count ? ` L${point(row[i + 1])}` : ''}`).join(' ') : '';
    return `<path d="${line} ${links}" fill="none" stroke="#9CAECC" stroke-width=".65" opacity="${k ? '.12' : '.29'}"/>`;
  }).join('');
}

function artwork(layout, name, width, height) {
  const corals = layout.map((shape, i) => {
    const form = forms[shape.form], d = pathData(form), network = mesh(form), root = rootPoint(form);
    const id = `reef-mesh-${name}-${i}`, rootX = shape.x * width, rootY = seabedY(rootX, width);
    const transform = `translate(${rootX} ${rootY}) rotate(${shape.rotation}) scale(${shape.scale * shape.narrow} ${shape.scale}) translate(${-root[0]} ${-root[1]})`;
    return `<g class="reef-colony" transform="${transform}" color="${shape.colour}" data-root-x="${rootX}" data-root-y="${rootY}"><defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs><g clip-path="url(#${id})"><path d="${network.network}" fill="none" stroke="currentColor" stroke-width=".42" vector-effect="non-scaling-stroke" opacity=".56"/><g fill="currentColor" opacity=".83">${network.nodes}</g></g><path d="${d}" fill="none" stroke="currentColor" stroke-width=".65" vector-effect="non-scaling-stroke" opacity=".88"/><g fill="currentColor">${network.edgeNodes}</g></g>`;
  }).join('');
  return `<svg class="flat-reef-art flat-reef-art-${name}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" aria-hidden="true" focusable="false"><rect width="${width}" height="${height}" fill="#0C1630"/>${groundMarkup(width)}${corals}<g class="reef-static-fish">${reefFishMarkup(width, height, name === 'mobile')}</g></svg>`;
}

export function flatReefMarkup() {
  return artwork(composition, 'desktop', 1440, 540) + artwork(mobileComposition, 'mobile', 700, 540);
}
