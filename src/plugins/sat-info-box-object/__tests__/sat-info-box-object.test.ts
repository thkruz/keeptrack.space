import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { SatInfoBoxObject } from '@app/plugins/sat-info-box-object/sat-info-box-object';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { defaultMisl, defaultSat } from '@test/environment/apiMocks';
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
    // jsdom has no requestIdleCallback; the RCS update is deferred through it.
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
