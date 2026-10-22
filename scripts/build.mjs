import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync, realpathSync } from 'node:fs';
import { resolve, dirname, relative, isAbsolute, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { buildingMarkup } from '../src/scripts/art/building.mjs';

const escapeHTML = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const sourceDir = resolve(projectDir, 'src');
export const outputDir = resolve(projectDir, 'dist');
// The address the site will live at. Every page names its koralli.io URL as canonical, so a
// preview copy is never treated as the original.
export const siteURL = 'https://www.koralli.io';
// Where the preview is published before launch; share cards there point at preview images.
export const previewURL = 'https://kjayres.github.io/koralli-site';
const NOINDEX = '<meta name="robots" content="noindex,nofollow">';
// Redirect pages point at the page they forward to.
const canonicalPath = name => name === 'index.html' ? '/' : name === 'how-we-work.html' ? '/our-work.html' : `/${name}`;

const attr = text => String(text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const unescape = text => text.replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&amp;/g, '&');
// Tab icons and the card shown when a page is shared (LinkedIn, Slack, WhatsApp...). Articles
// share their own illustration when one exists in assets/brand/og/; other pages share the brand card.
function headTags(name, html, origin) {
  const title = unescape((html.match(/<title>([^<]*)<\/title>/) || [, 'koralli'])[1]).replace(/ · Koralli$/, '');
  const description = unescape((html.match(/<meta name="description" content="([^"]*)"/) || [, ''])[1]);
  const slug = name.replace(/\.html$/, ''), article = html.includes('class="article-page"');
  const image = article && existsSync(resolve(sourceDir, `assets/brand/og/${slug}.jpg`)) ? `assets/brand/og/${slug}.jpg` : 'assets/brand/og-card.jpg';
  const published = (html.match(/<time datetime="([^"]+)"/) || [])[1];
  return [
    '<link rel="icon" href="/assets/brand/favicon.svg" type="image/svg+xml">',
    '<link rel="icon" href="/assets/brand/favicon-32.png" sizes="32x32" type="image/png">',
    '<link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png">',
    '<meta name="theme-color" content="#F3F0E8">',
    `<meta property="og:type" content="${article ? 'article' : 'website'}">`,
    '<meta property="og:site_name" content="koralli">',
    `<meta property="og:title" content="${attr(title)}">`,
    description && `<meta property="og:description" content="${attr(description)}">`,
    `<meta property="og:url" content="${origin}${canonicalPath(name)}">`,
    `<meta property="og:image" content="${origin}/${image}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    article && published && `<meta property="article:published_time" content="${published}">`,
    '<meta name="twitter:card" content="summary_large_image">',
  ].filter(Boolean).map(tag => `  ${tag}\n`).join('');
}

// Addresses from the previous koralli.io site. Top-level ones get a small redirect page;
// anything deeper (old posts, service pages) is caught by 404.html.
const LEGACY_PAGES = { 'home.html': '/', 'what-we-do.html': '/our-work.html', 'why-us.html': '/', 'contact.html': '/#contact', 'service-offerings.html': '/our-work.html' };
// Every article lists its old koralli.io address, so old links land on the new page.
const ARTICLES = JSON.parse(readFileSync(resolve(sourceDir, 'content/articles.json'), 'utf8'));
const MOVED_ARTICLES = Object.fromEntries(ARTICLES.filter(a => a.legacy && a.href.startsWith('/')).map(a => [a.legacy, a.href.slice(1)]));
const redirectPage = target => `<!doctype html>\n<html lang="en-GB">\n<head>\n  <meta charset="utf-8">\n  <meta name="robots" content="noindex">\n  <meta http-equiv="refresh" content="0;url=${target}">\n  <title>Koralli</title>\n</head>\n<body><p><a href="${target}">Continue to koralli</a></p></body>\n</html>\n`;
// Served for any unknown address. It works out the site root (a GitHub Pages project path
// or the domain root), sends old post and service addresses to their nearest new page,
// and otherwise offers a way home.
const notFoundPage = () => `<!doctype html>\n<html lang="en-GB">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width,initial-scale=1">\n  <meta name="robots" content="noindex">\n  <title>Page not found · Koralli</title>\n  <script>\n    (() => {\n      const parts = location.pathname.split('/').filter(Boolean);\n      const root = location.hostname.endsWith('github.io') && parts.length ? '/' + parts.shift() + '/' : '/';\n      const moved = ${JSON.stringify(MOVED_ARTICLES)};\n      const [section, slug] = parts;\n      let target = null;\n      if (section === 'views-from-the-reef') target = moved[slug] || 'views-from-the-reef.html';\n      else if (section === 'service-offerings') target = 'our-work.html';\n      else if (section === 'dist') target = parts.slice(1).join('/');\n      if (target !== null) location.replace(root + target + location.search + location.hash);\n      addEventListener('DOMContentLoaded', () => { document.querySelector('[data-home]').href = root; });\n    })();\n  </script>\n  <style>body{margin:0;min-height:100vh;display:grid;place-content:center;gap:18px;padding:24px;background:#F3F0E8;color:#111;font-family:system-ui,sans-serif;text-align:center}a{color:#244EFF}</style>\n</head>\n<body><h1>Page not found</h1><p><a data-home href="/">Go to the koralli home page</a></p></body>\n</html>\n`;
// The main pages, then one page per article in content/articles.json.
const pages = [
  'index.html', 'our-work.html', 'who-we-are.html', 'views-from-the-reef.html', 'how-we-work.html',
  ...ARTICLES.filter(a => a.href.startsWith('/')).map(a => a.href.slice(1)),
];

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
  if (!articles.length) return '<p class="article-pending">No essays published yet.</p>';
  return articles.map(article => {
    if (!article.title || !article.href || !/^(https:\/\/|\/(?!\/))/.test(article.href)) throw new Error('Each article needs a title and a local or HTTPS link.');
    return `<article class="article-row"><div><div class="article-meta"><p class="eyebrow article-topic">${escape(article.topic || 'ESSAY')}</p><p class="eyebrow article-date">${escape(article.date || '')}</p></div><h3><a href="${escape(article.href)}">${escape(article.title)}<span class="article-arrow" aria-hidden="true">↗</span></a></h3><p>${escape(article.summary || '')}</p></div></article>`;
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

export function withAssetVersions(files) {
  const modules = [...files.keys()].filter(name => /\.(?:m?js|css)$/.test(name)).sort();
  const hash = createHash('sha256');
  for (const name of modules) hash.update(name).update('\0').update(files.get(name)).update('\0');
  const version = hash.digest('hex').slice(0, 12);
  const versioned = target => {
    const hashAt = target.indexOf('#'), fragment = hashAt < 0 ? '' : target.slice(hashAt);
    const location = hashAt < 0 ? target : target.slice(0, hashAt), queryAt = location.indexOf('?');
    const path = queryAt < 0 ? location : location.slice(0, queryAt);
    const query = new URLSearchParams(queryAt < 0 ? '' : location.slice(queryAt + 1));
    query.set('v', version);
    return `${path}?${query}${fragment}`;
  };
  for (const [name, bytes] of files) {
    let text;
    if (/\.m?js$/.test(name)) text = bytes.toString().replace(
      /(\b(?:from\s*|import\s*\(\s*|import\s*))(["'])(\.{1,2}\/[^"']+\.m?js(?:[?#][^"']*)?)\2/g,
      (_, lead, quote, target) => lead + quote + versioned(target) + quote);
    else if (name.endsWith('.html')) text = bytes.toString().replace(
      /(<script\b[^>]*?\bsrc\s*=\s*)(["'])([^"']+)\2/gi,
      (match, lead, quote, target) => /^[a-z][a-z\d+.-]*:|^\/\//i.test(target) || !/\.m?js(?:[?#]|$)/.test(target)
        ? match : lead + quote + versioned(target.replaceAll('&amp;', '&')).replaceAll('&', '&amp;') + quote)
      .replace(/(<link\b[^>]*?\bhref\s*=\s*)(["'])([^"']+\.css(?:[?#][^"']*)?)\2/gi,
        (match, lead, quote, target) => /^[a-z][a-z\d+.-]*:|^\/\//i.test(target) ? match
          : lead + quote + versioned(target.replaceAll('&amp;', '&')).replaceAll('&', '&amp;') + quote);
    if (text !== undefined) files.set(name, Buffer.from(text));
  }
  return files;
}

/**
 * launch: build for the live domain. Pages drop the noindex tag that keeps preview copies
 * out of search results, and the site gains robots.txt and sitemap.xml.
 */
export function renderSite(basePath = './', { launch = false } = {}) {
  checkedBasePath(basePath);
  const files = new Map();
  const people = JSON.parse(readFileSync(resolve(sourceDir, 'content/people.json'), 'utf8'));
  const profiles = people.map(person => {
    const portrait = person.portrait ? `<img class="person-portrait" src="${escapeHTML(person.portrait)}" alt="Portrait of ${escapeHTML(person.name)}" width="320" height="384" loading="lazy" decoding="async">` : '';
    return `<article class="person"><div class="person-index" aria-hidden="true"><i class="${escapeHTML(person.kind)}"></i></div><div class="person-identity${person.portrait ? ' person-identity--portrait' : ''}">${portrait}<div><p class="eyebrow">${escapeHTML(person.field)}</p><h3>${escapeHTML(person.name)}</h3></div></div><div class="person-bio">${person.bio.split(/\n\n/).map(paragraph => `<p>${escapeHTML(paragraph)}</p>`).join('')}</div></article>`;
  }).join('\n');
  for (const name of pages) {
    let html = expand(name)
      .replace('<!-- content: articles -->', articlesMarkup())
      .replace('<!-- content: people -->', profiles);
    if (!html.includes(NOINDEX)) throw new Error(`${name} must carry the preview noindex tag; launch builds remove it.`);
    if (launch) html = html.replace(`  ${NOINDEX}\n`, '').replace(NOINDEX, '');
    html = html.replace('</head>', `  <link rel="canonical" href="${siteURL}${canonicalPath(name)}">\n${headTags(name, html, launch ? siteURL : previewURL)}</head>`);
    files.set(name, Buffer.from(html));
  }
  for (const [name, target] of Object.entries(LEGACY_PAGES)) files.set(name, Buffer.from(redirectPage(target)));
  files.set('404.html', Buffer.from(notFoundPage()));
  if (launch) {
    const listed = pages.filter(name => name !== 'how-we-work.html');
    files.set('robots.txt', Buffer.from(`User-agent: *\nAllow: /\n\nSitemap: ${siteURL}/sitemap.xml\n`));
    files.set('sitemap.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${listed.map(name => `  <url><loc>${siteURL}${canonicalPath(name)}</loc></url>`).join('\n')}\n</urlset>\n`));
  }
  function walk(directory) {
    for (const entry of readdirSync(resolve(sourceDir, directory), { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const name = `${directory}/${entry.name}`;
      if (entry.isDirectory()) walk(name);
      else files.set(name, readFileSync(resolve(sourceDir, name)));
    }
  }
  // content/ is read at build time only, so it is not published.
  ['styles', 'scripts', 'assets'].forEach(walk);
  // Browsers ask for /favicon.ico on their own, so it lives at the root.
  files.set('favicon.ico', readFileSync(resolve(sourceDir, 'favicon.ico')));
  for (const [name, bytes] of files) {
    if (!name.endsWith('.html')) continue;
    const html = bytes.toString();
    if (/<!-- (?:include|artwork|content):|\{\{|sc-camel-|<sc-/.test(html)) throw new Error(`Unresolved template in ${name}`);
    for (const match of html.matchAll(/(?:src|href)="\/([^"#]*)(?:#[^"]*)?"/g)) {
      if (!files.has(match[1] || 'index.html')) throw new Error(`Missing local link in ${name}: /${match[1]}`);
    }
  }
  withAssetVersions(files);
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

export function checkOutputFiles(files, directory = outputDir) {
  const destination = checkedOutputDir(directory);
  function visit(folder = '') {
    for (const entry of readdirSync(resolve(destination, folder), { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const name = folder ? `${folder}/${entry.name}` : entry.name;
      if (entry.isDirectory()) visit(name);
      else if (!files.has(name)) throw new Error(`Unexpected build file: ${name}. Archive or remove this stale output explicitly.`);
    }
  }
  visit();
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const basePath = process.argv.find(arg => arg.startsWith('--base='))?.slice(7) ?? './';
    const destination = checkedOutputDir(process.argv.find(arg => arg.startsWith('--out='))?.slice(6) ?? outputDir);
    const files = renderSite(basePath, { launch: process.argv.includes('--launch') });
    if (process.argv.includes('--check')) {
      checkOutputFiles(files, destination);
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
      console.log(`Built ${pages.length} native HTML pages and ${files.size - pages.length} supporting files in ${destination}${process.argv.includes('--launch') ? ' for launch (indexable)' : ' (preview: not indexed)'}.`);
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
