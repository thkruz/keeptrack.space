import { getEl } from '@app/engine/utils/get-el';
import { hasBottomIcon, hasHelp, hasSecondaryMenu, hasSideMenu } from '@app/engine/plugins/core/plugin-capabilities';
import { DebrisScreening } from '@app/plugins/debris-screening/debris-screening';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';

describe('DebrisScreening_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    window.M = {
      AutoInit: () => {
        // Mock the M.AutoInit function
      },
    } as unknown as typeof window.M;
  });

  standardPluginSuite(DebrisScreening, 'DebrisScreening');
  standardPluginMenuButtonTests(DebrisScreening, 'DebrisScreening');
});

describe('DebrisScreening_capabilities', () => {
  let plugin: DebrisScreening;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    window.M = {
      AutoInit: () => {
        // Mock the M.AutoInit function
      },
    } as unknown as typeof window.M;
    plugin = new DebrisScreening();
  });

  it('should have bottom icon capability', () => {
    expect(hasBottomIcon(plugin)).toBe(true);
    const config = plugin.getBottomIconConfig();

    expect(config.elementName).toBe('debris-screening-bottom-icon');
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

    expect(config.icon).toBe('table_chart');
    expect(config.html).toContain('results-table');
  });

  it('should have help capability', () => {
    expect(hasHelp(plugin)).toBe(true);
    const config = plugin.getHelpConfig();

    expect(config.title).toBe('Debris Screening');
    expect(config.body).toContain('TCA');
    expect(config.body).toContain('Probability of Collision');
  });
});

describe('DebrisScreening_form', () => {
  let debrisScreeningPlugin: DebrisScreening;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    window.M = {
      AutoInit: () => {
        // Mock the M.AutoInit function
      },
    } as unknown as typeof window.M;
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
    jest.advanceTimersByTime(1000);
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
    window.M = {
      AutoInit: () => {
        // Mock the M.AutoInit function
      },
    } as unknown as typeof window.M;
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
    window.M = {
      AutoInit: () => {
        // Mock the M.AutoInit function
      },
    } as unknown as typeof window.M;
    plugin = new DebrisScreening();
  });

  it('should format Pc correctly', () => {
    expect((plugin as any).formatPc_(1.23e-6)).toBe('1.23e-6');
    expect((plugin as any).formatPc_(1e-13)).toBe('<1e-12');
    expect((plugin as any).formatPc_()).toBe('N/A');
  });
});
