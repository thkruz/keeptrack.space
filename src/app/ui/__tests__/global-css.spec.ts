import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

/** Computed styles for a throwaway element with the given classes, read after the global stylesheets load. */
const probe = (page: import('@playwright/test').Page, className: string) =>
  page.evaluate((cls) => {
    const el = document.createElement('div');

    el.className = cls;
    document.body.appendChild(el);
    const cs = getComputedStyle(el);
    const out = { animationName: cs.animationName, display: cs.display, backgroundColor: cs.backgroundColor };

    el.remove();

    return out;
  }, className);

test.describe('Global stylesheet rules', () => {
  test('.shake animates normally and stops when the user asks for reduced motion', async ({ page }) => {
    await waitForAppReady(page);

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    expect((await probe(page, 'shake')).animationName).toBe('shake');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect((await probe(page, 'shake')).animationName).toBe('none');
  });

  test('the pink Layers legend square stays visible with its colour', async ({ page }) => {
    await waitForAppReady(page);

    const box = await probe(page, 'Square-Box layers-pink-box');

    expect(box.display).not.toBe('none');
    expect(box.backgroundColor).toBe('rgb(108, 0, 50)');
  });
});
