import { readFile, writeFile } from 'node:fs/promises';

const path = 'app.js';
let source = await readFile(path, 'utf8');
const before = 'requestAnimationFrame(()=>first?.focus());';
const after = 'first?.focus();';

if (source.includes(before)) {
  source = source.replace(before, after);
  await writeFile(path, source);
  console.log('Dialog initial focus made synchronous.');
} else if (source.includes(after)) {
  console.log('Dialog initial focus is already synchronous.');
} else {
  throw new Error('Dialog focus target not found.');
}
