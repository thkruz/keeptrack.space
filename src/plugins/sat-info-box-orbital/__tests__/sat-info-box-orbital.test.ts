import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { getEl } from '@app/engine/utils/get-el';
import * as isThisNodeModule from '@app/engine/utils/isThisNode';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { SatInfoBoxOrbital } from '@app/plugins/sat-info-box-orbital/sat-info-box-orbital';
import { EL } from '@app/plugins/sat-info-box-orbital/sat-info-box-orbital-html';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

/**
 * Regression test for issue #1195:
 * `Cannot set properties of null (setting 'innerHTML')` thrown from
 * `SatInfoBoxOrbital.updateOrbitData_` when a satellite is preselected
 * (e.g. via `?sat=` URL param) before the SatInfoBox DOM has been built.
 */
describe('SatInfoBoxOrbital - update before DOM ready', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
    // Ensure time manager has a real simulationTimeObj for gmst lookup
    ServiceLocator.getTimeManager().simulationTimeObj = new Date(2023, 1, 1);
    // Simulate browser behavior: getEl() returns null for missing elements
    // instead of throwing (the test-env throw is a debug aid that hides the
    // real production race condition we want to validate).
    vi.spyOn(isThisNodeModule, 'isThisNode').mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not throw when updateSelectBox fires before the orbital DOM is created', () => {
    const plugin = new SatInfoBoxOrbital();

    plugin.init();

    // Sanity: the orbital DOM should not have been built yet because we
    // intentionally skipped the satInfoBoxInit / uiManagerFinal events.
    expect(getEl(EL.APOGEE, true)).toBeNull();

    expect(() => {
      EventBus.getInstance().emit(EventBusEvent.updateSelectBox, defaultSat);
    }).not.toThrow();

    // The non-Satellite branch (missiles, etc.) also reaches DOM-touching code.
    const fakeMissile = {
      isSatellite: () => false,
      totalVelocity: 7.5,
    };

    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      EventBus.getInstance().emit(EventBusEvent.updateSelectBox, fakeMissile as any);
    }).not.toThrow();
  });
});

describe('SatInfoBoxOrbital data population', () => {
  let plugin: SatInfoBoxOrbital;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
    ServiceLocator.getTimeManager().simulationTimeObj = new Date(2023, 1, 1);
    plugin = new SatInfoBoxOrbital();
    websiteInit(plugin);
    // The orbital section holds every element updateOrbitData_ touches.
    document.body.insertAdjacentHTML('beforeend', p().createOrbitalSection());
    vi.stubGlobal('requestIdleCallback', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('createOrbitalSection / createOrbitalDataRows build markup with the apogee row', () => {
    expect(p().createOrbitalSection()).toContain(EL.APOGEE);
    expect(p().createOrbitalDataRows()).toContain('Apogee');
  });

  it('updateOrbitData_ populates the apogee/perigee/period rows for a satellite', () => {
    p().updateOrbitData_(defaultSat);

    expect(getEl(EL.APOGEE)!.textContent).toBeTruthy();
  });

  it('updateOrbitData_ ignores a null object', () => {
    expect(() => p().updateOrbitData_(null)).not.toThrow();
  });

  it('updateOrbitData_ handles a non-satellite (missile) object', () => {
    const missile = { isSatellite: () => false, isMissile: () => true, totalVelocity: 7.5 };

    expect(() => p().updateOrbitData_(missile)).not.toThrow();
  });

  it('updateSectionHeader_ updates the section title without throwing', () => {
    expect(() => p().updateSectionHeader_()).not.toThrow();
  });

  it('a secondary-sat selection drives the relative-distance rows', () => {
    PluginRegistry.getPlugin(SelectSatManager)!.secondarySat = 0;
    vi.spyOn(ServiceLocator.getCatalogManager(), 'getObject').mockReturnValue(defaultSat);

    expect(() => p().updateOrbitData_(defaultSat)).not.toThrow();
  });
});
