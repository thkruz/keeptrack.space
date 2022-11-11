import { ColorRuleSet } from '@app/js/colorManager/colorSchemeManager';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { toast } from './toast';

export const colorSchemeChangeAlert = (newScheme: ColorRuleSet) => {
  const { uiManager } = keepTrackApi.programs;
  // Don't Make an alert the first time!
  if (typeof uiManager.lastColorScheme == 'undefined') {
    uiManager.lastColorScheme = newScheme;
    return;
  }

  const { colorSchemeManager } = keepTrackApi.programs;

  // Don't make an alert unless something has really changed
  if (uiManager.lastColorScheme == newScheme) return;

  for (const scheme in colorSchemeManager) {
    if (newScheme == colorSchemeManager[scheme] && scheme !== 'currentColorScheme' && scheme !== 'lastColorScheme') {
      // record the new color scheme
      uiManager.lastColorScheme = newScheme;
      // Make an alert
      switch (scheme) {
        case 'default':
        case 'group':
          toast(`Color Scheme Changed to Object Types`, 'normal', false);
          break;
        case 'velocity':
          toast(`Color Scheme Changed to Velocity`, 'normal', false);
          break;
        case 'sunlight':
          toast(`Color Scheme Changed to Sunlight`, 'normal', false);
          break;
        case 'countries':
        case 'groupCountries':
          toast(`Color Scheme Changed to Countries`, 'normal', false);
          break;
        case 'leo':
          toast(`Color Scheme Changed to Near Earth`, 'normal', false);
          break;
        case 'geo':
          toast(`Color Scheme Changed to Deep Space`, 'normal', false);
          break;
        case 'ageOfElset':
          toast(`Color Scheme Changed to Elset Age`, 'normal', false);
          break;
        case 'rcs':
          toast(`Color Scheme Changed to Radar Cross Section`, 'normal', false);
          break;
        case 'smallsats':
          toast(`Color Scheme Changed to Small Satellites`, 'normal', false);
          break;
        case 'lostobjects':
          toast(`Color Scheme Changed to Lost Objects`, 'normal', false);
          break;
        case 'neighbors':
          toast(`Color Scheme Changed to Orbit Density`, 'normal', false);
          break;
        default:
          toast(`Color Scheme Changed to ${scheme}`, 'normal', false);
          console.debug(`${scheme} missing from alert list!`);
          break;
      }
    }
  }
};
