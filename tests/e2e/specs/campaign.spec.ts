import { test, expect } from '@playwright/test';
import { newSave } from '../../../src/features/campaign/save/persistence';
import { stories } from '../../../src/data/campaign/narrative';
import { finishShift, ready, seedSave, useWorkedExample } from '../helpers';

test.describe.configure({ timeout: 180_000 });

test('Shift 3 interlude, worked example, and a three-star receipt', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await seedSave(page, { ...newSave(), unlocked: 2, selected: 2 });
  await ready(page);
  await page.getByRole('button', { name: 'Choose a shift' }).click();
  await page.getByRole('button', { name: 'Start shift', exact: true }).click();
  await expect(page.getByRole('heading', { name: stories[2].title })).toBeVisible();
  await page.getByRole('button', { name: "Let's open the café" }).click();
  await useWorkedExample(page);
  await finishShift(page);
  await expect(page.getByLabel('3 stars')).toBeVisible();
  await page.getByRole('button', { name: 'Next shift' }).click();
  await expect(page.locator('.campaign-page')).toBeVisible();
  await expect(page.locator('.shift-card.complete')).toHaveCount(1);
  expect(errors).toEqual([]);
});
