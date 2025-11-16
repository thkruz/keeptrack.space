import path from 'path';
import { ConsoleStyles, logWithStyle } from './lib/build-error';
import { mergeAllLocales } from './utils/generate-translation-json';
import { generateKeysFile } from './utils/generate-translation-keys';

logWithStyle('Generating translation files', ConsoleStyles.INFO);

mergeAllLocales();

/*
 * Usage
 * Assuming your JSON is in "../locales/en/translation.json"
 * and you want to output to "./src/locales/keys.ts"
 */
let __dirname = path.dirname(new URL(import.meta.url).pathname).replace(/^\/+/u, '');

logWithStyle(`Working directory: ${__dirname}`, ConsoleStyles.DEBUG);

// Check if __dirname is a Windows path
if ((/^[a-zA-Z]:/u).test(__dirname)) {
  logWithStyle('Windows path detected', ConsoleStyles.DEBUG);
} else {
  logWithStyle('POSIX path detected', ConsoleStyles.DEBUG);
  __dirname = `/${__dirname}`;
}

generateKeysFile(
  `${__dirname}/../src/*`,
  `${__dirname}/../src/locales/keys.ts`,
);

logWithStyle('Translation files generated successfully', ConsoleStyles.SUCCESS);
