import { test, expect } from '@playwright/test';

test.describe.configure({ timeout: 180000 });
import { lessons } from '../../../src/data';
import { newSave } from '../../../src/features/campaign/save/persistence';
import { ready, seedSave } from '../helpers';

test('without WebGL the editor and validation remain readable and usable', async ({ page }) => {
  await seedSave(page, {
    ...newSave(),
    unlocked: 2,
    selected: 2,
    story: { 2: true },
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
  await expect(page.locator('.webgl-fallback')).toBeVisible();
  await page.getByLabel('Playback speed').evaluate((el, value) => {
    const input = el as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, '12');
  await page.getByRole('button', { name: 'Run service' }).click();
  await expect(page.getByRole('dialog', { name: 'Service complete' })).toBeVisible({ timeout: 120_000 });
});
