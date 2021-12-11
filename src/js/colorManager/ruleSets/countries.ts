import { SatObject } from '@app/js/api/keepTrack';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { ColorInformation, colorSchemeManager, Pickable } from '../colorSchemeManager';

export const countriesRules = (sat: SatObject): ColorInformation => {
  const { mainCamera } = keepTrackApi.programs;
  const country = sat.C;

  if ((country === 'US' && colorSchemeManager.objectTypeFlags.countryUS === false) || mainCamera.cameraType.current === mainCamera.cameraType.Planetarium) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }
  if ((country === 'PRC' && colorSchemeManager.objectTypeFlags.countryPRC === false) || mainCamera.cameraType.current === mainCamera.cameraType.Planetarium) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }
  if ((country === 'CIS' && colorSchemeManager.objectTypeFlags.countryCIS === false) || mainCamera.cameraType.current === mainCamera.cameraType.Planetarium) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }
  if (country === 'US') {
    return {
      color: colorSchemeManager.colorTheme.countryUS,
      pickable: Pickable.Yes,
    };
  }
  if (country === 'PRC') {
    return {
      color: colorSchemeManager.colorTheme.countryPRC,
      pickable: Pickable.Yes,
    };
  }
  if (country === 'CIS') {
    return {
      color: colorSchemeManager.colorTheme.countryCIS,
      pickable: Pickable.Yes,
    };
  }
  // Other Countries
  if (colorSchemeManager.objectTypeFlags.countryOther === false || mainCamera.cameraType.current === mainCamera.cameraType.Planetarium) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }
  return {
    color: colorSchemeManager.colorTheme.countryOther,
    pickable: Pickable.Yes,
  };
};
