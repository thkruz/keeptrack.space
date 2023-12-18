import { GeolocationPosition } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { StandardColorSchemeManager } from '@app/singletons/color-scheme-manager';
import { StandardUiManager } from '@app/singletons/uiManager';
import { UiGeolocation } from '@app/static/ui-manager-geolocation';
import { defaultSensor } from './environment/apiMocks';
import { disableConsoleErrors, enableConsoleErrors, setupMinimumHtml, setupStandardEnvironment } from './environment/standard-env';

describe('uiManager', () => {
  // Should process fullscreenToggle
  it('process_fullscreen_toggle', () => {
    document.documentElement.requestFullscreen = jest.fn().mockImplementation(() => Promise.resolve());
    expect(() => StandardUiManager.fullscreenToggle()).not.toThrow();
  });

  // Should process getsensorinfo
  it('process_getsensorinfo', () => {
    document.body.innerHTML = `
    <div id="sensor-latitude"></div>
    <div id="sensor-longitude"></div>
    <div id="sensor-minazimuth"></div>
    <div id="sensor-maxazimuth"></div>
    <div id="sensor-minelevation"></div>
    <div id="sensor-maxelevation"></div>
    <div id="sensor-minrange"></div>
    <div id="sensor-maxrange"></div>
    `;
    const sensorManagerInstance = keepTrackApi.getSensorManager();
    sensorManagerInstance.currentSensors = [defaultSensor];
  });

  // Should process updateSettingsManager
  it('process_updateSettingsManager', () => {
    expect(() => UiGeolocation.updateSettingsManager({ coords: { latitude: 0, longitude: 0 } } as GeolocationPosition)).not.toThrow();
  });

  // Should process updateSensorPosition
  it('process_updateSensorPosition', () => {
    document.body.innerHTML = `
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
    `;

    expect(() =>
      UiGeolocation.updateSensorPosition({
        coords: {
          latitude: 22,
          longitude: 22,
          altitude: 22,
        },
      })
    ).not.toThrow();
    expect((<HTMLInputElement>document.getElementById('cs-lat')).value).toBe('22');
    expect((<HTMLInputElement>document.getElementById('cs-lon')).value).toBe('22');
    expect((<HTMLInputElement>document.getElementById('cs-hei')).value).toBe('0.022');

    document.body.innerHTML = ``;
    disableConsoleErrors();
    expect(() =>
      UiGeolocation.updateSensorPosition({
        coords: {
          latitude: 22,
          longitude: 22,
          altitude: 22,
        },
      })
    ).not.toThrow();
    enableConsoleErrors();
  });

  // Should process colorSchemeChangeAlert
  it('process_colorSchemeChangeAlert', () => {
    const uiManagerInstance = new StandardUiManager();
    const colorSchemeManagerInstance = new StandardColorSchemeManager();
    expect(() => uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.default)).not.toThrow();
    expect(() => uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.default)).not.toThrow();
    expect(() => uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.group)).not.toThrow();
    expect(() => uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.default)).not.toThrow();
    expect(() => uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.velocity)).not.toThrow();
    expect(() => uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.sunlight)).not.toThrow();
    expect(() => uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.countries)).not.toThrow();
    expect(() => uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.groupCountries)).not.toThrow();
    expect(() => uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.leo)).not.toThrow();
    expect(() => uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.geo)).not.toThrow();
    expect(() => uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.ageOfElset)).not.toThrow();
    expect(() => uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.rcs)).not.toThrow();
    expect(() => uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.smallsats)).not.toThrow();
    expect(() => uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.lostobjects)).not.toThrow();
    expect(() => uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.neighbors)).not.toThrow();
  });

  // Should process footerToggle and hideUi
  it('process_footerToggle_hideUi', () => {
    setupMinimumHtml();
    document.body.innerHTML += `
    <div id="sat-infobox"></div>
    <div id="nav-footer"></div>
    <div id="nav-footer-toggle"></div>
    <div id="ui-wrapper"></div>
    `;
    const uiManagerInstance = new StandardUiManager();
    expect(() => uiManagerInstance.footerToggle()).not.toThrow();
    expect(() => uiManagerInstance.footerToggle()).not.toThrow();
    expect(() => uiManagerInstance.hideUi()).not.toThrow();
    expect(() => uiManagerInstance.hideUi()).not.toThrow();
  });

  // Should process initMenuController
  it('process_initMenuController', () => {
    setupStandardEnvironment();
    document.body.innerHTML += `
    <div id="legend-menu"></div>
    <div id="legend-hover-menu"></div>
    <div id="legend-icon"></div>
    <div id="settings-menu"></div>
    <div id="about-menu"></div>
    `;
    const uiManagerInstance = new StandardUiManager();
    expect(() => uiManagerInstance.initMenuController()).not.toThrow();
  });

  // Should process onReady
  it('process_onReady', () => {
    setupStandardEnvironment();
    const uiManagerInstance = new StandardUiManager();

    document.body.innerHTML += `
    <div id="save-rmb-menu"></div>
    <div id="view-rmb-menu"></div>
    <div id="create-rmb-menu"></div>
    <div id="colors-rmb-menu"></div>
    <div id="draw-rmb-menu"></div>
    <div id="edit-rmb-menu"></div>
    <div id="earth-rmb-menu"></div>`;

    expect(() => uiManagerInstance.onReady()).not.toThrow();
  });

  // Should process init
  it('process_init', () => {
    setupStandardEnvironment();
    const uiManagerInstance = new StandardUiManager();
    expect(() => uiManagerInstance.init()).not.toThrow();
  });

  // Should process postStart
  it('process_postStart', () => {
    setupStandardEnvironment();
    document.body.innerHTML += `
    <div id="editSat"></div>
    <div id="cs-geolocation"></div>
    <div id="geolocation-btn"></div>
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
    expect(() => StandardUiManager.postStart()).not.toThrow();
  });
});
