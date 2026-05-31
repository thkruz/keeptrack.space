import { vi } from 'vitest';
/* eslint-disable max-lines-per-function */
/* eslint-disable dot-notation */
/* eslint-disable no-new */
import { MenuMode } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { ReportsPlugin } from '@app/plugins/reports/reports';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';

describe('ReportsPlugin_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  standardPluginSuite(ReportsPlugin, 'ReportsPlugin');
  standardPluginMenuButtonTests(ReportsPlugin, 'ReportsPlugin');

  describe('Configuration methods', () => {
    it('should return correct bottom icon config', () => {
      const plugin = new ReportsPlugin();
      const config = plugin.getBottomIconConfig();

      expect(config.elementName).toBe('reports-bottom-icon');
      expect(config.image).toBeDefined();
      expect(config.menuMode).toContain(MenuMode.ANALYSIS);
      expect(config.menuMode).toContain(MenuMode.ALL);
      expect(config.isDisabledOnLoad).toBe(true);
    });

    it('should return correct side menu config', () => {
      const plugin = new ReportsPlugin();
      const config = plugin.getSideMenuConfig();

      expect(config.elementName).toBe('reports-menu');
      expect(config.title).toBeDefined();
      expect(config.dragOptions?.isDraggable).toBe(false);
      expect(config.dragOptions?.minWidth).toBe(320);
    });

    it('should return correct help config', () => {
      const plugin = new ReportsPlugin();
      const helpConfig = plugin.getHelpConfig();

      expect(helpConfig.title).toBeDefined();
      expect(helpConfig.body).toBeDefined();
    });

    it('should return command palette commands for all reports', () => {
      const plugin = new ReportsPlugin();
      const commands = plugin.getCommandPaletteCommands();

      // 1 open command + 6 built-in report commands
      expect(commands.length).toBeGreaterThanOrEqual(7);
      expect(commands[0].id).toBe('ReportsPlugin.open');
      expect(commands[0].category).toBe('Analysis');

      const reportIds = commands.slice(1).map((c) => c.id);

      expect(reportIds).toContain('ReportsPlugin.aer-report');
      expect(reportIds).toContain('ReportsPlugin.lla-report');
      expect(reportIds).toContain('ReportsPlugin.eci-report');
      expect(reportIds).toContain('ReportsPlugin.coes-report');
      expect(reportIds).toContain('ReportsPlugin.visibility-windows-report');
      expect(reportIds).toContain('ReportsPlugin.sun-eclipse-report');
    });

    it('should have isAvailable on report commands', () => {
      const plugin = new ReportsPlugin();
      const commands = plugin.getCommandPaletteCommands();
      const reportCommands = commands.filter((c) => c.id !== 'ReportsPlugin.open');

      for (const cmd of reportCommands) {
        expect(cmd.isAvailable).toBeInstanceOf(Function);
        // No satellite selected, so all should be unavailable
        expect(cmd.isAvailable!()).toBe(false);
      }
    });

    it('should build side menu HTML with buttons container', () => {
      const plugin = new ReportsPlugin();
      const sideMenuHtml = plugin['buildSideMenuHtml_']();

      expect(sideMenuHtml).toContain('reports-menu');
      expect(sideMenuHtml).toContain('reports-content');
      expect(sideMenuHtml).toContain('reports-buttons');
    });
  });

  describe('bottomIconCallback bridge', () => {
    it('should call onBottomIconClick', () => {
      const plugin = new ReportsPlugin();

      websiteInit(plugin);

      const spy = vi.spyOn(plugin, 'onBottomIconClick');

      plugin.bottomIconCallback();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Report registry', () => {
    it('should have built-in reports registered', () => {
      // Constructor registers built-in reports as a side effect
      new ReportsPlugin();
      const reports = ReportsPlugin.getRegisteredReports();

      expect(reports.length).toBeGreaterThanOrEqual(6);
    });

    it('should include all expected report IDs', () => {
      new ReportsPlugin();
      const reports = ReportsPlugin.getRegisteredReports();
      const ids = reports.map((r) => r.id);

      expect(ids).toContain('aer-report');
      expect(ids).toContain('lla-report');
      expect(ids).toContain('eci-report');
      expect(ids).toContain('coes-report');
      expect(ids).toContain('visibility-windows-report');
      expect(ids).toContain('sun-eclipse-report');
    });

    it('should register and unregister custom reports', () => {
      new ReportsPlugin();
      const countBefore = ReportsPlugin.getRegisteredReports().length;

      ReportsPlugin.registerReport({
        id: 'test-report',
        name: 'Test Report',
        generate: () => ({ filename: 'test', header: '', body: '' }),
      });

      expect(ReportsPlugin.getRegisteredReports().length).toBe(countBefore + 1);

      ReportsPlugin.unregisterReport('test-report');

      expect(ReportsPlugin.getRegisteredReports().length).toBe(countBefore);
    });

    it('should mark sensor-requiring reports correctly', () => {
      new ReportsPlugin();
      const reports = ReportsPlugin.getRegisteredReports();

      const aerReport = reports.find((r) => r.id === 'aer-report');
      const llaReport = reports.find((r) => r.id === 'lla-report');

      expect(aerReport?.requiresSensor).toBe(true);
      expect(llaReport?.requiresSensor).toBe(false);
    });
  });

  describe('isRequireSatelliteSelected', () => {
    it('should require satellite selection', () => {
      const plugin = new ReportsPlugin();

      expect(plugin.isRequireSatelliteSelected).toBe(true);
    });
  });
});

describe('ReportsPlugin report generation', () => {
  let plugin: ReportsPlugin;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;
  const startTime = new Date('2022-01-01T00:00:00Z');

  // A lightweight sensor stub so the dense 7-day / 72-hour loops don't run real
  // SGP4 per step. A counter flips isRaeInFov so visibility windows open & close.
  const makeFakeSensor = () => {
    let n = 0;

    return {
      name: 'FAKE', getTypeString: () => 'Optical',
      lat: 0, lon: 0, alt: 0, minAz: 0, maxAz: 360, minEl: 0, maxEl: 90, minRng: 0, maxRng: 100000,
      rae: () => ({ az: 100, el: ((n++ % 20) < 10) ? 15 : -5, rng: 500 }),
      isRaeInFov: () => (n % 20) < 5,
    };
  };

  const getReport = (id: string) => ReportsPlugin.getRegisteredReports().find((r) => r.id === id)!;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new ReportsPlugin();
    websiteInit(plugin);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lla / eci / coes / sun-eclipse generators produce a header and body', () => {
    for (const id of ['lla-report', 'eci-report', 'coes-report', 'sun-eclipse-report']) {
      const data = getReport(id).generate(defaultSat, null, startTime);

      expect(data.filename).toContain(id.replace('-report', ''));
      expect(data.header).toContain('Report');
      expect(data.body.length).toBeGreaterThan(0);
    }
  });

  it('aer generator produces az/el/range rows with a sensor', () => {
    const data = getReport('aer-report').generate(defaultSat, makeFakeSensor() as never, startTime);

    expect(data.header).toContain('Azimuth Elevation Range');
    expect(data.body).toContain('Azimuth');
  });

  it('aer generator throws without a sensor', () => {
    expect(() => getReport('aer-report').generate(defaultSat, null, startTime)).toThrow('Sensor is required');
  });

  it('visibility-windows generator records rise/set passes', () => {
    const data = getReport('visibility-windows-report').generate(defaultSat, makeFakeSensor() as never, startTime);

    expect(data.header).toContain('Visibility Windows');
    expect(data.body).toContain('Pass #');
  });

  it('visibility-windows generator throws without a sensor', () => {
    expect(() => getReport('visibility-windows-report').generate(defaultSat, null, startTime)).toThrow('Sensor is required');
  });

  describe('generateReport_ + writeReport_', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    // A controlled fake popup. The source calls document.open()/close() which
    // nulls a synthetic HTMLDocument's body, so we delegate createElement/body
    // to a detached doc and no-op open/close.
    const fakeWindow = () => {
      const real = document.implementation.createHTMLDocument('rep');
      const doc = {
        open: vi.fn(), close: vi.fn(), title: '',
        createElement: (t: string) => real.createElement(t),
        body: real.body,
      };
      const win = { document: doc, history: { replaceState: vi.fn() } } as unknown as Window;

      return { win, real };
    };

    it('writes the report into a popup window', () => {
      const { win, real } = fakeWindow();

      vi.spyOn(window, 'open').mockReturnValue(win);
      p().selectSatManager_ = { primarySatObj: defaultSat };

      p().generateReport_(getReport('coes-report'));

      expect(real.querySelector('pre')!.textContent).toContain('Report');
      expect(real.querySelector('a')!.download).toBe(`coes-${defaultSat.sccNum}.txt`);
    });

    it('alerts when the popup is blocked', () => {
      vi.spyOn(window, 'open').mockReturnValue(null);
      const alertSpy = vi.fn();

      vi.stubGlobal('alert', alertSpy);

      p().writeReport_({ filename: 'x', header: 'h', body: 'a,b\n1,2' });

      expect(alertSpy).toHaveBeenCalled();
    });

    it('aborts generateReport_ when no satellite is selected', () => {
      p().selectSatManager_ = { primarySatObj: null };
      const openSpy = vi.spyOn(window, 'open');

      p().generateReport_(getReport('lla-report'));

      expect(openSpy).not.toHaveBeenCalled();
    });

    it('aborts a sensor-requiring report when no sensor is selected', () => {
      p().selectSatManager_ = { primarySatObj: defaultSat };
      vi.spyOn(ServiceLocator.getSensorManager(), 'isSensorSelected').mockReturnValue(false);
      const openSpy = vi.spyOn(window, 'open');

      p().generateReport_(getReport('aer-report'));

      expect(openSpy).not.toHaveBeenCalled();
    });
  });

  describe('getSat_ / getSensor_ guards', () => {
    it('getSat_ returns the satellite when one is selected', () => {
      p().selectSatManager_ = { primarySatObj: defaultSat };

      expect(p().getSat_()).toBe(defaultSat);
    });

    it('getSat_ warns and returns null for a non-satellite primary object', () => {
      p().selectSatManager_ = { primarySatObj: { name: 'not a sat' } };

      expect(p().getSat_()).toBeNull();
    });

    it('getSensor_ returns null when no sensor is selected', () => {
      vi.spyOn(ServiceLocator.getSensorManager(), 'isSensorSelected').mockReturnValue(false);

      expect(p().getSensor_()).toBeNull();
    });

    it('a report button click runs the full pipeline', () => {
      vi.spyOn(window, 'open').mockReturnValue(null);
      const alertSpy = vi.fn();

      vi.stubGlobal('alert', alertSpy);
      p().selectSatManager_ = { primarySatObj: defaultSat };
      getEl('coes-report-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      vi.unstubAllGlobals();
      expect(alertSpy).toHaveBeenCalled();
    });
  });
});
