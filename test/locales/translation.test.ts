import { existsSync, readFileSync } from 'fs';
import * as path from 'path';
import { validateTranslationKeys } from './locales-utils';

describe('Translation files validation', () => {
  // Test to validate the English translation file
  test('en.json should contain all translation keys', () => {
    // Load the translation file
    const translationFilePath = path.resolve(__dirname, '../../src/locales/en.json');
    const fileContent = readFileSync(translationFilePath, 'utf8');
    const translationJson = JSON.parse(fileContent);

    // Validate the keys
    const validation = validateTranslationKeys(translationJson);

    // Check if there are any missing keys in the JSON
    if (validation.missingInJson.length > 0) {
      console.error('Keys missing in JSON file:', validation.missingInJson);
    }

    // Fail the test if any keys are missing
    expect(validation.missingInJson).toHaveLength(0);
  });

  // Test to check if all JSON keys are in the Keys array
  test('Keys array should include all keys from en.json', () => {
    // Load the translation file
    const translationFilePath = path.resolve(__dirname, '../../src/locales/en.json');
    const fileContent = readFileSync(translationFilePath, 'utf8');
    const translationJson = JSON.parse(fileContent);

    // Validate the keys
    const validation = validateTranslationKeys(translationJson);

    // Check if there are any JSON keys missing in the Keys array
    if (validation.missingInKeys.length > 0) {
      console.error('Keys missing in Keys array:', validation.missingInKeys);
    }

    // Fail the test if any keys are missing
    expect(validation.missingInKeys).toHaveLength(0);
  });

  // Test all translation files
  const locales = ['en', 'de', 'es', 'ja', 'ko', 'ru', 'uk', 'zh'];

  locales.forEach((locale) => {
    test(`${locale}.json should contain all translation keys`, () => {
      // Load the translation file
      const translationFilePath = path.resolve(__dirname, `../../src/locales/${locale}.json`);

      // Expect the file to exist
      expect(existsSync(translationFilePath)).toBe(true);

      const fileContent = readFileSync(translationFilePath, 'utf8');
      const translationJson = JSON.parse(fileContent);

      // Validate the keys
      const validation = validateTranslationKeys(translationJson);

      /**
       * Check if there are any missing keys in the JSON
       * If there are, log them to the console
       * This is useful for debugging and ensuring that all keys are present
       * in the translation files.
       * The test will still fail if there are missing keys, but this provides
       * additional information about what is missing.
       */
      if (validation.missingInJson.length > 0) {
        console.error(`[${locale}] Keys missing in JSON file:`, validation.missingInJson);
      }

      expect(validation.missingInJson).toHaveLength(0);
    });
  });
});
