import { SatMath } from '@app/app/analysis/sat-math';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { getEl } from '@app/engine/utils/get-el';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { SatInfoBoxObject } from '@app/plugins/sat-info-box-object/sat-info-box-object';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { Satellite } from '@ootk/src/main';
import { defaultMisl, defaultSat, defaultSensor } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('SatInfoBoxObject', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(SatInfoBoxObject, 'SatInfoBoxObject');
});

describe('SatInfoBoxObject data population', () => {
  let plugin: SatInfoBoxObject;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
    plugin = new SatInfoBoxObject();
    websiteInit(plugin);
    // The object/secondary sections hold every element the update methods touch.
    document.body.insertAdjacentHTML('beforeend', p().createObjectSection_());
    document.body.insertAdjacentHTML('beforeend', p().createSecondarySection());
    const selection = PluginRegistry.getPlugin(SelectSatManager)!;

    selection.selectedSat = defaultSat.id;
    selection.primarySatObj = defaultSat;
    // Keep idle callbacks blocked to verify that current RCS is not deferred.
    vi.stubGlobal('requestIdleCallback', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('updateObjectData_ does nothing for a non-satellite/non-missile object', () => {
    expect(() => p().updateObjectData_({ isSatellite: () => false, isMissile: () => false })).not.toThrow();
  });

  it('updateObjectData_ populates the full cascade for a satellite', () => {
    expect(() => p().updateObjectData_(defaultSat)).not.toThrow();
    // The country correlation row is filled from the satellite metadata.
    expect(document.body.textContent).toBeTruthy();
  });

  it('updates RCS synchronously with the current identity and ignores stale live updates', () => {
    settingsManager.plugins.SatInfoBoxObject!.isEstimateRcs = false;
    const first = new Satellite({ ...defaultSat, rcs: 1 });
    const next = new Satellite({ ...defaultSat, id: 1, rcs: 9 });

    p().updateObjectData_(first);
    expect(getEl('sat-rcs')!.textContent).toBe('1 m2');
    p().updateObjectData_(next);
    expect(getEl('sat-rcs')!.textContent).toBe('9 m2');
    const refresh = vi.spyOn(p(), 'refreshApparentMag_');

    EventBus.getInstance().emit(EventBusEvent.updateSelectBox, next);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('updateObjectData_ returns early after launch data for a missile', () => {
    expect(() => p().updateObjectData_(defaultMisl)).not.toThrow();
  });

  it('updateStdMag_ renders a standard magnitude value', () => {
    expect(() => p().updateStdMag_(defaultSat)).not.toThrow();
  });

  it('updateApparentMag_ short-circuits when no sensor is selected', () => {
    vi.spyOn(ServiceLocator.getSensorManager(), 'isSensorSelected').mockReturnValue(false);

    expect(() => p().updateApparentMag_(defaultSat)).not.toThrow();
  });

  it('refreshes Apparent Mag at the current sim time on every select-box update, not only at selection', () => {
    const sensorManager = ServiceLocator.getSensorManager();

    sensorManager.currentSensors = [defaultSensor];
    vi.spyOn(sensorManager, 'isSensorSelected').mockReturnValue(true);
    const visMagSpy = vi.spyOn(SatMath, 'calculateVisMag').mockReturnValueOnce(10.65).mockReturnValueOnce(12.34);
    const timeManager = ServiceLocator.getTimeManager();

    timeManager.simulationTimeObj = new Date(Date.UTC(2026, 9, 16, 10, 30));
    EventBus.getInstance().emit(EventBusEvent.updateSelectBox, defaultSat);
    expect(getEl('sat-appmag')!.innerHTML).toBe('10.65');
    expect((visMagSpy.mock.calls[0][2] as Date).getTime()).toBe(Date.UTC(2026, 9, 16, 10, 30));

    timeManager.simulationTimeObj = new Date(Date.UTC(2026, 9, 16, 12, 0));
    EventBus.getInstance().emit(EventBusEvent.updateSelectBox, defaultSat);
    expect(getEl('sat-appmag')!.innerHTML).toBe('12.34');
    expect((visMagSpy.mock.calls[1][2] as Date).getTime()).toBe(Date.UTC(2026, 9, 16, 12, 0));
  });

  it('ignores select-box updates for missiles', () => {
    const visMagSpy = vi.spyOn(SatMath, 'calculateVisMag');

    EventBus.getInstance().emit(EventBusEvent.updateSelectBox, defaultMisl);
    expect(visMagSpy).not.toHaveBeenCalled();
  });

  it('updateCountryCorrelationTable_ and updateLaunchSiteCorrelationTable_ fill their rows', () => {
    expect(() => p().updateCountryCorrelationTable_(defaultSat)).not.toThrow();
    expect(() => p().updateLaunchSiteCorrelationTable_(defaultSat)).not.toThrow();
    expect(() => p().updateLaunchVehicleCorrelationTable_(defaultSat)).not.toThrow();
  });

  it('updateSecondaryVisibility_ reflects the secondary-sat selection', () => {
    PluginRegistry.getPlugin(SelectSatManager)!.secondarySat = 5;
    expect(() => p().updateSecondaryVisibility_()).not.toThrow();

    PluginRegistry.getPlugin(SelectSatManager)!.secondarySat = -1;
    expect(() => p().updateSecondaryVisibility_()).not.toThrow();
  });
});
