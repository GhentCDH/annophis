import { expect, test as setup } from '@playwright/test';

import { authFile, users } from './users';

// Logs in once per user through the real Keycloak form; specs reuse the saved session.
for (const [role, { username, password }] of Object.entries(users)) {
  setup(`log in as ${role}`, async ({ page }) => {
    await page.goto('/');
    // one provider configured → the gateway redirects straight to Keycloak
    await page.getByLabel('Username or email').fill(username);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByRole('heading', { name: 'Annophis admin' })).toBeVisible();
    await page.context().storageState({ path: authFile(role) });
  });
}
