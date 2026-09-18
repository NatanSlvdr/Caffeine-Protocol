import { test, expect } from '@playwright/test';
import { newSave } from '../../../src/features/campaign/save/persistence';
import { finishShift, seedSave, useWorkedExample } from '../helpers';

test.describe.configure({ timeout: 240_000 });

for (const { shift, level, robot } of [
  { shift: 15, level: 15, robot: 'Brew' },
  { shift: 23, level: 23, robot: 'Porter' },
]) {
  test(`Shift ${shift} programs ${robot} through a full service`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await seedSave(page, { ...newSave(), unlocked: level - 1, selected: level - 1 });
    await page.goto(`/#/shift/${shift}`);
    await expect(page.getByRole('button', { name: 'Run service' })).toBeVisible();
    await useWorkedExample(page);
    await finishShift(page);
    await expect(page.getByRole('button', { name: 'Next shift' })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
