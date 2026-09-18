import { test, expect } from '@playwright/test';
import { newSave, SAVE_KEY } from '../../../src/features/campaign/save/persistence';
import { ready, seedSave } from '../helpers';

test('settings persist, text mode is lossless, and import/export confirms', async ({ page }) => {
  const seed = { ...newSave(), unlocked: 13, selected: 7, story: { 7: true } };
  await seedSave(page, seed);
  await ready(page);
  await page.getByRole('button', { name: 'Open the café', exact: true }).click();
  // Text mode round-trips comments and whitespace exactly.
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Text editor' }).check();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  const text = '# my café\n\nLISTEN\nTAKE UP\nITEM coffee\n';
  await page.getByRole('textbox', { name: 'Program source' }).fill(text);
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Text editor' }).uncheck();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Text editor' }).check();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.getByRole('textbox', { name: 'Program source' })).toHaveValue(text);
  // The workspace hides the app header; return through the campaign rail.
  await page.getByRole('button', { name: /Campaign \/ Shift/ }).click();
  await page.getByRole('button', { name: 'Audio and display settings' }).click();
  // Settings survive a reload.
  await page.getByRole('slider', { name: 'Music volume', exact: true }).evaluate((el, value) => {
    const input = el as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, '0');
  await page.getByRole('checkbox', { name: 'Reduced motion' }).check();
  await page.waitForFunction(
    (key) => JSON.parse(localStorage.getItem(key)!).settings.music === 0,
    SAVE_KEY,
  );
  await page.reload();
  await ready(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('slider', { name: 'Music volume', exact: true })).toHaveValue('0');
  await expect(page.getByRole('checkbox', { name: 'Reduced motion' })).toBeChecked();
  // Export downloads the café file.
  const exported = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export café' }).click();
  const file = await exported;
  expect(file.suggestedFilename()).toBe('caffeine-protocol-save.json');
  // Broken imports alert without replacing anything.
  await page.getByLabel('Import save file').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{bad') });
  await expect(page.getByRole('alert')).toBeVisible();
  // Valid imports ask first, then apply.
  await page.getByLabel('Import save file').setInputFiles({ name: 'cafe.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(seed)) });
  await expect(page.getByRole('dialog')).toContainText('Replace this café?');
  await page.getByRole('button', { name: 'Keep current café' }).click();
  await page.getByLabel('Import save file').setInputFiles({ name: 'cafe.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(seed)) });
  await page.getByRole('button', { name: 'Replace café', exact: true }).click();
  await page.getByRole('button', { name: 'Back to campaign' }).click();
  await expect(page.getByRole('button', { name: 'Shift 14: Query Certification', exact: true })).toBeEnabled();
  // A fresh start keeps settings while clearing progress (the imported seed uses defaults).
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Start a new café', exact: true }).click();
  await page.getByRole('button', { name: 'Keep my café' }).click();
  await expect(page.getByRole('heading', { name: 'The little things.' })).toBeVisible();
  await page.getByRole('button', { name: 'Start a new café', exact: true }).click();
  await page.getByRole('button', { name: 'Start new café', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('slider', { name: 'Music volume', exact: true })).toHaveValue('0.55');
});
