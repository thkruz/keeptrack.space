/* biome-ignore-all lint/complexity/useLiteralKeys: Tests drive the private hover renderer directly. */
import { OemSatellite, ParsedOem } from '@app/app/objects/oem-satellite';
import { HoverManager } from '@app/app/ui/hover-manager';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { EpochUTC, J2000, Kilometers, KilometersPerSecond, Seconds, Vector3D } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';

const makeStateVector = (epochSec: number): J2000 =>
  new J2000(
    EpochUTC.fromDateTime(new Date(epochSec * 1000)),
    new Vector3D(7000 as Kilometers, 0 as Kilometers, 0 as Kilometers),
    new Vector3D(0 as KilometersPerSecond, 7.5 as KilometersPerSecond, 0 as KilometersPerSecond)
  );

/** Same metadata shape as public/data/ephemeris/lucy.oem: no NORAD_ID comment, OBJECT_ID is the name. */
const makeOemSat = (objectId: string): OemSatellite => {
  const startSec = (Date.UTC(2021, 9, 16) / 1000) as Seconds;
  const oem: ParsedOem = {
    header: {
      START_TIME: new Date(startSec * 1000),
      STOP_TIME: new Date((startSec + 60) * 1000),
      CCSDS_OEM_VERS: '2.0',
      CREATION_DATE: '2026-04-01T16:02:30.663000',
      ORIGINATOR: 'KeepTrack',
    },
    dataBlocks: [
      {
        metadata: {
          OBJECT_NAME: 'Lucy',
          OBJECT_ID: objectId,
          CENTER_NAME: 'EARTH',
          REF_FRAME: 'EME2000',
          TIME_SYSTEM: 'UTC',
          START_TIME: '2021-10-16T00:00:00',
          STOP_TIME: '2021-10-16T00:01:00',
          INTERPOLATION: 'LAGRANGE',
          INTERPOLATION_DEGREE: 1,
        },
        ephemeris: [makeStateVector(startSec), makeStateVector(startSec + 60)],
      },
    ],
  };

  return new OemSatellite(oem);
};

describe('HoverManager launch line for OEM objects', () => {
  let hoverManager: HoverManager;

  beforeEach(() => {
    setupStandardEnvironment();
    settingsManager.enableHoverOverlay = true;
    settingsManager.disableUI = false;
    settingsManager.isEPFL = false;
    settingsManager.isEciOnHover = false;
    settingsManager.isShowNextPass = false;
    hoverManager = new HoverManager();
    hoverManager.init();
  });

  const lines = (): string[] => [getEl('sat-hoverbox2')!.textContent ?? '', getEl('sat-hoverbox3')!.textContent ?? ''];

  it('does not repeat the launch line or call a flown OEM probe "Planned"', () => {
    hoverManager['satObj_'](makeOemSat('Lucy'));
    const [line2, line3] = lines();

    expect(line2).toBe(t7e('hoverManager.launchedUnknown'));
    expect(line3).toBe('');
    expect([line2, line3]).not.toContain(t7e('hoverManager.launchedPlanned'));
  });

  it('uses the international designator year when the OEM carries one', () => {
    hoverManager['satObj_'](makeOemSat('2021-093A'));

    expect(lines()[0]).toBe(`${t7e('hoverManager.launched')}: 2021`);
    expect(lines()[1]).toBe('');
  });
});
