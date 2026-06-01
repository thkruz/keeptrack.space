import { vi } from 'vitest';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { getEl } from '@app/engine/utils/get-el';
import {
  CatalogSource, EpochUTC, J2000, Kilometers, KilometersPerSecond, Satellite, Seconds, SpaceObjectType, TleLine1, TleLine2, Vector3D,
} from '@ootk/src/main';
import { OemSatellite, ParsedOem } from '@app/app/objects/oem-satellite';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { EL } from '@app/plugins/sat-info-box/sat-info-box-html';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { setupStandardEnvironment } from '@test/environment/standard-env';

/*
 * The sat-info-box header displays Satellite.sccNum (the display-canonical
 * numeric form) in the OBJNUM field. This pins that every sccNum form renders
 * its expected canonical value — never "undefined", "NaN", or a wrong-width
 * string — for both Satellite and OemSatellite objects.
 *
 * Expected OBJNUM per input form (after assignAlpha5Forms_ normalization):
 *   numeric5  "25544"     -> "25544"
 *   alpha-5   "T0001"     -> "270001"  (normalized to 6-digit numeric)
 *   numeric6  "270001"    -> "270001"
 *   extended  "799500766" -> "799500766"
 */
const TLE1 = '1 25544U 98067A   21203.40407588  .00003453  00000-0  71172-4 0  9991' as TleLine1;
const TLE2 = '2 25544  51.6423 168.5744 0001475 184.3976 313.3642 15.48839820294053' as TleLine2;

const makeSat = (sccNum: string): Satellite => new Satellite({
  id: 0,
  active: true,
  sccNum,
  intlDes: '1998-067A',
  country: 'USA',
  name: 'TEST SAT',
  type: SpaceObjectType.PAYLOAD,
  tle1: TLE1,
  tle2: TLE2,
  source: CatalogSource.CELESTRAK,
});

const makeStateVector = (epochSec: number): J2000 => new J2000(
  EpochUTC.fromDateTime(new Date(epochSec * 1000)),
  new Vector3D(7000 as Kilometers, 0 as Kilometers, 0 as Kilometers),
  new Vector3D(0 as KilometersPerSecond, 7.5 as KilometersPerSecond, 0 as KilometersPerSecond),
);

const makeOemSat = (noradId: string): OemSatellite => {
  const startSec = Date.UTC(2026, 0, 1) / 1000 as Seconds;
  const oem: ParsedOem = {
    header: {
      START_TIME: new Date(2026, 0, 1),
      STOP_TIME: new Date(2026, 0, 2),
      CCSDS_OEM_VERS: '2.0',
      CREATION_DATE: '2026-01-01T00:00:00',
      ORIGINATOR: 'TEST',
      COMMENT: [`NORAD_ID = ${noradId}`],
    },
    dataBlocks: [
      {
        metadata: {
          OBJECT_NAME: 'TEST OEM',
          OBJECT_ID: '2026-001A',
          CENTER_NAME: 'EARTH',
          REF_FRAME: 'EME2000',
          TIME_SYSTEM: 'UTC',
          START_TIME: '2026-01-01T00:00:00',
          STOP_TIME: '2026-01-02T00:00:00',
        },
        ephemeris: [makeStateVector(startSec), makeStateVector(startSec + 60)],
      },
    ],
  };

  return new OemSatellite(oem);
};

describe('SatInfoBox_header_OBJNUM_sccNumForms', () => {
  let plugin: SatInfoBox;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
    ServiceLocator.getTimeManager().simulationTimeObj = new Date(2023, 1, 1);
    plugin = PluginRegistry.getPlugin(SatInfoBox)!;
    // Build the header DOM. createContainer inserts the markup then calls
    // initDraggabilly(), which throws under jsdom (no real layout) before the
    // isHtmlReady_ flag is set — the EventBus swallows the error but leaves the
    // flag false, so set it explicitly so updateHeaderData_ renders
    // synchronously instead of deferring via setTimeout.
    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);
    // eslint-disable-next-line dot-notation
    plugin['isHtmlReady_'] = true;
  });

  const renderObjNum = (obj: Satellite | OemSatellite): string => {
    // eslint-disable-next-line dot-notation
    plugin['updateHeaderData_'](obj);
    // setInnerHtml defers the actual DOM write via requestIdleCallback, which
    // the test env polyfills onto setTimeout — flush it before reading.
    vi.runAllTimers();

    return getEl(EL.OBJNUM)!.innerHTML;
  };

  it('renders a numeric5 sccNum verbatim', () => {
    const sat = makeSat('25544');

    expect(sat.sccNum).toBe('25544');
    expect(renderObjNum(sat)).toBe('25544');
  });

  it('renders an alpha-5 sccNum as its normalized 6-digit numeric form', () => {
    const sat = makeSat('T0001');

    expect(sat.sccNum).toBe('270001');
    expect(sat.sccNum5).toBe('T0001');
    expect(renderObjNum(sat)).toBe('270001');
  });

  it('renders a numeric6 sccNum verbatim', () => {
    const sat = makeSat('270001');

    expect(sat.sccNum).toBe('270001');
    expect(renderObjNum(sat)).toBe('270001');
  });

  it('renders a 9-digit extended sccNum verbatim (no truncation)', () => {
    const sat = makeSat('799500766');

    expect(sat.sccNum).toBe('799500766');
    expect(sat.sccNum5).toBeNull();
    expect(renderObjNum(sat)).toBe('799500766');
  });

  it('never renders undefined or NaN for any form', () => {
    for (const form of ['25544', 'T0001', '270001', '799500766']) {
      const out = renderObjNum(makeSat(form));

      expect(out).not.toContain('undefined');
      expect(out).not.toContain('NaN');
      expect(out.length).toBeGreaterThan(0);
    }
  });

  it('renders an OemSatellite alpha-5 NORAD_ID as its normalized numeric form', () => {
    const oemSat = makeOemSat('T0001');

    expect(oemSat.sccNum).toBe('270001');
    expect(renderObjNum(oemSat)).toBe('270001');
  });

  it('renders an OemSatellite extended NORAD_ID verbatim', () => {
    const oemSat = makeOemSat('799500766');

    expect(oemSat.sccNum).toBe('799500766');
    expect(renderObjNum(oemSat)).toBe('799500766');
  });
});
