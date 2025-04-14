/* eslint-disable guard-for-in */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Keys, TranslationKey } from '@app/locales/keys';

/**
 * Checks if a nested property exists in an object using a dot-notation path
 */
export function hasNestedProperty(obj: Record<string, any>, path: string): boolean {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (!current || !Object.prototype.hasOwnProperty.call(current, part)) {
      return false;
    }
    current = current[part];
  }

  return true;
}

/**
 * Extracts all leaf keys from a nested object using dot notation
 */
export function extractAllKeys(obj: Record<string, any>, prefix = ''): string[] {
  const keys: string[] = [];

  for (const key in obj) {
    const currentKey = prefix ? `${prefix}.${key}` : key;

    if (typeof obj[key] === 'object' && obj[key] !== null) {
      // If it's an object, recurse deeper
      keys.push(...extractAllKeys(obj[key], currentKey));
    } else {
      // It's a leaf node (actual translation value)
      keys.push(currentKey);
    }
  }

  return keys;
}

/**
 * Validates that all translation keys in the Keys array exist in the provided translation JSON
 * and identifies any keys in the JSON that are missing from the Keys array.
 */
export function validateTranslationKeys(translationJson: Record<string, any>): {
  missingInJson: TranslationKey[];
  missingInKeys: string[];
} {
  const missingInJson: TranslationKey[] = [];

  // Find keys in the Keys array that are missing in the JSON
  for (const key of Keys) {
    if (!hasNestedProperty(translationJson, key)) {
      missingInJson.push(key);
    }
  }

  // Extract all keys from the JSON
  const allJsonKeys = extractAllKeys(translationJson);

  // Find keys in the JSON that are missing in the Keys array
  const missingInKeys = allJsonKeys.filter((jsonKey) => !Keys.includes(jsonKey as any));

  return {
    missingInJson,
    missingInKeys,
  };
}
