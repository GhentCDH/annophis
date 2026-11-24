import { expect, test } from '@playwright/test';

import { services } from './services';
import { authFile } from './users';

test.describe('service health', () => {
  for (const { name, url } of services) {
    test(`${name} is up and connected to the bus`, async ({ request }) => {
      const res = await request.get(`${url}/health`);
      expect(res.ok()).toBe(true);
      expect(await res.json()).toEqual({ service: name, status: 'ok', bus: true });
    });
  }
});

test('the gateway reports the whole stack healthy', async ({ request }) => {
  const res = await request.get('/api/health/services');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe('ok');
  expect(body.services).toHaveLength(services.length);
});

test.describe('status page', () => {
  test.use({ storageState: authFile('admin') });

  test('shows every service in the gateway UI', async ({ page }) => {
    await page.goto('/system-status');
    await expect(page.getByTestId('overall-status')).toHaveText('All systems operational');
    const table = page.getByRole('table', { name: 'Service health' });
    for (const { name } of services) {
      await expect(table.getByRole('row', { name: new RegExp(`^${name}\\b`) })).toBeVisible();
    }
  });

  test('shows the crouton status of a service', async ({ page }) => {
    await page.goto('/system-status');
    const details = page.getByRole('region', { name: 'Crouton status per service' }).locator('details', { hasText: 'ms-projects' });
    await details.locator('summary').click();
    const resources = details.getByRole('table', { name: 'ms-projects resources' });
    await expect(resources.getByRole('row', { name: /project\s+valid/ })).toBeVisible();
  });
});
