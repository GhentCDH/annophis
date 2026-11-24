import { expect, test } from '@playwright/test';

import { adminServices } from './services';
import { authFile, sessionToken } from './users';

test.describe('as admin', () => {
  test.use({ storageState: authFile('admin') });

  test('the hub links every service admin', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Service admins' });
    for (const { name } of adminServices) {
      await expect(nav.getByRole('link', { name: new RegExp(name) })).toHaveAttribute('href', `/${name}/`);
    }
  });

  for (const { name } of adminServices) {
    test(`${name} admin opens without a second login`, async ({ page }) => {
      await page.goto(`/${name}/`);
      await expect(page).toHaveURL(new RegExp(`^http://localhost:6200/${name}/`));
      expect(page.url()).not.toContain('/realms/annophis');
    });
  }

  test('CRUD a project in ms-projects through the gateway', async ({ page, request }) => {
    const token = await sessionToken(page);
    expect(token).toBeTruthy();
    const headers = { Authorization: `Bearer ${token}` };
    const api = '/ms-projects/api/project';
    const name = `e2e ${Date.now()}`;

    const created = await request.post(api, { headers, data: { name } });
    expect(created.status()).toBe(201);
    const { id } = await created.json();

    const patched = await request.patch(`${api}/${id}`, { headers, data: { description: 'edited' } });
    expect(patched.ok()).toBe(true);
    expect(await (await request.get(`${api}/${id}`, { headers })).json()).toMatchObject({ name, description: 'edited' });

    expect((await request.delete(`${api}/${id}`, { headers })).ok()).toBe(true);
    expect((await request.get(`${api}/${id}`, { headers })).status()).toBe(404);
  });
});

test.describe('as viewer (no admin role)', () => {
  test.use({ storageState: authFile('viewer') });

  test('the hub refuses access', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('alert')).toContainText('no admin role');
    await expect(page.getByRole('navigation', { name: 'Service admins' })).toHaveCount(0);
  });

  test('service APIs answer 403', async ({ page, request }) => {
    const token = await sessionToken(page);
    const res = await request.get('/ms-projects/api/project', { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status()).toBe(403);
  });
});
