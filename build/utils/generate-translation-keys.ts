/* eslint-disable no-sync */
/* eslint-disable require-jsdoc */
/*
 * This script can be used to automatically generate the Keys object from your JSON translation file
 * You can run this script with Node.js whenever your translations change
 */

import * as fs from 'fs';
import * as path from 'path';
import { ConsoleStyles, logWithStyle } from '../lib/build-error';

// Function to generate TypeScript code for the Keys object
function generateKeysFromJSON(jsonObj: Record<string, string>, prefix: string = ''): string {
  const keys: string[] = [];

  function traverse(obj: Record<string, string>, currentPrefix: string): void {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      const newPrefix = currentPrefix ? `${currentPrefix}.${key}` : key;

      if (typeof value === 'object' && value !== null) {
        traverse(value, newPrefix);
      } else {
        keys.push(JSON.stringify(newPrefix).replace(/"/gu, '\''));
      }
    });
  }

  traverse(jsonObj, prefix);

  return `[\n  ${keys.join(',\n  ')},\n] as const`;
}

function findLocalesDirs(dir: string, enJsonPaths: string[] = []): string[] {
  for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, dirent.name);

    // skip ootk and its children
    if (fullPath.includes('ootk')) {
      continue;
    }

    if (dirent.isDirectory()) {
      if (dirent.name === 'locales') {
        const enJsonPath = path.join(fullPath, 'en.json');

        if (fs.existsSync(enJsonPath)) {
          enJsonPaths.push(enJsonPath);
        }
      } else {
        enJsonPaths = [...enJsonPaths, ...findLocalesDirs(fullPath)];
      }
    }
  }

  return enJsonPaths;
}

// Main function to generate the entire Keys file
export function generateKeysFile(inputJsonPath: string, outputTsPath: string): void {
  try {
    logWithStyle(`Input JSON Path: ${inputJsonPath}`, ConsoleStyles.DEBUG);
    logWithStyle(`Output TS Path: ${outputTsPath}`, ConsoleStyles.DEBUG);
    /*
     * Search all of ../../src for any folders named locales with an en.json
     * file inside of them and compile a list of their paths
     */

    // Recursively search for 'locales' directories containing 'en.json'
    const enJsonPaths: string[] = findLocalesDirs(path.dirname(inputJsonPath));

    console.log('Translation files found:', enJsonPaths);

    // Read all the json files and merge them into one object
    const jsonData: Record<string, string> = {};

    for (const enJsonPath of enJsonPaths) {
      logWithStyle(`Processing translation file: ${enJsonPath}`, ConsoleStyles.DEBUG);
      const fileData = JSON.parse(fs.readFileSync(enJsonPath, 'utf8'));

      Object.assign(jsonData, fileData);
    }

    // Generate Keys object
    const keysObject = generateKeysFromJSON(jsonData);

    // Create the complete TypeScript file content
    const tsContent = `// This file is auto-generated from the translation JSON file
// Do not edit manually
// Use npm run generate-t7e instead!
/* eslint-disable guard-for-in */
/* eslint-disable @typescript-eslint/no-explicit-any */
import i18next from 'i18next';

export const Keys = ${keysObject};

const translationCache: Map<TranslationKey, string> = new Map();

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
  // Check if the translation is already cached
  if (translationCache.has(key)) {
    return translationCache.get(key)!;
  }

  // Perform the translation using i18next
  const translatedString = i18next.t(key, options) as string;

  // Cache the translation
  translationCache.set(key, translatedString);

  return translatedString;
}
`;

    // Write the TypeScript file
    fs.writeFileSync(outputTsPath, tsContent);
    console.log(`Generated Keys file at ${outputTsPath}`);

  } catch (error) {
    console.error('Error generating Keys file:', error);
  }
}
