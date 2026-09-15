import {mkdirSync, writeFileSync, realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';

function element(dataset = {}) {
  return {
    dataset, attributes: {}, innerHTML: '',
    setAttribute(name, value) { this.attributes[name] = String(value); },
    removeAttribute(name) { delete this.attributes[name]; }
  };
}

// The generated source uses nested SVG groups. Replace one complete named group.
function replaceGroup(markup, attribute, index, state) {
  const opening = new RegExp(`<g\\b[^>]*\\b${attribute}="${index}"[^>]*>`).exec(markup);
  if (!opening) throw new Error(`Missing ${attribute}=${index}`);
  const groups = /<\/?g\b[^>]*>/g;
  groups.lastIndex = opening.index;
  let depth = 0, end = 0, match;
  while ((match = groups.exec(markup))) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (!depth) { end = groups.lastIndex; break; }
  }
  if (!end) throw new Error('Unclosed SVG group');
  let tag = opening[0];
  for (const name of Object.keys(state.attributes)) tag = tag.replace(new RegExp(` ${name}="[^"]*"`, 'g'), '');
  tag = tag.replace(/ transform="[^"]*"/g, '');
  const attributes = Object.entries(state.attributes).map(([key,value]) => `${key}="${value}"`).join(' ');
  return markup.slice(0, opening.index) + tag.slice(0, -1) + ' ' + attributes + '>' + state.innerHTML + '</g>' + markup.slice(end);
}

export function buildingSnapshot({buildingMarkup, updateBuilding}, progress, reducedMotion = false, id = 'koralli-building') {
  const covers = Array.from({length: 5}, (_, i) => element({cover: String(i)}));
  const floors = Array.from({length: 5}, (_, i) => element({floor: String(i)}));
  const world = element();
  const svg = {
    dataset: {figurePrefix: String(id).replace(/[^a-zA-Z0-9_-]/g, '') || 'koralli-company-building'},
    querySelectorAll(selector) { return selector === '[data-floor]' ? floors : covers; },
    querySelector() { return world; }
  };
  updateBuilding(svg, progress, reducedMotion);
  const labels = ['Strategy and executives', 'Operating model and teams', 'Process and product', 'Systems and models', 'Technical and research detail'];
  floors.forEach((floor, i) => { floor.setAttribute('id', `interior-${i+1}`); floor.setAttribute('data-name', labels[i]); });
  covers.forEach((cover, i) => { cover.setAttribute('id', `cover-${i+1}`); cover.setAttribute('data-name', `Section ${i+1} removable exterior`); });
  let markup = buildingMarkup(id);
  for (let i = 0; i < 5; i++) {
    markup = replaceGroup(markup, 'data-cover', i, covers[i]);
    markup = replaceGroup(markup, 'data-floor', i, floors[i]);
  }
  markup = markup.replace(/<g\b[^>]*data-building-world=""[^>]*>/, `<g data-building-world="" transform="${world.attributes.transform}">`);
  return markup;
}

export async function exportBuildingVariants({modulePath = 'src/scripts/art/building.mjs', outputDir = 'src/assets/artwork', decorate = svg => svg} = {}) {
  const building = await import(pathToFileURL(resolve(modulePath)).href);
  const variants = [
    ['building', 0, false],
    ['building-lift', .07, false],
    ['building-mid', .136, false],
    ['building-operating-mid', .336, false],
    ...['strategy','operating-model','process-product','systems-models','research'].map((name,i) => [`building-0${i+1}-${name}`, (i+.6)/5, true])
  ];
  mkdirSync(outputDir, {recursive: true});
  const paths = [];
  for (const [name, progress, reducedMotion] of variants) {
    const path = resolve(outputDir, `${name}.svg`);
    writeFileSync(path, decorate(buildingSnapshot(building, progress, reducedMotion, name)));
    paths.push(path);
  }
  return paths;
}

// Run from the project root: node scripts/export-building.mjs
if (process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])) {
  const paths = await exportBuildingVariants({modulePath: process.argv[2], outputDir: process.argv[3]});
  console.log(`Exported ${paths.length} editable building SVGs.`);
}
