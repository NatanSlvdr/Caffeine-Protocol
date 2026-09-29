import { test, expect } from '@playwright/test';

test.describe.configure({ timeout: 180000 });
import { lessons } from '../../../src/data';
import { newSave } from '../../../src/features/campaign/save/persistence';
import { finishShift, ready, seedSave, skipIntro } from '../helpers';

test('without WebGL the editor and validation remain readable and usable', async ({ page }) => {
  await seedSave(page, {
    ...newSave(),
    unlocked: 2,
    selected: 2,
    drafts: { 2: lessons[2].solution },
  });
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
        return type.includes('webgl') ? null : Reflect.apply(get, this, [type, ...args]);
      },
    });
  });
  await ready(page);
  await page.getByRole('button', { name: 'Choose a shift', exact: true }).click();
  await page.getByRole('button', { name: 'Start shift', exact: true }).click();
  await skipIntro(page);
  await expect(page.locator('.webgl-fallback')).toBeVisible();
  await finishShift(page);
});
