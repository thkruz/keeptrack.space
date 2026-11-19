import { type Page, type TestInfo } from '@playwright/test';
import { loadFixedIssScene, selectFixedIss } from './fixed-scene';
import { selectSensor } from './menu-catalog';
import { VIEWPORTS } from './viewports';

/** Fixed sim time of the menu specs (layout check #612, screenshot baselines #613). */
export const MENU_SCENE_DATE = new Date('2008-09-20T12:30:00.000Z');

/** chromium runs the menu specs at the desktop size; laptop and phone get theirs from the project. Boots the pinned ISS scene, sensor NSN-WALLOPS, ISS selected. */
export async function bootMenuScene(page: Page, testInfo: TestInfo): Promise<void> {
  if (testInfo.project.name === 'chromium') {
    await page.setViewportSize({ width: VIEWPORTS.desktop.width, height: VIEWPORTS.desktop.height });
  }
  await loadFixedIssScene(page, { date: MENU_SCENE_DATE });
  await selectSensor(page);
  await selectFixedIss(page);
}
