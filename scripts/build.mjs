import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync, realpathSync } from 'node:fs';
import { resolve, dirname, relative, isAbsolute, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { buildingMarkup } from '../src/scripts/art/building.mjs';
import { workbenchMarkup, escapeHTML } from '../src/scripts/workflow-view.mjs';

export const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const sourceDir = resolve(projectDir, 'src');
export const outputDir = resolve(projectDir, 'dist');
const pages = ['index.html', 'our-work.html', 'who-we-are.html', 'views-from-the-reef.html', 'how-we-work.html', 'artwork.html'];

function expand(name, stack = []) {
  const path = resolve(sourceDir, name);
  if (relative(sourceDir, path).startsWith('..')) throw new Error(`Include outside src: ${name}`);
  if (stack.includes(name)) throw new Error(`Circular include: ${[...stack, name].join(' -> ')}`);
  return readFileSync(path, 'utf8').replace(/<!-- include: ([\w./-]+) -->/g, (_, child) => expand(child, [...stack, name]))
    .replace('<!-- artwork: building -->', buildingMarkup());
}

function articlesMarkup() {
  const articles = JSON.parse(readFileSync(resolve(sourceDir, 'content/articles.json'), 'utf8'));
  const escape = text => String(text).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  if (!articles.length) return '<p class="article-pending mono">ARTICLES TO BE ADDED</p>';
  return articles.map((article, i) => {
    if (!article.title || !article.href || !/^(https:\/\/|\/(?!\/))/.test(article.href)) throw new Error('Each article needs a title and a local or HTTPS link.');
    return `<article class="article-row"><span class="mono">${String(i+1).padStart(2,'0')}</span><div><p class="eyebrow">${escape(article.date || '')}</p><h3><a href="${escape(article.href)}">${escape(article.title)} ↗</a></h3><p>${escape(article.summary || '')}</p></div></article>`;
  }).join('');
}

function checkedBasePath(basePath) {
  if (basePath !== './' && (typeof basePath !== 'string' || !/^\/(?:[A-Za-z0-9._~-]+\/)*$/.test(basePath) || basePath.split('/').some(part => part === '.' || part === '..'))) {
    throw new Error('Base path must be ./, /, or a path such as /koralli-site/.');
  }
  return basePath;
}

function withBasePath(name, bytes, basePath) {
  if (basePath === '/' || !/\.(?:html|css|m?js)$/.test(name)) return bytes;
  let text = bytes.toString().replace(/(\b(?:src|href)=["'])\/(?!\/)/g, (_, lead) => lead + basePath);
  if (name.endsWith('.css')) text = text.replace(/(\burl\(\s*["']?)\/(?!\/)([^"')\s]*)/g, (_, lead, target) => lead + (basePath === './' ? posix.relative(posix.dirname(name), target) : basePath + target));
  if (name.endsWith('.html')) text = text.replace(/(\bcontent=["']\s*[\d.]+\s*;\s*url=)\/(?!\/)/gi, (_, lead) => lead + basePath);
  return Buffer.from(text);
}

export function renderSite(basePath = './') {
  checkedBasePath(basePath);
  const files = new Map();
  const people = JSON.parse(readFileSync(resolve(sourceDir, 'content/people.json'), 'utf8'));
  const profiles = people.map((person, i) => `<article class="person"><div class="person-index mono"><span>${String(i+1).padStart(2,'0')}</span><i class="${escapeHTML(person.kind)}"></i></div><div><p class="eyebrow">${escapeHTML(person.field)}</p><h3>${escapeHTML(person.name)}</h3></div><p class="person-bio">${escapeHTML(person.bio)}</p></article>`).join('\n');
  for (const name of pages) files.set(name, Buffer.from(expand(name)
    .replace('<!-- content: articles -->', articlesMarkup())
    .replace('<!-- content: workbench -->', workbenchMarkup())
    .replace('<!-- content: people -->', profiles)));
  function walk(directory) {
    for (const entry of readdirSync(resolve(sourceDir, directory), { withFileTypes: true })) {
      const name = `${directory}/${entry.name}`;
      if (entry.isDirectory()) walk(name);
      else files.set(name, readFileSync(resolve(sourceDir, name)));
    }
  }
  ['styles', 'scripts', 'assets', 'content'].forEach(walk);
  for (const [name, bytes] of files) {
    if (!name.endsWith('.html')) continue;
    const html = bytes.toString();
    if (/<!-- (?:include|artwork|content):|\{\{|sc-camel-|<sc-/.test(html)) throw new Error(`Unresolved template in ${name}`);
    for (const match of html.matchAll(/(?:src|href)="\/([^"#]*)(?:#[^"]*)?"/g)) {
      if (!files.has(match[1] || 'index.html')) throw new Error(`Missing local link in ${name}: /${match[1]}`);
    }
  }
  for (const [name, bytes] of files) files.set(name, withBasePath(name, bytes, basePath));
  return files;
}

function inside(parent, path) {
  const child = relative(parent, path);
  return child === '' || (!isAbsolute(child) && child !== '..' && !child.startsWith('../'));
}

function checkedOutputDir(directory) {
  if (typeof directory !== 'string' || !directory.trim()) throw new Error('Output directory cannot be empty.');
  const requested = resolve(directory);
  let ancestor = requested;
  while (!existsSync(ancestor)) ancestor = dirname(ancestor);
  const target = resolve(realpathSync(ancestor), relative(ancestor, requested));
  if (inside(target, projectDir) || (inside(projectDir, target) && !inside(outputDir, target))) {
    throw new Error('Output must be dist/ or a separate directory outside the project.');
  }
  return target;
}

export function writeSite(files, directory = outputDir) {
  const destination = checkedOutputDir(directory);
  for (const [name, bytes] of files) {
    const path = resolve(destination, name);
    if (existsSync(path) && readFileSync(path).equals(bytes)) continue;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, bytes);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const basePath = process.argv.find(arg => arg.startsWith('--base='))?.slice(7) ?? './';
    const destination = checkedOutputDir(process.argv.find(arg => arg.startsWith('--out='))?.slice(6) ?? outputDir);
    const files = renderSite(basePath);
    if (process.argv.includes('--check')) {
      for (const [name, bytes] of files) {
        if (!existsSync(resolve(destination, name)) || !readFileSync(resolve(destination, name)).equals(bytes)) throw new Error(`Build is out of date: ${name}`);
        if (/\.m?js$/.test(name)) {
          const result = spawnSync(process.execPath, ['--check', resolve(destination, name)], { encoding: 'utf8' });
          if (result.status) throw new Error(result.stderr);
        }
      }
      console.log(`All ${pages.length} pages, local links, assets and JavaScript checked. Build matches source.`);
    } else {
      writeSite(files, destination);
      console.log(`Built ${pages.length} native HTML pages and ${files.size - pages.length} supporting files in ${destination}.`);
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
