import {cp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const source = resolve('dist/client/_next');
const destination = resolve('dist/client/assets/_next');

await rm(destination, {recursive: true, force: true});
await mkdir(resolve('dist/client/assets'), {recursive: true});
await cp(source, destination, {recursive: true});

// Only public URL manifests are rewritten. Server module import paths remain intact.
const manifests = [
  'dist/server/vinext-client-assets.js',
  'dist/server/__vite_rsc_assets_manifest.js',
  'dist/server/ssr/vinext-client-assets.js',
  'dist/server/ssr/__vite_rsc_assets_manifest.js',
];

for (const file of manifests) {
  const path = resolve(file);
  const original = await readFile(path, 'utf8');
  await writeFile(path, original.replaceAll('_next/static', 'assets/_next/static'));
}
