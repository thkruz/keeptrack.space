/* eslint-disable no-sync */
/* eslint-disable require-jsdoc */
/*
 * This script can be used to automatically generate the Keys object from your JSON translation file
 * You can run this script with Node.js whenever your translations change
 */

import * as fs from 'fs';
import * as path from 'path';

// Function to generate TypeScript code for the Keys object
function generateKeysFromJSON(jsonObj: unknown, prefix: string = ''): string {
  const keys: string[] = [];

  function traverse(obj: unknown, currentPrefix: string): void {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      const newPrefix = currentPrefix ? `${currentPrefix}.${key}` : key;

      if (typeof value === 'object' && value !== null) {
        traverse(value, newPrefix);
      } else {
        keys.push(JSON.stringify(newPrefix));
      }
    });
  }

  traverse(jsonObj, prefix);

  return `[\n  ${keys.join(',\n  ')}\n] as const`;
}

// Main function to generate the entire Keys file
function generateKeysFile(inputJsonPath: string, outputTsPath: string): void {
  try {
    // Read the JSON file
    const jsonData = JSON.parse(fs.readFileSync(inputJsonPath, 'utf8'));

    // Generate Keys object
    const keysObject = generateKeysFromJSON(jsonData);

    // Create the complete TypeScript file content
    const tsContent = `// This file is auto-generated from the translation JSON file
// Do not edit manually
/* eslint-disable guard-for-in */
/* eslint-disable @typescript-eslint/no-explicit-any */
import i18next from 'i18next';

export const Keys = ${keysObject};

// Type for all valid translation keys
export type TranslationKey = typeof Keys[number];

/**
 * Translates a given key into the corresponding localized string.
 * The name t7e represents t + 7 + e, where 7 is the number of letters in the word "translate".
 *
 * @param key - The translation key to be localized. This should correspond to a valid key in the translation files.
 * @param options - An optional object containing variables to interpolate into the localized string.
 * @returns The localized string corresponding to the provided key. If no localization is found, the key itself is returned.
 *
 * @remarks
 * This function is a placeholder and should be replaced with the actual \`t7e\` integration
 * or another localization library implementation.
 */
export function t7e(key: TranslationKey, options?: Record<string, any>): string {
  return i18next.t(key, options);
}
`;

    // Write the TypeScript file
    fs.writeFileSync(outputTsPath, tsContent);
    console.log(`Generated Keys file at ${outputTsPath}`);

  } catch (error) {
    console.error('Error generating Keys file:', error);
  }
}

/*
 * Usage
 * Assuming your JSON is in "../locales/en/translation.json"
 * and you want to output to "./src/i18n/keys.ts"
 */
const __dirname = path.dirname(new URL(import.meta.url).pathname).replace(/^\/+/u, '');

console.log(__dirname);

generateKeysFile(
  `${__dirname}/../src/locales/en.json`,
  `${__dirname}/../src/locales/keys.ts`,
);
