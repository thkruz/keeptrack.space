import { t7e } from '@app/locales/keys';
import i18next from 'i18next';

/**
 * Builds the localized "Satellites and Debris In 19XX" Time Machine overlay used by the
 * kiosk presets. Returns the overlay HTML and the bare "In 19XX" string the presets hand
 * back to the Time Machine plugin.
 *
 * @param yearStr Last two digits of the year
 * @param satColor CSS color for the "Satellites" word
 * @param debrisColor CSS color for the "Debris" word
 */
export function buildTimeMachineOverlay(yearStr: string, satColor: string, debrisColor: string): { html: string; inYear: string } {
  const yearPrefix = parseInt(yearStr) < 57 ? '20' : '19';
  const satellitesSpan = `<span style="color: ${satColor};">${t7e('darkClouds.satellites')} </span>`;
  const debrisSpan = `<span style="color: ${debrisColor};">${t7e('darkClouds.debris')} </span>`;

  if (i18next.language === 'zh') {
    // Chinese puts the year first and joins the words without spaces
    const inYear = `${yearPrefix}${yearStr}${t7e('darkClouds.in')}`;

    return { html: `${inYear}${satellitesSpan}${t7e('darkClouds.and')}${debrisSpan}`, inYear };
  }

  const inYear = `${t7e('darkClouds.in')} ${yearPrefix}${yearStr}`;

  return { html: `${satellitesSpan} ${t7e('darkClouds.and')} ${debrisSpan} ${inYear}`, inYear };
}
