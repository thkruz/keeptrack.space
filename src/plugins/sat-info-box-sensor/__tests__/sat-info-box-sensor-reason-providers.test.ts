import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { type FovReasonProvider, SatInfoBoxSensor } from '@app/plugins/sat-info-box-sensor/sat-info-box-sensor';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { defaultSat, defaultSensor } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('SatInfoBoxSensor reason providers', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cls = SatInfoBoxSensor as any;
  const row = () => getEl('sat-fov-reason', true) as HTMLElement;
  let saved: FovReasonProvider[];

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
    websiteInit(new SatInfoBoxSensor());
    if (!getEl('sat-fov-reason', true)) {
      document.body.insertAdjacentHTML('beforeend', '<div><div id="sat-fov-reason"></div></div>');
    }
    saved = cls.reasonProviders_.splice(0);
    ServiceLocator.getSensorManager().currentSensors = [defaultSensor];
    vi.spyOn(PluginRegistry.getPlugin(SelectSatManager)!, 'primarySatObj', 'get').mockReturnValue(defaultSat);
  });

  afterEach(() => {
    cls.reasonProviders_.splice(0, cls.reasonProviders_.length, ...saved);
    vi.restoreAllMocks();
  });

  it('leaves the row alone without providers', () => {
    row().innerHTML = 'Range below min';
    cls.appendReasonExtras_(false);

    expect(row().innerHTML).toBe('Range below min');
  });

  it('groups geometry and provider lines by category', () => {
    SatInfoBoxSensor.registerReasonProvider(() => [{ category: 'sensor', text: 'Site in daylight' }]);
    row().innerHTML = 'Range below min';
    cls.appendReasonExtras_(false);

    expect(row().innerHTML).toContain('Range below min');
    expect(row().innerHTML).toContain('Site in daylight');
    expect(row().innerHTML).toContain('<br>');
  });

  it('shows only sensor lines when the object is inside the sensor limits', () => {
    SatInfoBoxSensor.registerReasonProvider(() => [{ category: 'sensor', text: 'Target in Earth shadow' }]);
    cls.appendReasonExtras_(true);

    expect(row().innerHTML).toContain('Target in Earth shadow');
    expect(row().parentElement!.style.display).toBe('flex');
  });

  it('does nothing in view when providers return no sensor lines', () => {
    SatInfoBoxSensor.registerReasonProvider(() => []);
    row().innerHTML = '-';
    cls.appendReasonExtras_(true);

    expect(row().innerHTML).toBe('-');
  });

  it('survives a throwing provider', () => {
    SatInfoBoxSensor.registerReasonProvider(() => {
      throw new Error('boom');
    });
    row().innerHTML = 'x';

    expect(() => cls.appendReasonExtras_(false)).not.toThrow();
  });
});
