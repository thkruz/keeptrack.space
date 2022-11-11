import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { getClass, getEl, rgbCss } from '@app/js/lib/helpers';
import {
  ageOfElsetDiv,
  astronomyDiv,
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
} from './components/legend-divs';

export const legendMenuChange = (menu: string) => {
  const { objectManager, sensorManager, colorSchemeManager } = keepTrackApi.programs;
  const legendHoverDom = getEl('legend-hover-menu');

  switch (menu) {
    case 'rcs':
      legendHoverDom.innerHTML = rcsDiv;
      break;
    case 'neighbors':
      legendHoverDom.innerHTML = neighborsDiv;
      break;
    case 'small':
      legendHoverDom.innerHTML = smallDiv;
      break;
    case 'near':
      legendHoverDom.innerHTML = nearDiv;
      break;
    case 'deep':
      legendHoverDom.innerHTML = deepDiv;
      break;
    case 'velocity':
      legendHoverDom.innerHTML = velocityDiv;
      break;
    case 'sunlight':
      legendHoverDom.innerHTML = sunlightDiv;
      break;
    case 'ageOfElset':
      legendHoverDom.innerHTML = ageOfElsetDiv;
      break;
    case 'countries':
      legendHoverDom.innerHTML = countriesDiv;
      break;
    case 'planetarium':
      legendHoverDom.innerHTML = planetariumDiv;
      break;
    case 'astronomy':
      legendHoverDom.innerHTML = astronomyDiv;
      break;
    case 'timeMachine':
      legendHoverDom.innerHTML = timeMachineMenuDiv;
      break;
    case 'clear':
    case 'default':
    default:
      if (menu === 'clear') legendHoverDom.style.display = 'none';
      if (objectManager.isSensorManagerLoaded && sensorManager.checkSensorSelected()) {
        legendHoverDom.innerHTML = defaultSensorDiv;
      } else {
        legendHoverDom.innerHTML = defaultDiv;
      }
      break;
  }

  // Update Legend Colors
  legendColorsChange();

  if (settingsManager.currentLegend !== menu) {
    [
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
    ].forEach((selector) => {
      const element = <HTMLElement>document.querySelector(selector);
      if (element) {
        element.style.background = settingsManager.colors[selector.split('-')[1]]?.toString();
      }
      colorSchemeManager.objectTypeFlags[selector.split('-')[1]] = true;
    });
    try {
      (<HTMLElement>document.querySelector('.legend-velocitySlow-box')).style.background = rgbCss([1, 0, 0, 1]);
      (<HTMLElement>document.querySelector('.legend-velocityMed-box')).style.background = rgbCss([0.75, 0.25, 0, 1]);
      (<HTMLElement>document.querySelector('.legend-velocityFast-box')).style.background = rgbCss([0.75, 0.75, 0, 1]);
    } catch {
      // Do nothing
    }
    colorSchemeManager.objectTypeFlags.velocitySlow = true;
    colorSchemeManager.objectTypeFlags.velocityMed = true;
    colorSchemeManager.objectTypeFlags.velocityFast = true;
  }
  settingsManager.currentLegend = menu;
};

export const legendColorsChange = function (): void {
  const { colorSchemeManager } = keepTrackApi.programs;
  colorSchemeManager.resetObjectTypeFlags();

  try {
    try {
      const velocityFastClass = <HTMLElement>document.querySelector('.legend-velocityFast-box');
      if (velocityFastClass) {
        velocityFastClass.style.background = rgbCss([0.75, 0.75, 0, 1]);
      }
      const velocityMedClass = <HTMLElement>document.querySelector('.legend-velocityMed-box');
      if (velocityMedClass) {
        velocityMedClass.style.background = rgbCss([0.75, 0.25, 0, 1]);
      }
      const velocitySlowClass = <HTMLElement>document.querySelector('.legend-velocitySlow-box');
      if (velocitySlowClass) {
        velocitySlowClass.style.background = rgbCss([1, 0, 0, 1]);
      }
    } catch {
      // do nothing
    }
    [
      '.legend-payload-box',
      '.legend-rocketBody-box',
      '.legend-debris-box',
      '.legend-pink-box',
      '.legend-inFOV-box',
      '.legend-facility-box',
      '.legend-sensor-box',
      '.legend-inviewAlt-box',
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
    ].forEach((element) => {
      try {
        const elementFromClass = <HTMLElement>document.querySelector(element);
        if (elementFromClass) {
          elementFromClass.style.background = rgbCss(settingsManager.colors[element.split('-')[1]]);
        }
      } catch {
        // do nothing
      }
    });
  } catch {
    setTimeout(legendColorsChange, 100);
  }
};

// prettier-ignore
export const legendHoverMenuClick = (legendType?: string) => { // NOSONAR
  const { satSet, colorSchemeManager } = keepTrackApi.programs;

  const slug = legendType.split('-')[1];

  if (slug.startsWith('velocity')) {
    let colorString: [number, number, number, number] = null;
    switch (slug) {
      case 'velocityFast':
        colorString = [0.75, 0.75, 0, 1];
        break;
      case 'velocityMed':
        colorString = [0.75, 0.25, 0, 1];
        break;
      case 'velocitySlow':
        colorString = [1.0, 0, 0.0, 1.0];
        break;
    }
    if (colorSchemeManager.objectTypeFlags[slug]) {
      colorSchemeManager.objectTypeFlags[slug] = false;
      getClass(`legend-${slug}-box`).forEach((el) => {
        el.style.background = 'black';
      });
    } else {
      colorSchemeManager.objectTypeFlags[slug] = true;
      getClass(`legend-${slug}-box`).forEach((el) => {
        el.style.background = rgbCss(colorString).toString();
      });
    }
  } else {
    if (colorSchemeManager.objectTypeFlags[slug]) {
      colorSchemeManager.objectTypeFlags[slug] = false;
      getClass(`legend-${slug}-box`).forEach((el) => {
        el.style.background = 'black';
      });
    } else {
      colorSchemeManager.objectTypeFlags[slug] = true;
      getClass(`legend-${slug}-box`).forEach((el) => {
        el.style.background = rgbCss(settingsManager.colors[slug]);
      });
    }
  }
  satSet.setColorScheme(colorSchemeManager.currentColorScheme, true);
};
