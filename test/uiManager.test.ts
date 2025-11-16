import { UiManager } from '@app/app/ui/ui-manager';
import { UiGeolocation } from '@app/app/ui/ui-manager-geolocation';
import { GeolocationPosition } from '@app/engine/core/interfaces';
import { ColorSchemeManager } from '@app/engine/rendering/color-scheme-manager';
import { getEl } from '@app/engine/utils/get-el';
import { defaultSensor } from './environment/apiMocks';
import { disableConsoleErrors, enableConsoleErrors, setupMinimumHtml, setupStandardEnvironment } from './environment/standard-env';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { KeepTrack } from '@app/keeptrack';

describe('uiManager', () => {
  // Should process fullscreenToggle
  it('process_fullscreen_toggle', () => {
    document.documentElement.requestFullscreen = jest.fn().mockImplementation(() => Promise.resolve());
    expect(() => UiManager.fullscreenToggle()).not.toThrow();
  });

  // Should process getsensorinfo
  it('process_getsensorinfo', () => {
    (KeepTrack.getInstance().containerRoot as HTMLDivElement).innerHTML = `
    <div id="sensor-latitude"></div>
    <div id="sensor-longitude"></div>
    <div id="sensor-minazimuth"></div>
    <div id="sensor-maxazimuth"></div>
    <div id="sensor-minelevation"></div>
    <div id="sensor-maxelevation"></div>
    <div id="sensor-minrange"></div>
    <div id="sensor-maxrange"></div>
    `;
    const sensorManagerInstance = ServiceLocator.getSensorManager();

    sensorManagerInstance.currentSensors = [defaultSensor];
  });

  // Should process updateSettingsManager
  it('process_updateSettingsManager', () => {
    expect(() => UiGeolocation.updateSettingsManager({ coords: { latitude: 0, longitude: 0 } } as GeolocationPosition)).not.toThrow();
  });

  // Should process updateSensorPosition
  it('process_updateSensorPosition', () => {
    (KeepTrack.getInstance().containerRoot as HTMLDivElement).innerHTML = `
      <input id="cs-lat" />
      <input id="cs-lon" />
      <input id="cs-hei" />
      <input id="cs-telescope" type="checkbox" />
      <input id="cs-minaz" disabled />
      <input id="cs-maxaz" disabled />
      <input id="cs-minel" disabled />
      <input id="cs-maxel" disabled />
      <input id="cs-minrange" disabled />
      <input id="cs-maxrange" disabled />
      <div id="cs-minaz-div" style="display: none;"></div>
      <div id="cs-maxaz-div" style="display: none;"></div>
      <div id="cs-minel-div" style="display: none;"></div>
      <div id="cs-maxel-div" style="display: none;"></div>
      <div id="cs-minrange-div" style="display: none;"></div>
      <div id="cs-maxrange-div" style="display: none;"></div>
      <div id="sensor-type">Telescope</div>
      <div id="sensor-info-title">Custom Sensor</div>
      <div id="sensor-country">Custom Sensor</div>
      <div id="search"></div>
    `;

    expect(() =>
      UiGeolocation.updateSensorPosition({
        coords: {
          latitude: 22,
          longitude: 22,
          altitude: 22,
        },
      }),
    ).not.toThrow();
    expect((<HTMLInputElement>getEl('cs-lat')).value).toBe('22');
    expect((<HTMLInputElement>getEl('cs-lon')).value).toBe('22');
    expect((<HTMLInputElement>getEl('cs-hei')).value).toBe('0.022');

    (KeepTrack.getInstance().containerRoot as HTMLDivElement).innerHTML = '<div id="search"></div>';
    disableConsoleErrors();
    expect(() =>
      UiGeolocation.updateSensorPosition({
        coords: {
          latitude: 22,
          longitude: 22,
          altitude: 22,
        },
      }),
    ).not.toThrow();
    enableConsoleErrors();
  });

  // Should process colorSchemeChangeAlert
  it('process_colorSchemeChangeAlert', () => {
    const uiManagerInstance = new UiManager();
    const colorSchemeManagerInstance = new ColorSchemeManager();

    expect(() => uiManagerInstance.colorSchemeChangeAlert(Object.values(colorSchemeManagerInstance.colorSchemeInstances)[0])).not.toThrow();
    expect(() => uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.colorSchemeInstances.VelocityColorScheme)).not.toThrow();
    expect(() => uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.colorSchemeInstances.SunlightColorScheme)).not.toThrow();
    expect(() => uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.colorSchemeInstances.CountryColorScheme)).not.toThrow();
    expect(() => uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.colorSchemeInstances.GpAgeColorScheme)).not.toThrow();
    expect(() => uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.colorSchemeInstances.RcsColorScheme)).not.toThrow();
    expect(() => uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.colorSchemeInstances.SmallSatColorScheme)).not.toThrow();
    expect(() => uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.colorSchemeInstances.SpatialDensityColorScheme)).not.toThrow();
    expect(() => uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.colorSchemeInstances.OrbitalPlaneDensityColorScheme)).not.toThrow();
    expect(() => uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.colorSchemeInstances.CelestrakColorScheme)).not.toThrow();
    expect(() => uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.colorSchemeInstances.SourceColorScheme)).not.toThrow();
    expect(() => uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.colorSchemeInstances.ConfidenceColorScheme)).not.toThrow();
  });

  // Should process footerToggle and hideUi
  it('process_footerToggle_hideUi', () => {
    setupMinimumHtml();
    (KeepTrack.getInstance().containerRoot as HTMLDivElement).innerHTML += `
    <div id="sat-infobox"></div>
    <div id="nav-footer"></div>
    <div id="nav-footer-toggle"></div>
    <div id="ui-wrapper"></div>
    `;
    const uiManagerInstance = new UiManager();

    expect(() => uiManagerInstance.footerToggle()).not.toThrow();
    expect(() => uiManagerInstance.footerToggle()).not.toThrow();
    expect(() => uiManagerInstance.hideUi()).not.toThrow();
    expect(() => uiManagerInstance.hideUi()).not.toThrow();
  });

  // Should process initMenuController
  it('process_initMenuController', () => {
    setupStandardEnvironment();
    (KeepTrack.getInstance().containerRoot as HTMLDivElement).innerHTML += `
    <div id="fullscreen-icon"></div>
    <div id="layers-menu-btn"></div>
    <div id="layers-hover-menu"></div>
    <div id="layers-icon"></div>
    <div id="settings-menu"></div>
    <div id="about-menu"></div>
    `;
    const uiManagerInstance = new UiManager();

    expect(() => uiManagerInstance.initMenuController()).not.toThrow();
  });

  // Should process onReady
  it('process_onReady', () => {
    setupStandardEnvironment();
    const uiManagerInstance = new UiManager();

    expect(() => uiManagerInstance.onReady()).not.toThrow();
  });

  // Should process init
  it('process_init', () => {
    setupStandardEnvironment();
    const uiManagerInstance = new UiManager();

    expect(() => uiManagerInstance.init()).not.toThrow();
  });

  // Should process postStart
  it('process_postStart', () => {
    setupStandardEnvironment();
    (KeepTrack.getInstance().containerRoot as HTMLDivElement).innerHTML += `
    <div id="editSat"></div>
    <div id="cs-geolocation"></div>
    <div id="es-ecen"></div>
    <div id="es-day"></div>
    <div id="es-inc"></div>
    <div id="es-rasc"></div>
    <div id="es-argPe"></div>
    <div id="es-meana"></div>
    <div id="es-meanmo"></div>
    <div id="ms-lat"></div>
    <div id="ms-lon"></div>
    `;
    expect(() => UiManager.postStart()).not.toThrow();
  });
});
