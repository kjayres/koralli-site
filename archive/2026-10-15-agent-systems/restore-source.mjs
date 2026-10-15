import { readFileSync, existsSync, mkdirSync, copyFileSync, constants } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import './verify.mjs';

const archiveDir = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(archiveDir, '../..');
const manifest = JSON.parse(readFileSync(resolve(archiveDir, 'manifest.json'), 'utf8'));
const files = manifest.files.filter(entry => entry.kind === 'exclusive-source');
const pending = [];
for (const entry of files) {
  const source = resolve(archiveDir, entry.archivePath);
  const target = resolve(projectDir, entry.originalPath);
  if (existsSync(target)) {
    if (!readFileSync(target).equals(readFileSync(source))) {
      throw new Error(`Refusing to overwrite a different current file: ${entry.originalPath}`);
    }
  } else pending.push({ source, target, name: entry.originalPath });
}
if (!process.argv.includes('--apply')) {
  console.log(`Dry run: ${pending.length} original source files would be restored. Add --apply to copy them.`);
} else {
  for (const file of pending) {
    mkdirSync(dirname(file.target), { recursive: true });
    copyFileSync(file.source, file.target, constants.COPYFILE_EXCL);
  }
  console.log(`Restored ${pending.length} original source files. Existing matching files were left unchanged.`);
}
console.log('Then reinstate the page in scripts/build.mjs and the navigation/footer as described in this archive README.');
