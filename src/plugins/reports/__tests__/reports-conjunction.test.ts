import { validateConjunctionAnalysisState } from '@app/engine/conjunction/analysis-state';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { buildDownloadPayload } from '@app/plugins/reports/report-formatter';
import { ReportsPlugin } from '@app/plugins/reports/reports';
import { ScreeningRunInput } from '@app/plugins/reports/screening-diff';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { Satellite, TleLine1, TleLine2 } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

const l = (key: string): string => t7e(`plugins.ReportsPlugin.${key}` as Parameters<typeof t7e>[0]);

const L8_TLE1 = '1 39084U 13008A   22221.78099992  .00000176  00000-0  49109-4 0  9999' as TleLine1;
const L8_TLE2 = '2 39084  98.2198 291.4222 0001287  95.0667 265.0678 14.57105218504766' as TleLine2;

/** A LANDSAT 8 copy with another catalog number and, optionally, a different inclination. */
const makeSat = (id: number, name: string, sccNum: string, inclination = '98.2198'): Satellite =>
  new Satellite({
    id,
    name,
    tle1: L8_TLE1.replace('39084', sccNum) as TleLine1,
    tle2: L8_TLE2.replace('39084', sccNum).replace('98.2198', inclination) as TleLine2,
  });

describe('ReportsPlugin conjunction and maneuver reports', () => {
  let plugin: ReportsPlugin;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;
  const getReport = (id: string) => ReportsPlugin.getRegisteredReports().find((r) => r.id === id)!;
  const btn = (id: string) => getEl(`${id}-btn`) as HTMLButtonElement;

  const primary = makeSat(1, 'LANDSAT 8', '39084');
  // Tilted 0.1 deg so it crosses LANDSAT 8 near the nodes (a guaranteed close approach).
  const secondary = makeSat(2, 'TEST DEB', '99901', '98.3198');
  const analyst = makeSat(3, 'Analyst Sat 59328', '90000');

  analyst.derivedFromSccNum = '39084';

  const runs: ScreeningRunInput[] = [
    // Newest first, as the Debris Screening accessor returns them.
    { primaryId: '90000', startTimeMs: 0, endTimeMs: 1, rows: [{ secondaryId: '22707', tcaMs: 2_000, missDistance: 1.98, probabilityOfCollision: 9.8e-8 }] },
    {
      primaryId: '39084',
      startTimeMs: 0,
      endTimeMs: 1,
      rows: [
        { secondaryId: '27493', tcaMs: 1_000, missDistance: 3.28, probabilityOfCollision: 3.15e-6 },
        { secondaryId: '90000', tcaMs: 1_500, missDistance: 0.66, probabilityOfCollision: 4.88e-4 },
      ],
    },
  ];

  const select = (primaryObj: unknown, secondaryObj: Satellite | null = null): void => {
    p().selectSatManager_ = { primarySatObj: primaryObj, secondarySatObj: secondaryObj };
    p().updateReportAvailability_();
  };

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new ReportsPlugin();
    websiteInit(plugin);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists the three reports and the search-window option in the menu', () => {
    const menu = p().buildSideMenuHtml_();

    expect(menu).toContain('conjunction-report-btn');
    expect(menu).toContain('maneuver-report-btn');
    expect(menu).toContain('screening-compare-report-btn');
    expect(menu).toContain('reports-conj-window');
    expect(menu).toContain('reports-conj-note');
    expect(getReport('conjunction-report').section).toBe('conjunction');
  });

  describe('disabled states', () => {
    it('disables the Conjunction Report until a secondary is selected, and says why', () => {
      select(primary);

      expect(btn('conjunction-report').disabled).toBe(true);
      expect(btn('conjunction-report').getAttribute('kt-tooltip')).toBe(l('reasons.selectSecondary'));
      expect(getEl('reports-conj-note')!.textContent).toContain(l('reasons.selectSecondary'));
      expect(getEl('reports-conj-note')!.style.display).toBe('block');

      select(primary, secondary);

      expect(btn('conjunction-report').disabled).toBe(false);
      expect(btn('conjunction-report').getAttribute('kt-tooltip')).toBe(l('reports.conjunction.description'));
    });

    it('treats the primary selected as its own secondary as no secondary', () => {
      select(primary, primary);

      expect(btn('conjunction-report').disabled).toBe(true);
    });

    it('enables the Maneuver Report only for an analyst satellite', () => {
      select(primary);
      expect(btn('maneuver-report').disabled).toBe(true);
      expect(btn('maneuver-report').getAttribute('kt-tooltip')).toBe(l('reasons.selectAnalyst'));

      select(analyst);
      expect(btn('maneuver-report').disabled).toBe(false);
    });

    it('enables the screening comparison once two runs are retained', () => {
      select(primary);
      expect(btn('screening-compare-report').disabled).toBe(true);
      expect(btn('screening-compare-report').getAttribute('kt-tooltip')).toBe(l('reasons.needTwoRuns'));

      vi.spyOn(p(), 'getRetainedScreeningRuns_').mockReturnValue(runs);
      select(primary);
      expect(btn('screening-compare-report').disabled).toBe(false);
    });

    it('hides the note when every conjunction report is available', () => {
      vi.spyOn(p(), 'getRetainedScreeningRuns_').mockReturnValue(runs);
      select(analyst, secondary);

      expect(getEl('reports-conj-note')!.style.display).toBe('none');
    });

    it('makes the command palette entries unavailable while a prerequisite is missing', () => {
      select(primary);
      const command = plugin.getCommandPaletteCommands().find((c) => c.id === 'ReportsPlugin.conjunction-report')!;

      expect(command.isAvailable!()).toBe(false);
      select(primary, secondary);
      expect(command.isAvailable!()).toBe(true);
    });

    it('refuses to generate and warns instead of throwing when a prerequisite is missing', () => {
      select(primary);
      const openSpy = vi.spyOn(window, 'open');

      expect(() => p().generateReport_(getReport('conjunction-report'))).not.toThrow();
      expect(openSpy).not.toHaveBeenCalled();
    });
  });

  describe('generation through the plugin', () => {
    const ctx = () => ({ ...p().buildContext_(primary), generatedAt: new Date('2022-08-10T00:00:00Z') });

    it('Conjunction Report uses the selected secondary and emits a valid state', () => {
      select(primary, secondary);
      const data = getReport('conjunction-report').generate(primary, null, ctx());
      const json = JSON.parse(buildDownloadPayload(data, 'json').content);

      expect(validateConjunctionAnalysisState(json)).toEqual([]);
      expect(json.objects.map((o: { noradId: string }) => o.noradId)).toEqual(['39084', '99901']);
      expect(json.encounter.pcInputs.combinedHardBodyRadiusKm).toBeCloseTo(0.015, 9);
      expect(json.appVersion).toBe(__VERSION__);
    });

    it('Maneuver Report diffs the parent and analyst runs and drops the clone row', () => {
      vi.spyOn(p(), 'getRetainedScreeningRuns_').mockReturnValue(runs);
      vi.spyOn(p(), 'findSatellite_').mockImplementation((scc: unknown) => (scc === '39084' ? primary : null));
      select(analyst);

      const data = getReport('maneuver-report').generate(analyst, null, ctx());
      const json = JSON.parse(buildDownloadPayload(data, 'json').content);
      const diff = json.maneuverOptions[0].screeningDiff;

      expect(validateConjunctionAnalysisState(json)).toEqual([]);
      expect(diff.counts.introduced).toBe(1);
      expect(diff.counts.removed).toBe(1);
      expect(diff.excludedSecondaryIds).toEqual(expect.arrayContaining(['39084', '90000']));
      expect(diff.entries.some((e: { secondaryId: string }) => e.secondaryId === '90000')).toBe(false);
      expect(json.maneuverOptions[0].burnParametersAvailable).toBe(false);
    });

    it('Maneuver Report explains a missing screening diff', () => {
      vi.spyOn(p(), 'findSatellite_').mockReturnValue(primary);
      const data = getReport('maneuver-report').generate(analyst, null, ctx());
      const json = JSON.parse(buildDownloadPayload(data, 'json').content);

      expect(json.maneuverOptions[0].screeningDiff).toBeNull();
      expect(json.maneuverOptions[0].screeningDiffUnavailableReason).toContain('39084');
    });

    it('reads burn parameters from the Maneuver plugin when it exposes getBurnChain', () => {
      const fakeManeuver = {
        id: 'ManeuverPlugin',
        getBurnChain: (scc: string) =>
          scc === '90000'
            ? { records: [{ epochMs: Date.UTC(2022, 7, 9, 20), frame: 'ric', inputDvMs: { x: 0, y: 0.05, z: 0 }, magnitudeMs: 0.05, source: 'manual', parentSccNum: '39084' }] }
            : null,
      };

      PluginRegistry.addPlugin(fakeManeuver as never);
      const burns = p().readBurnHistory_('90000');

      expect(burns).toEqual([{ epochIso: '2022-08-09T20:00:00.000Z', frame: 'ric', inputDeltaVMs: [0, 0.05, 0], magnitudeMs: 0.05, source: 'manual', label: null }]);
      expect(p().readBurnHistory_('12345')).toBeNull();
    });

    it('returns null burns when no Maneuver plugin is loaded', () => {
      expect(p().readBurnHistory_('90000')).toBeNull();
    });

    it('Compare Last Two Screening Runs diffs older vs newer and excludes the shared lineage', () => {
      vi.spyOn(p(), 'getRetainedScreeningRuns_').mockReturnValue(runs);
      const bySccNum: Record<string, Satellite> = { '39084': primary, '90000': analyst };

      vi.spyOn(p(), 'findSatellite_').mockImplementation((scc: unknown) => bySccNum[scc as string] ?? null);

      const data = getReport('screening-compare-report').generate(primary, null, ctx());
      const json = JSON.parse(buildDownloadPayload(data, 'json').content);

      expect(validateConjunctionAnalysisState(json)).toEqual([]);
      expect(json.screeningDiff.preRun.primaryId).toBe('39084');
      expect(json.screeningDiff.postRun.primaryId).toBe('90000');
      expect(json.screeningDiff.excludedSecondaryIds).toEqual(expect.arrayContaining(['39084', '90000']));
    });

    it('reads the retained runs duck-typed and tolerates a Debris Screening without the accessor', () => {
      expect(p().getRetainedScreeningRuns_()).toEqual([]);
    });
  });

  it('persists the conjunction search window', () => {
    const conjEl = getEl('reports-conj-window') as HTMLSelectElement;

    conjEl.value = String(36 * 3600);
    p().readOptionsFromForm_();

    expect(p().conjHalfWidthSec_).toBe(36 * 3600);
    expect(p().buildContext_(primary).conjunctionHalfWidthSec).toBe(36 * 3600);
  });
});
