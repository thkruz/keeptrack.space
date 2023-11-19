import { keepTrackApi } from '../keepTrackApi';
import { getEl } from '../lib/get-el';
import { rgbCss } from '../lib/rgbCss';
import { StandardColorSchemeManager } from '../singletons/color-scheme-manager';
import {
  ageOfElsetDiv,
  astronomyDiv,
  confidenceDiv,
  countriesDiv,
  deepDiv,
  defaultDiv,
  defaultSensorDiv,
  nearDiv,
  neighborsDiv,
  planetariumDiv,
  rcsDiv,
  smallDiv,
  sunlightDiv,
  timeMachineMenuDiv,
  velocityDiv,
} from './legend-manager/legend-divs';

export abstract class LegendManager {
  private static readonly legendClassList = [
    '.legend-payload-box',
    '.legend-rocketBody-box',
    '.legend-debris-box',
    '.legend-inFOV-box',
    '.legend-facility-box',
    '.legend-sensor-box',
    '.legend-facility-box',
    '.legend-missile-box',
    '.legend-missileInview-box',
    '.legend-pink-box',
    '.legend-inFOV-box',
    '.legend-inviewAlt-box',
    '.legend-starLow-box',
    '.legend-starMed-box',
    '.legend-starHi-box',
    '.legend-satLow-box',
    '.legend-satMed-box',
    '.legend-satHi-box',
    '.legend-inviewAlt-box',
    '.legend-confidenceLow-box',
    '.legend-confidenceMed-box',
    '.legend-confidenceHi-box',
    '.legend-rcsSmall-box',
    '.legend-rcsMed-box',
    '.legend-rcsLarge-box',
    '.legend-rcsUnknown-box',
    '.legend-satLEO-box',
    '.legend-satGEO-box',
    '.legend-countryUS-box',
    '.legend-countryCIS-box',
    '.legend-countryPRC-box',
    '.legend-countryOther-box',
    '.legend-ageNew-box',
    '.legend-ageMed-box',
    '.legend-ageOld-box',
    '.legend-ageLost-box',
    '.legend-satSmall-box',
    '.legend-densityPayload-box',
    '.legend-densityHi-box',
    '.legend-densityMed-box',
    '.legend-densityLow-box',
    '.legend-densityOther-box',
  ];

  private static readonly menuOptions = {
    rcs: rcsDiv,
    confidence: confidenceDiv,
    neighbors: neighborsDiv,
    small: smallDiv,
    near: nearDiv,
    deep: deepDiv,
    velocity: velocityDiv,
    sunlight: sunlightDiv,
    ageOfElset: ageOfElsetDiv,
    countries: countriesDiv,
    planetarium: planetariumDiv,
    astronomy: astronomyDiv,
    timeMachine: timeMachineMenuDiv,
    clear: '',
    default: '',
  };

  static change(menu: string) {
    const legendHoverDom = getEl('legend-hover-menu');
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const sensorManagerInstance = keepTrackApi.getSensorManager();

    const selectedOption =
      LegendManager.menuOptions[menu] || (catalogManagerInstance.isSensorManagerLoaded && sensorManagerInstance.isSensorSelected() ? defaultSensorDiv : defaultDiv);

    legendHoverDom.innerHTML = selectedOption;
    if (menu === 'clear') {
      legendHoverDom.style.display = 'none';
    }

    // Update Legend Colors
    LegendManager.legendColorsChange();
    settingsManager.currentLegend = menu;
  }

  static legendColorsChange(): void {
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();
    colorSchemeManagerInstance.resetObjectTypeFlags();

    try {
      LegendManager.setVelocityColor_(colorSchemeManagerInstance);
      LegendManager.setColors_(colorSchemeManagerInstance);
    } catch {
      setTimeout(LegendManager.legendColorsChange, 100);
    }
  }

  private static setColors_(colorSchemeManagerInstance: StandardColorSchemeManager) {
    LegendManager.legendClassList.forEach((selector) => {
      const elementFromClass = <HTMLElement>document.querySelector(selector);
      if (elementFromClass) {
        elementFromClass.style.background = rgbCss(settingsManager.colors[selector.split('-')[1]]);
      }
      colorSchemeManagerInstance.objectTypeFlags[selector.split('-')[1]] = true;
    });
  }

  private static setVelocityColor_(colorSchemeManagerInstance: StandardColorSchemeManager) {
    const velocitySlowClass = <HTMLElement>document.querySelector('.legend-velocitySlow-box');
    const velocityMedClass = <HTMLElement>document.querySelector('.legend-velocityMed-box');
    const velocityFastClass = <HTMLElement>document.querySelector('.legend-velocityFast-box');
    if (velocitySlowClass) {
      velocitySlowClass.style.background = rgbCss([1, 0, 0, 1]);
    }
    if (velocityMedClass) {
      velocityMedClass.style.background = rgbCss([0.75, 0.25, 0, 1]);
    }
    if (velocityFastClass) {
      velocityFastClass.style.background = rgbCss([0.75, 0.75, 0, 1]);
    }
    colorSchemeManagerInstance.objectTypeFlags.velocitySlow = true;
    colorSchemeManagerInstance.objectTypeFlags.velocityMed = true;
    colorSchemeManagerInstance.objectTypeFlags.velocityFast = true;
  }
}
