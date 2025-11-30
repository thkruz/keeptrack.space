# Sensor Data Management

## Overview

Sensors are now loaded from a JSON file (`sensors.json`) instead of being hardcoded in TypeScript. This allows for easier migration to remote data sources in the future without requiring code changes.

## Files

- **sensors.json**: Contains all sensor data in JSON format
- **sensorLoader.ts**: Loads sensors from JSON and creates sensor objects
- **sensors.ts**: Legacy TypeScript file (kept for type definitions and enums)

## Architecture

1. `sensors.json` contains all sensor configurations as plain JSON objects
2. `sensorLoader.ts` reads the JSON file and instantiates `DetailedSensor` or `RfSensor` objects
3. All application code imports sensors from `sensorLoader.ts` instead of `sensors.ts`

## Adding or Modifying Sensors

### Option 1: Edit JSON Directly

Edit `sensors.json` and add/modify sensor entries:

```json
{
  "NEWSENSOR": {
    "_sensorType": "RfSensor",
    "objName": "NEWSENSOR",
    "name": "New Sensor Name",
    "lat": 40.0,
    "lon": -75.0,
    "alt": 0.1,
    ...
  }
}
```

### Option 2: Edit TypeScript and Regenerate

1. Edit `sensors.ts` to add/modify sensor definitions
2. Run the conversion script:
   ```bash
   node scripts/parse-sensors.mjs
   ```
3. This will regenerate `sensors.json` from `sensors.ts`

## Migrating to Remote Sources

To load sensors from a remote URL:

1. Modify `sensorLoader.ts` to fetch JSON from a remote endpoint
2. Keep the same JSON schema
3. No changes needed in application code

Example:
```typescript
// In sensorLoader.ts
const response = await fetch('https://api.example.com/sensors.json');
const sensorsData = await response.json();
```

## Type Safety

The `sensorLoader.ts` module:
- Converts string enum values (e.g., `"SpaceObjectType.OPTICAL"`) to actual enum values
- Ensures proper type casting for `Degrees`, `Kilometers`, etc.
- Creates instances of `DetailedSensor` or `RfSensor` based on `_sensorType` field

## Notes

- The `_sensorType` field in JSON determines whether to create a `DetailedSensor` or `RfSensor`
- Enum values in JSON are stored as strings (e.g., `"CommLink.AEHF"`) and converted at load time
- All application code should import from `sensorLoader` not `sensors`
