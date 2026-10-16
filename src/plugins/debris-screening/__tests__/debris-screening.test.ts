import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { hasBottomIcon, hasHelp, hasSecondaryMenu, hasSideMenu } from '@app/engine/plugins/core/plugin-capabilities';
import { getEl } from '@app/engine/utils/get-el';
import { DebrisScreening } from '@app/plugins/debris-screening/debris-screening';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import type { DsResultRow } from '@app/webworker/debris-screening-messages';
import { CatalogScreener, EpochUTC, Satellite, ScreeningResult } from '@ootk/src/main';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('DebrisScreening_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  standardPluginSuite(DebrisScreening, 'DebrisScreening');
  standardPluginMenuButtonTests(DebrisScreening, 'DebrisScreening');
});

describe('DebrisScreening_capabilities', () => {
  let plugin: DebrisScreening;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new DebrisScreening();
  });

  it('should have bottom icon capability', () => {
    expect(hasBottomIcon(plugin)).toBe(true);
    const config = plugin.getBottomIconConfig();

    expect(config.elementName).toBe('conjunction-screen-icon');
    expect(config.label).toBe('Debris Screening');
    expect(config.isDisabledOnLoad).toBe(true);
  });

  it('should have side menu capability', () => {
    expect(hasSideMenu(plugin)).toBe(true);
    const config = plugin.getSideMenuConfig();

    expect(config.elementName).toBe('debris-screening-menu');
    expect(config.title).toBe('Debris Screening');
  });

  it('should have secondary menu capability', () => {
    expect(hasSecondaryMenu(plugin)).toBe(true);
    const config = plugin.getSecondaryMenuConfig();

    expect(config.icon).toBeDefined();
    expect(config.html).toContain('results-table');
  });

  it('should have help capability', () => {
    expect(hasHelp(plugin)).toBe(true);
    const config = plugin.getHelpConfig();

    expect(config.title).toBe('Debris Screening');
    const allContent = config.sections!.map((s) => s.content).join(' ');

    expect(allContent).toContain('TCA');
    expect(allContent).toContain('probability of collision');
  });
});

describe('DebrisScreening_form', () => {
  let debrisScreeningPlugin: DebrisScreening;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    debrisScreeningPlugin = new DebrisScreening();
  });

  it('should have a form with time and UVW selectors', () => {
    websiteInit(debrisScreeningPlugin);
    expect(getEl('debris-screening-menu-form')).toBeDefined();
    expect(getEl('ds-scc')).toBeDefined();
    expect(getEl('ds-time')).toBeDefined();
    expect(getEl('ds-u')).toBeDefined();
    expect(getEl('ds-v')).toBeDefined();
    expect(getEl('ds-w')).toBeDefined();
  });

  it('should have Draw Box and Clear Box buttons', () => {
    websiteInit(debrisScreeningPlugin);
    expect(getEl('ds-draw-box')).toBeDefined();
    expect(getEl('ds-clear-box')).toBeDefined();
  });

  it('should have results table in secondary menu', () => {
    websiteInit(debrisScreeningPlugin);
    expect(getEl('ds-results-body')).toBeDefined();
    expect(getEl('ds-results-count')).toBeDefined();
    expect(getEl('debris-screening-results-export')).toBeDefined();
  });

  it('should handle form submission without throwing', () => {
    websiteInit(debrisScreeningPlugin);
    expect(() => getEl('debris-screening-menu-form')!.dispatchEvent(new Event('submit'))).not.toThrow();
    vi.advanceTimersByTime(1000);
  });

  it('should handle export button click without throwing', () => {
    websiteInit(debrisScreeningPlugin);
    expect(() => getEl('debris-screening-results-export')!.click()).not.toThrow();
  });
});

