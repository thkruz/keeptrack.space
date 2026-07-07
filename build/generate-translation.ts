import path from 'node:path';
import { reporter } from './lib/reporter';
import { mergeAllLocales } from './utils/generate-translation-json';
import { generateKeysFile } from './utils/generate-translation-keys';

reporter.phase(
  'Merge locales',
  () => mergeAllLocales(),
  (result) => `${result.files} files, ${result.languages} languages`,
);

/*
 * Usage
 * Assuming your JSON is in "../locales/en/translation.json"
 * and you want to output to "./src/locales/keys.ts"
 */
let __dirname = path.dirname(new URL(import.meta.url).pathname).replace(/^\/+/u, '');

// POSIX paths need their leading slash restored; Windows paths (C:/...) do not
if (!(/^[a-zA-Z]:/u).test(__dirname)) {
  __dirname = `/${__dirname}`;
}

reporter.phase(
  'Generate translation keys',
  () => generateKeysFile(
    `${__dirname}/../src/*`,
    `${__dirname}/../src/locales/keys.ts`,
  ),
);
