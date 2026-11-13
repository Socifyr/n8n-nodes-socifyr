import { mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

// n8n loads `*.node.json` and `*.svg` assets next to the compiled JS, so the
// tsc output must mirror the source layout for non-TS files.
const copies = [
  ['nodes/Socifyr/Socifyr.node.json', 'dist/nodes/Socifyr/Socifyr.node.json'],
  ['nodes/Socifyr/socifyr.svg', 'dist/nodes/Socifyr/socifyr.svg'],
  ['credentials/socifyr.svg', 'dist/credentials/socifyr.svg'],
];

for (const [from, to] of copies) {
  mkdirSync(join(process.cwd(), to, '..'), { recursive: true });
  copyFileSync(join(process.cwd(), from), join(process.cwd(), to));
}

console.log(`copied ${copies.length} n8n asset files to dist/`);
