import { test, expect } from '@playwright/test';
import { newSave } from '../../../src/features/campaign/save/persistence';
import { UNLOCKS } from '../../../src/domain/unlocks';
import { finishShift, seedSave, skipIntro, useWorkedExample } from '../helpers';

test.describe.configure({ timeout: 240_000 });

for (const { shift, robot } of [
  { shift: UNLOCKS.prep, robot: 'Brew' },
  { shift: UNLOCKS.floor, robot: 'Porter' },
  { shift: UNLOCKS.toGo, robot: 'the whole crew' },
]) {
  test(`Shift ${shift} programs ${robot} through a full service`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    // The cutscene before the shift counts as watched, so the shift opens straight away.
    await seedSave(page, { ...newSave(), unlocked: shift - 1, selected: shift - 1, story: { [shift - 1]: true } });
    await page.goto(`/#/shift/${shift}`);
    await skipIntro(page);
    await expect(page.getByRole('button', { name: 'Run service' })).toBeVisible();
    await useWorkedExample(page);
    await finishShift(page);
    await expect(page.getByRole('button', { name: 'Next shift' })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
