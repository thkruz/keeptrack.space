#!/usr/bin/env node
/**
 * Parse sensors.ts and convert to JSON using regex
 * This doesn't require importing the TypeScript modules
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sensorsPath = join(__dirname, '../src/app/data/catalogs/sensors.ts');
const outputPath = join(__dirname, '../src/app/data/catalogs/sensors.json');

// Read the file
const content = readFileSync(sensorsPath, 'utf-8');

// Extract the sensors object
const match = content.match(/export const sensors = <SensorList>\{([\s\S]*?)\n\};/);

if (!match) {
  console.error('Could not find sensors object');
  process.exit(1);
}

const sensorsContent = match[1];

// Split into individual sensor blocks
const sensorBlocks = [];
let currentBlock = '';
let braceCount = 0;
let inSensor = false;
let currentKey = '';

const lines = sensorsContent.split('\n');

for (const line of lines) {
  const trimmed = line.trim();

  // Check if this is the start of a sensor definition
  const sensorMatch = trimmed.match(/^(\w+):\s*new\s+(RfSensor|DetailedSensor)\(\{/);

  if (sensorMatch) {
    if (currentBlock) {
      sensorBlocks.push({ key: currentKey, type: currentBlock.type, content: currentBlock.content });
    }
    currentKey = sensorMatch[1];
    currentBlock = { type: sensorMatch[2], content: '' };
    inSensor = true;
    braceCount = 1;
    continue;
  }

  if (inSensor) {
    // Count braces
    for (const char of line) {
      if (char === '{') {
        braceCount++;
      }
      if (char === '}') {
        braceCount--;
      }
    }

    if (braceCount === 0) {
      // End of sensor definition
      inSensor = false;
    } else {
      currentBlock.content += line + '\n';
    }
  }
}

// Don't forget the last block
if (currentBlock && currentKey) {
  sensorBlocks.push({ key: currentKey, type: currentBlock.type, content: currentBlock.content });
}

// Parse each sensor block
const sensors = {};

for (const block of sensorBlocks) {
  const sensor = {
    _sensorType: block.type,
  };

  const lines = block.content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      continue;
    }

    // Match property: value pattern - more flexible to capture full values
    const propMatch = trimmed.match(/^(\w+):\s*(.+)$/);

    if (propMatch) {
      let [, key, value] = propMatch;

      // Remove comments at the end (but only after quoted strings or other values)
      // This regex looks for comments that start after a quote, comma, or closing bracket
      value = value.replace(/(['"\],}])\s*\/\/.*$/, '$1');

      // Remove trailing comma
      value = value.replace(/,\s*$/, '');

      // Remove type assertions like <Degrees>
      value = value.replace(/<\w+>/g, '');

      // Remove 'as Type' assertions but preserve content
      value = value.replace(/\s+as\s+\w+/g, '');

      value = value.trim();

      // Parse the value
      try {
        // Handle arrays
        if (value.startsWith('[')) {
          // Clean array content
          const cleaned = value.replace(/\s+as\s+\w+/g, '');

          // Try to parse array content
          // Handle enum arrays like [CommLink.AEHF, CommLink.WGS]
          const arrayMatch = cleaned.match(/\[(.*)\]/);

          if (arrayMatch) {
            const content = arrayMatch[1];

            // Check if it contains enum values
            if (content.includes('.')) {
              // It's an enum array, split and keep as strings
              sensor[key] = content.split(',').map(item => item.trim());
            } else {
              // Try to parse as JSON
              try {
                sensor[key] = JSON.parse(cleaned);
              } catch {
                sensor[key] = content.split(',').map(item => {
                  const trimmed = item.trim();

                  return isNaN(Number(trimmed)) ? trimmed : parseFloat(trimmed);
                });
              }
            }
          }
        }
        // Handle booleans
        else if (value === 'true') {
          sensor[key] = true;
        } else if (value === 'false') {
          sensor[key] = false;
        }
        // Handle numbers
        else if (/^-?\d+\.?\d*$/.test(value)) {
          sensor[key] = parseFloat(value);
        }
        // Handle strings
        else if (value.startsWith("'") || value.startsWith('"')) {
          sensor[key] = value.replace(/^['"]|['"]$/g, '');
        }
        // Handle enum values (keep as string)
        else {
          sensor[key] = value;
        }
      } catch (e) {
        // If parsing fails, store as string
        sensor[key] = value;
      }
    }
  }

  sensors[block.key] = sensor;
}

// Write to JSON
writeFileSync(outputPath, JSON.stringify(sensors, null, 2));

console.log(`✓ Successfully converted ${Object.keys(sensors).length} sensors`);
console.log(`✓ Output: ${outputPath}`);
