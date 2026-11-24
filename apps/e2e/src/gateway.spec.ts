import { expect, test } from '@playwright/test';

test('gateway UI loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Annophis');
});
