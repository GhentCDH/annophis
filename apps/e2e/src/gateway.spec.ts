import { expect, test } from '@playwright/test';

test('an anonymous visit to the gateway UI is sent to the Keycloak login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/keycloak\.localhost:6480\/realms\/annophis\//);
  await expect(page.getByLabel('Username or email')).toBeVisible();
});
