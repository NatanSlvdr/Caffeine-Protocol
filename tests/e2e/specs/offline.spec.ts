import { test, expect } from '@playwright/test';
import { ready } from '../helpers';

test('offline reload retains the complete static game', async ({ page, context }) => {
  await ready(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    await new Promise<void>((resolve) => {
      if (navigator.serviceWorker.controller) resolve();
      else navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
    });
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Good coffee. Better instructions.' })).toBeVisible();
  await page.getByRole('button', { name: 'Open the café', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Watch service' })).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
});
