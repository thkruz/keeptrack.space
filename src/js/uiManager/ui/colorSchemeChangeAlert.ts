import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { ColorScheme } from '@app/js/colorManager/colorSchemeManager';
import { toast } from './toast';

export const colorSchemeChangeAlert = (newScheme: ColorScheme) => {
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
    if (newScheme == colorSchemeManager[scheme] && scheme !== 'currentColorScheme') {
      // record the new color scheme
      uiManager.lastColorScheme = newScheme;
      // Make an alert
      toast(`Color Scheme Changed to ${scheme}`, 'normal', false);
      return;
    }
  }

  // If we get here, the color scheme is invalid
  throw new Error('Invalid Color Scheme');
};
