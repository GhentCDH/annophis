import { expect, test } from '@playwright/test';

import { authFile, sessionToken } from './users';

type Node = { kind?: string; id: string; label: string; route?: string; children?: Node[] };

const layout = async (request: import('@playwright/test').APIRequestContext, token: string | null) => {
  const res = await request.get('/api/_app/layout', { headers: { Authorization: `Bearer ${token}` } });
  expect(res.ok()).toBe(true);
  return (await res.json()) as { sidebar: Node[] };
};

test.describe('as admin', () => {
  test.use({ storageState: authFile('admin') });

  test('one admin UI: the gateway merges every service into one sidebar', async ({ page, request }) => {
    const { sidebar } = await layout(request, await sessionToken(page));
    const projects = sidebar.find((n) => n.kind === 'group' && n.id === 'ms-projects');
    expect(projects?.children).toContainEqual(
      expect.objectContaining({ id: 'ms-projects.project', route: 'ms-projects/project' }),
    );
  });

  test('a service resource opens in the gateway UI through the proxy', async ({ page }) => {
    await page.goto('/');
    const schemas = page.waitForResponse((r) => r.url().includes('/api/ms-projects/project/schemas'));
    await page.getByRole('link', { name: 'Project', exact: true }).click();
    expect((await schemas).ok()).toBe(true);
    await expect(page).toHaveURL(/ms-projects\.project/);
  });

  test('CRUD a project in ms-projects through the gateway', async ({ page, request }) => {
    const headers = { Authorization: `Bearer ${await sessionToken(page)}` };
    const api = '/api/ms-projects/project';
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

  test('the merged sidebar has no service groups', async ({ page, request }) => {
    const { sidebar } = await layout(request, await sessionToken(page));
    expect(sidebar.filter((n) => n.kind === 'group')).toEqual([]);
  });

  test('service APIs answer 403', async ({ page, request }) => {
    const res = await request.get('/api/ms-projects/project', {
      headers: { Authorization: `Bearer ${await sessionToken(page)}` },
    });
    expect(res.status()).toBe(403);
  });
});
