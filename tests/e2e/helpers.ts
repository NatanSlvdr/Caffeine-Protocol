import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { SAVE_KEY } from '../../src/features/campaign/save/persistence';
import type { ProgressSave } from '../../src/domain/types';

/** Land on the home page with the app booted. */
export async function ready(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Caffeine Protocol' })).toBeVisible();
}

/** Seed browser storage before first load; reloads keep the live save, not the seed. */
export async function seedSave(page: Page, save: Partial<ProgressSave>) {
  await page.addInitScript(
    ({ key, value }: { key: string; value: Partial<ProgressSave> }) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem(key, JSON.stringify(value));
        sessionStorage.setItem('seeded', '1');
      }
    },
    { key: SAVE_KEY, value: save },
  );
}

/** Assert an element fits horizontally in the viewport. */
export async function fit(page: Page, selector: string) {
  const box = await page.locator(selector).boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
}

/** Set the playback speed slider through React's value tracker. */
export async function setSpeed(page: Page, value: string) {
  await page.getByLabel('Playback speed').evaluate((el, next) => {
    const input = el as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, next);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

/** Run the current shift at top speed and wait for the service receipt. */
export async function finishShift(page: Page) {
  await setSpeed(page, '12');
  await page.getByRole('button', { name: /Watch service|Run service/ }).click();
  await expect(page.getByRole('dialog', { name: 'Service complete' })).toBeVisible({ timeout: 120_000 });
}

/** Reveal the worked example in Help and insert it into the editor. */
export async function useWorkedExample(page: Page) {
  await page.getByRole('button', { name: 'Help', exact: true }).click();
  await page.getByRole('button', { name: 'Reveal worked example' }).click();
  await page.getByRole('button', { name: 'Use this example' }).click();
}