describe('DebrisScreening_risk_classification', () => {
  let plugin: DebrisScreening;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new DebrisScreening();
  });

  it('should classify Pc > 1e-4 as Critical', () => {
    // Access private method via any cast for testing
    const risk = (plugin as any).getRiskLevel_(1e-3);

    expect(risk.label).toBe('Critical');
    expect(risk.className).toBe('risk-critical');
  });

  it('should classify Pc > 1e-6 as High', () => {
    const risk = (plugin as any).getRiskLevel_(1e-5);

    expect(risk.label).toBe('High');
    expect(risk.className).toBe('risk-high');
  });

  it('should classify Pc > 1e-8 as Medium', () => {
    const risk = (plugin as any).getRiskLevel_(1e-7);

    expect(risk.label).toBe('Medium');
    expect(risk.className).toBe('risk-medium');
  });

  it('should classify Pc <= 1e-8 as Low', () => {
    const risk = (plugin as any).getRiskLevel_(1e-9);

    expect(risk.label).toBe('Low');
    expect(risk.className).toBe('risk-low');
  });

  it('should handle undefined Pc', () => {
    const risk = (plugin as any).getRiskLevel_();

    expect(risk.label).toBe('N/A');
    expect(risk.className).toBe('risk-unknown');
  });
});

describe('DebrisScreening_formatting', () => {
  let plugin: DebrisScreening;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new DebrisScreening();
  });

  it('should format Pc correctly', () => {
    expect((plugin as any).formatPc_(1.23e-6)).toBe('1.23e-6');
    expect((plugin as any).formatPc_(1e-13)).toBe('<1e-12');
    expect((plugin as any).formatPc_()).toBe('N/A');
  });
});

describe('DebrisScreening_follows_selection', () => {
  let plugin: DebrisScreening;
  const satA = new Satellite({ ...defaultSat, id: 0, sccNum: '25544' });
  const satB = new Satellite({ ...defaultSat, id: 1, sccNum: '43013' });
  const staleRow: DsResultRow = {
    secondaryId: '11111',
    tcaMs: Date.UTC(2022, 0, 1),
    missDistance: 1,
    radialDistance: 0.1,
    intrackDistance: 0.5,
    crosstrackDistance: 0.2,
    relativeVelocity: 7,
    probabilityOfCollision: 1e-5,
    riskScore: 0.5,
  };

  type Internals = { rows_: DsResultRow[]; renderRows_: (rows: DsResultRow[]) => void };

  const openWithResultsFor = (sat: Satellite) => {
    plugin.isMenuButtonActive = true;
    (getEl('ds-scc') as HTMLInputElement).value = sat.sccNum;
    const internals = plugin as unknown as Internals;

    internals.rows_ = [staleRow];
    internals.renderRows_(internals.rows_);
  };

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new DebrisScreening();
    websiteInit(plugin);
  });

  it('updates the SCC# field and clears stale results when the selection changes while open', () => {
    const onSelectSpy = vi.spyOn(plugin as unknown as { onSelectSatData_: (obj: unknown) => void }, 'onSelectSatData_');

    openWithResultsFor(satA);
    expect(getEl('ds-results-body')!.querySelectorAll('tr')).toHaveLength(1);

    EventBus.getInstance().emit(EventBusEvent.selectSatData, satB, satB.id);

    expect(onSelectSpy).toHaveBeenCalled();
    expect((getEl('ds-scc') as HTMLInputElement).value).toBe('43013');
    expect((plugin as unknown as Internals).rows_).toHaveLength(0);
    expect(getEl('ds-results-body')!.querySelectorAll('tr')).toHaveLength(0);
    expect(getEl('ds-results-count')!.textContent).toBe('0 conjunctions found');
  });

  it('keeps results when the same satellite is re-selected', () => {
    openWithResultsFor(satA);

    EventBus.getInstance().emit(EventBusEvent.selectSatData, satA, satA.id);

    expect((getEl('ds-scc') as HTMLInputElement).value).toBe('25544');
    expect((plugin as unknown as Internals).rows_).toHaveLength(1);
  });

  it('does nothing while the menu is closed', () => {
    openWithResultsFor(satA);
    plugin.isMenuButtonActive = false;

    EventBus.getInstance().emit(EventBusEvent.selectSatData, satB, satB.id);

    expect((getEl('ds-scc') as HTMLInputElement).value).toBe('25544');
    expect((plugin as unknown as Internals).rows_).toHaveLength(1);
  });
});

