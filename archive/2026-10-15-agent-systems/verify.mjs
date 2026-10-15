import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';

const manifest = JSON.parse(readFileSync(new URL('./manifest.json', import.meta.url), 'utf8'));
let bytes = 0;
for (const entry of manifest.files) {
  const path = new URL(entry.archivePath, import.meta.url);
  const data = readFileSync(path);
  const digest = createHash('sha256').update(data).digest('hex');
  if (!statSync(path).isFile() || data.length !== entry.bytes || digest !== entry.sha256) {
    throw new Error(`Archive integrity mismatch: ${entry.archivePath}`);
  }
  bytes += data.length;
}
console.log(`Verified ${manifest.files.length} original files (${bytes} bytes) against their SHA-256 manifest.`);
console.log(`Original Git revision: ${manifest.baselineCommit}`);
