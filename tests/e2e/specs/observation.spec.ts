import { test, expect } from '@playwright/test';

test.describe.configure({ timeout: 180000 });
import { newSave } from '../../../src/features/campaign/save/persistence';
import { finishShift, fit, ready, seedSave } from '../helpers';

test('observation opens the café, watches service, and issues a receipt', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await seedSave(page, { ...newSave(), unlocked: 0, selected: 0 });
  await ready(page);
  await expect(page.locator('.shift-card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Choose a shift' }).click();
  await expect(page.locator('.shift-card')).toHaveCount(32);
  await expect(page.getByRole('button', { name: 'Shift 3: First Order, locked', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Start shift', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Watch service' })).toBeVisible();
  await fit(page, '.scene-space');
  await fit(page, '.run-button');
  await finishShift(page);
  await expect(page.getByRole('button', { name: 'Next shift' })).toBeVisible();
  await page.getByRole('button', { name: 'Next shift' }).click();
  await expect(page.locator('.campaign-page')).toBeVisible();
  expect(errors).toEqual([]);
});