describe('DebrisScreening_recent_runs', () => {
  let plugin: DebrisScreening;

  /** A screener result shaped like ootk's (only the fields toRow_ reads). */
  const fakeResult = (primaryId: string, secondaryId: string, pc: number): ScreeningResult =>
    ({
      primaryId,
      secondaryId,
      riskScore: 0.5,
      event: {
        tca: EpochUTC.fromDateTime(new Date(Date.UTC(2022, 0, 1, 1))),
        missDistance: 0.5,
        radialDistance: 0.1,
        intrackDistance: 0.2,
        crosstrackDistance: 0.1,
        relativeVelocity: 7,
        probabilityOfCollision: pc,
      },
    }) as unknown as ScreeningResult;

  /** Run the synchronous screening path for one primary, with the screener stubbed. */
  const runScreening = (sccNum: string, id: number, hours = 72): void => {
    const sat = new Satellite({ ...defaultSat, id, sccNum });
    const catalog = ServiceLocator.getCatalogManager();

    vi.spyOn(catalog, 'sccNum2Id').mockReturnValue(id as never);
    vi.spyOn(catalog, 'getObject').mockReturnValue(sat as never);
    catalog.objectCache = [] as never;
    vi.spyOn(CatalogScreener, 'screenOneToMany').mockReturnValue([fakeResult(sccNum, `S${sccNum}`, 1e-5)]);
    (getEl('ds-scc') as HTMLInputElement).value = sccNum;
    (getEl('ds-time') as HTMLInputElement).value = String(hours);

    plugin.onFormSubmit();
    vi.advanceTimersByTime(1000);
  };

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new DebrisScreening();
    websiteInit(plugin);
    vi.spyOn(plugin as unknown as { calculateCovarianceFromSatellite: () => unknown }, 'calculateCovarianceFromSatellite').mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retains two runs newest first with their primary ids and windows', () => {
    const startMs = ServiceLocator.getTimeManager().simulationTimeObj.getTime();

    runScreening('25544', 0, 24);
    runScreening('43013', 1, 48);

    const runs = plugin.getRecentScreeningRuns();

    expect(runs.map((run) => run.primaryId)).toEqual(['43013', '25544']);
    expect(runs[0].rows.map((row) => row.secondaryId)).toEqual(['S43013']);
    expect(runs[1].rows.map((row) => row.secondaryId)).toEqual(['S25544']);
    expect(runs[1].startTimeMs).toBe(startMs);
    expect(runs[1].endTimeMs).toBe(startMs + 24 * 3600 * 1000);
    expect(runs[0].endTimeMs! - runs[0].startTimeMs!).toBe(48 * 3600 * 1000);
  });

  it('evicts the oldest run once a sixth run completes', () => {
    ['10001', '10002', '10003', '10004', '10005', '10006'].forEach((scc, i) => {
      runScreening(scc, i + 10);
    });

    const runs = plugin.getRecentScreeningRuns();

    expect(runs).toHaveLength(DebrisScreening.MAX_RETAINED_RUNS);
    expect(runs.map((run) => run.primaryId)).toEqual(['10006', '10005', '10004', '10003', '10002']);
  });

  it('keeps the run history when the target change clears the results table', () => {
    runScreening('25544', 0);

    (plugin as unknown as { onTargetChanged_: () => void }).onTargetChanged_();

    expect((plugin as unknown as { rows_: unknown[] }).rows_).toHaveLength(0);
    expect(plugin.getRecentScreeningRuns()).toHaveLength(1);
    expect(plugin.getRecentScreeningRuns()[0].rows).toHaveLength(1);
  });

  it('is reachable through PluginRegistry, the way the Reports plugin reads it', () => {
    runScreening('25544', 0);

    const registered = PluginRegistry.getPlugin(DebrisScreening);

    expect(registered).toBe(plugin);
    expect(registered!.getRecentScreeningRuns()[0].primaryId).toBe('25544');
  });
});
