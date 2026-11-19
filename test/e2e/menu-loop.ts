import { type Page, type TestInfo } from '@playwright/test';
import { bootMenuScene } from './menu-scene';

/** Per-menu time limit of the menu loops (open, check or shot, close). A hung menu is reported and the loop goes on. */
export const MENU_LIMIT_MS = 20_000;
/** Limit for a reload and scene rebuild after a failed menu. */
export const RELOAD_LIMIT_MS = 90_000;

/** Rejects when the work takes longer than the limit; the work keeps running but its late errors are swallowed. */
export function withLimit<T>(ms: number, label: string, work: () => Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const limit = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`time limit ${ms / 1000} s hit: ${label}`)), ms);
  });
  const running = work();

  running.catch(() => undefined);

  return Promise.race([running, limit]).finally(() => clearTimeout(timer));
}

/** After a failed menu the page may be stuck: reload and rebuild the fixed scene. Returns null when it worked, else the reason (the loop should stop). */
export async function reloadScene(page: Page, testInfo: TestInfo): Promise<string | null> {
  try {
    await withLimit(RELOAD_LIMIT_MS, 'reload and rebuild the scene', async () => {
      await page.reload();
      await bootMenuScene(page, testInfo);
    });

    return null;
  } catch (e) {
    return (e as Error).message.split('\n')[0];
  }
}
