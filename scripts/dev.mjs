import { watch } from 'node:fs';
import { createServer } from 'node:http';
import { extname } from 'node:path';
import { renderSite, writeSite, sourceDir, projectDir } from './build.mjs';

let files = renderSite();
writeSite(files);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = createServer((request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) return response.writeHead(405, { Allow: 'GET, HEAD' }).end();
  const name = new URL(request.url, 'http://localhost').pathname.slice(1) || 'index.html';
  if (name === '.koralli-preview') {
    const body = JSON.stringify({ project: projectDir, pid: process.pid });
    response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return response.end(request.method === 'HEAD' ? undefined : body);
  }
  const bytes = files.get(name);
  if (!bytes) return response.writeHead(404).end('Not found');
  response.writeHead(200, { 'Content-Type': types[extname(name)] || 'application/octet-stream', 'Content-Length': bytes.length, 'Cache-Control': 'no-store' });
  response.end(request.method === 'HEAD' ? undefined : bytes);
});
let pending;
const watcher = watch(sourceDir, { recursive: true }, () => {
  clearTimeout(pending);
  pending = setTimeout(() => {
    try { const next = renderSite(); writeSite(next); files = next; console.log('Rebuilt. Refresh to see changes.'); }
    catch (error) { console.error(`Keeping the last working build: ${error.message}`); }
  }, 100);
});
server.listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log(`Local Koralli design: http://127.0.0.1:${server.address().port}`));
server.on('error', error => { console.error(error.message); watcher.close(); process.exitCode = 1; });
function stop() { clearTimeout(pending); watcher.close(); server.close(); }
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
