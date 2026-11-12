import { BRAND_COMMENT, brandJsonMeta, withBrandComment } from '@app/engine/utils/branding';
import { formatStkEphemeris } from '@app/plugins/catalog-management/catalog-management-export';
import { createWatermarkedStream } from '@app/plugins/screen-recorder/recording-watermark';
import { parseFilterConfig, serializeFilterConfig } from '@app/plugins-pro/find-sat/filter-types';
import { parseEphemeris } from '@app/plugins-pro/stk-file-handler/stk-ephemeris-parser';
import { parseSymbologyConfig, serializeSymbologyConfig } from '@app/plugins-pro/symbology/symbology-config-io';
import { EpochUTC, J2000, Kilometers, KilometersPerSecond, Vector3D } from '@ootk/src/main';
import { OdmExporter } from '@ootk/src/parsers/OdmExporter';
import { OemParser } from '@ootk/src/parsers/OemParser';
import { describe, expect, it } from 'vitest';

describe('branding for machine formats', () => {
  it('withBrandComment is idempotent and keeps existing comments after the brand line', () => {
    expect(withBrandComment()).toEqual([BRAND_COMMENT]);
    expect(withBrandComment(['NORAD_ID = 25544'])).toEqual([BRAND_COMMENT, 'NORAD_ID = 25544']);
    expect(withBrandComment(withBrandComment(['x']))).toEqual([BRAND_COMMENT, 'x']);
    expect(BRAND_COMMENT).toContain('keeptrack.space');
  });

  it('STK ephemeris carries a # comment and still parses with our importer', () => {
    const text = formatStkEphemeris(
      [
        { offsetSec: 0, position: { x: 7000, y: 0, z: 0 }, velocity: { x: 0, y: 7.5, z: 0 } },
        { offsetSec: 60, position: { x: 6990, y: 450, z: 0 }, velocity: { x: -0.5, y: 7.5, z: 0 } },
      ],
      { scenarioEpoch: new Date(Date.UTC(2026, 0, 1)) }
    );

    expect(text.split('\n')[0]).toBe('stk.v.11.0');
    expect(text).toContain(`# ${BRAND_COMMENT}`);
    const parsed = parseEphemeris(text);

    expect(parsed.points).toHaveLength(2);
  });

  it('OEM carries a COMMENT line and round-trips through OemParser', () => {
    const state = new J2000(
      EpochUTC.fromDateTime(new Date(Date.UTC(2026, 0, 1))),
      new Vector3D<Kilometers>(7000 as Kilometers, 0 as Kilometers, 0 as Kilometers),
      new Vector3D<KilometersPerSecond>(0 as KilometersPerSecond, 7.5 as KilometersPerSecond, 0 as KilometersPerSecond)
    );
    const state2 = new J2000(
      EpochUTC.fromDateTime(new Date(Date.UTC(2026, 0, 1, 0, 1))),
      new Vector3D<Kilometers>(6990 as Kilometers, 450 as Kilometers, 0 as Kilometers),
      new Vector3D<KilometersPerSecond>(-0.5 as KilometersPerSecond, 7.5 as KilometersPerSecond, 0 as KilometersPerSecond)
    );
    const oem = OdmExporter.formatOemFromStateVectors([state, state2], { objectName: 'TEST', objectId: '2026-001A' }, { comments: withBrandComment(['NORAD_ID = 99999']) });

    expect(oem).toContain(`COMMENT ${BRAND_COMMENT}`);
    const parsed = OemParser.parse(oem);

    expect(parsed.header.CCSDS_OEM_VERS).toBe('2.0');
    expect(parsed.dataBlocks[0].ephemeris).toHaveLength(2);
  });

  it('JSON exports with an object root carry meta and still load; the TLE-free bare array case is untouched', () => {
    expect(brandJsonMeta().url).toBe('https://keeptrack.space');

    const filters = serializeFilterConfig([]);

    expect(JSON.parse(filters).meta.url).toBe('https://keeptrack.space');
    expect(parseFilterConfig(filters, new Set())).toEqual([]);

    const symbology = serializeSymbologyConfig({ enabled: true, rules: [], defaultAffiliation: 3, showStaleness: false } as never, new Map());

    expect(JSON.parse(symbology).meta.generator).toBe('KeepTrack');
    expect(() => parseSymbologyConfig(symbology)).not.toThrow();
  });

  it('createWatermarkedStream returns null (record the source untouched) when canvas capture is unavailable', () => {
    const noVideo = { getVideoTracks: () => [] } as unknown as MediaStream;

    expect(createWatermarkedStream(noVideo)).toBeNull();
    const withTrack = { getVideoTracks: () => [{ getSettings: () => ({}) }], getAudioTracks: () => [] } as unknown as MediaStream;

    // jsdom canvases have no captureStream
    expect(createWatermarkedStream(withTrack)).toBeNull();
  });
});
