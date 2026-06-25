# Reports Plugin Extensibility Guide

The Reports Plugin has been refactored to support extensible report registration, allowing other plugins to add custom reports without modifying the core Reports Plugin code.

## How to Register a Custom Report

Other plugins can register custom reports using the static `ReportsPlugin.registerReport()` method.

### Example: Registering a Custom Report

```typescript
import { ReportsPlugin, ReportGenerator, ReportContext } from '@app/plugins/reports/reports';
import { Satellite, DetailedSensor } from '@ootk/src/main';

// Define your custom report generator
const myCustomReport: ReportGenerator = {
  id: 'my-custom-report',
  name: 'My Custom Report',
  description: 'This is a custom report that does something useful',
  requiresSensor: false, // Set to true if the report needs a sensor

  generate: (sat: Satellite, sensor: DetailedSensor | null, ctx: ReportContext) => {
    // ctx.options carries the user-selected time window/step; ctx.deps injects the
    // pass finder and sun/eclipse helpers; ctx.generatedAt is the report epoch.
    const header = `My Custom Report\n----------------\nSatellite: ${sat.name}\n`;

    return {
      filename: `my-custom-report-${sat.sccNum}`,
      header,
      // Preferred: a structured table (rendered as aligned text, CSV, or JSON).
      table: {
        headers: ['Field', 'Value'],
        rows: [['Apogee', `${sat.apogee.toFixed(1)} km`]],
      },
    };
  },
};

// Register the report (typically in your plugin's constructor or init method)
ReportsPlugin.registerReport(myCustomReport);
```

> The legacy string `body` / `columns` / `isHeaders` fields are still accepted for
> backward compatibility, but new reports should return a structured `table` so the
> user's chosen export format (aligned text, CSV, or JSON) works automatically.

### Report Generator Interface

```typescript
interface ReportGenerator {
  /** Unique identifier for this report */
  id: string;

  /** Display name for the report button */
  name: string;

  /** Description of what the report contains */
  description?: string;

  /** Whether this report requires a sensor to be selected */
  requiresSensor?: boolean;

  /**
   * Generate the report data
   * @param sat The selected satellite
   * @param sensor The selected sensor (if required)
   * @param ctx The report context (time window, injected dependencies, epoch)
   * @returns The report data to be written
   */
  generate(sat: Satellite, sensor: DetailedSensor | null, ctx: ReportContext): ReportData;
}

interface ReportContext {
  /** User-selected window: { startTime, windowSec, stepSec }. */
  options: ReportOptions;
  /** Injected application state: the sensor pass finder and the sun/eclipse helper. */
  deps: ReportCoreDeps;
  /** Simulation time the report is generated at (used in the metadata header). */
  generatedAt: Date;
}

interface ReportTable {
  headers: string[];
  rows: string[][];
}

interface ReportData {
  filename: string;
  header: string;
  /** Preferred structured output. */
  table?: ReportTable;
  /** Message shown when the table has no rows. */
  emptyMessage?: string;
  /** @deprecated Legacy raw body fields. */
  body?: string;
  columns?: number;
  isHeaders?: boolean;
}
```

## Built-in Reports

The following reports are now registered by default:

1. **Azimuth Elevation Range** - AER data for satellite passes (requires sensor)
2. **Latitude Longitude Altitude** - LLA coordinates over time
3. **Earth Centered Inertial** - ECI position and velocity vectors
4. **Classical Orbital Elements** - Orbital elements at epoch
5. **Visibility Windows** - Rise/set times and pass characteristics (requires sensor)
6. **Sun/Eclipse Analysis** - Sun illumination and eclipse timing for power/thermal analysis

## Benefits of the New Architecture

- **No Code Modification**: Other plugins can add reports without modifying the Reports Plugin
- **Dynamic UI**: Report buttons are generated automatically based on registered reports
- **Type Safety**: TypeScript interfaces ensure correct report implementation
- **Separation of Concerns**: Each report is self-contained and independent
- **Easy Maintenance**: Reports can be added, removed, or modified independently

## Advanced Usage

### Unregistering Reports

```typescript
ReportsPlugin.unregisterReport('report-id');
```

### Getting All Registered Reports

```typescript
const allReports = ReportsPlugin.getRegisteredReports();
```

### Report with Sensor Requirements

If your report requires a sensor to be selected, set `requiresSensor: true`. The Reports Plugin will automatically handle the validation and only call your `generate()` method when a sensor is available.

```typescript
const sensorRequiredReport: ReportGenerator = {
  id: 'sensor-report',
  name: 'Sensor Report',
  requiresSensor: true,
  generate: (sat, sensor, ctx) => {
    // sensor is guaranteed to be non-null here. Use ctx.deps.findPasses(sensor, ctx.options)
    // to reuse the shared pass finder, or sample directly:
    const rae = sensor!.rae(sat, ctx.options.startTime);
    // ... generate report
  },
};
```
