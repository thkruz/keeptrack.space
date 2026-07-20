import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('DateTimeManager Plugin', () => {
  test('renders datetime display and opens calendar on click', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { DateTimeManager: { enabled: true } },
    });

    // Verify the nav-top-center container is rendered
    const navTopCenter = page.locator('#nav-top-center');

    await expect(navTopCenter).toBeVisible({ timeout: 5_000 });

    // Verify the datetime text element exists and displays a time string
    const datetimeText = page.locator('#datetime-text');

    await expect(datetimeText).toBeVisible();
    const timeText = await datetimeText.textContent();
    // Time text should be in HH:MM:SS format (8 chars like "12:34:56")

    expect(timeText?.trim().length).toBeGreaterThanOrEqual(7);

    // Verify the jday element exists
    const jday = page.locator('#jday');

    await expect(jday).toBeAttached();

    // Verify the datetime input form exists (hidden initially)
    const datetimeInputForm = page.locator('#datetime-input-form');

    await expect(datetimeInputForm).toBeAttached();

    // Verify the datetime input textbox exists with readonly attribute
    const datetimeInputTb = page.locator('#datetime-input-tb');

    await expect(datetimeInputTb).toBeAttached();
    await expect(datetimeInputTb).toHaveAttribute('readonly', 'true');

    // Click the datetime text to open the calendar picker
    await datetimeText.click();

    // The calendar date picker should appear
    const datePicker = page.locator('#ui-datepicker-div');

    await expect(datePicker).toBeVisible({ timeout: 5_000 });

    // The datetime input should become visible
    const datetimeInput = page.locator('#datetime-input');

    await expect(datetimeInput).toBeVisible();

    // The input should have a date value in yyyy-mm-dd format
    const dateValue = await datetimeInputTb.inputValue();

    expect(dateValue).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
  });
});
