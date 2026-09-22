import { test, expect } from '@playwright/test';
import { newSave } from '../../../src/features/campaign/save/persistence';
import { fit, ready, seedSave } from '../helpers';

for (const width of [1280, 1100])
  test(`framing and working controls at ${width} × 720`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 });
    await seedSave(page, { ...newSave(), unlocked: 13, selected: 13, story: { 13: true } });
    await ready(page);
    await page.getByRole('button', { name: 'Choose a shift', exact: true }).click();
    await page.getByRole('button', { name: 'Start shift', exact: true }).click();
    await fit(page, '.editor-panel');
    await fit(page, '.scene-space');
    await fit(page, '.run-button');
    expect(await page.locator('body').evaluate((el) => el.scrollWidth)).toBeLessThanOrEqual(width);
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.locator('.webgl-fallback')).toHaveCount(0);
    await page.getByRole('button', { name: 'Help', exact: true }).click();
    await fit(page, 'dialog');
  });
