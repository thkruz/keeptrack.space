import path from 'path';
import { mergeAllLocales } from './utils/generate-translation-json';
import { generateKeysFile } from './utils/generate-translation-keys';

mergeAllLocales();

/*
 * Usage
 * Assuming your JSON is in "../locales/en/translation.json"
 * and you want to output to "./src/locales/keys.ts"
 */
const __dirname = path.dirname(new URL(import.meta.url).pathname).replace(/^\/+/u, '');

console.log(__dirname);

generateKeysFile(
  `${__dirname}/../src/*`,
  `${__dirname}/../src/locales/keys.ts`,
);
