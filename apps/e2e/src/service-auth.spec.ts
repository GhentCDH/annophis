import { expect, test } from '@playwright/test';

import { services } from './services';
import { authFile, sessionToken } from './users';

const msProjects = services.find((s) => s.name === 'ms-projects')?.url ?? 'http://localhost:6101';

test.describe('domain routes are protected by ServiceAuthGuard', () => {
  test.use({ storageState: authFile('admin') });

  test('through the gateway, the logged-in user reaches the service as a user caller', async ({ page, request }) => {
    const res = await request.get('/api/ms-projects/hello', {
      headers: { Authorization: `Bearer ${await sessionToken(page)}` },
    });
    expect(res.status()).toBe(200);
    expect(await res.json()).toMatchObject({
      service: 'ms-projects',
      caller: { type: 'user', roles: expect.arrayContaining(['admin']) },
    });
  });

  test('a client cannot forge the internal token through the gateway', async ({ request }) => {
    const res = await request.get('/api/ms-projects/hello', { headers: { 'X-Internal-Token': 'forged' } });
    expect(res.status()).toBe(401);
  });

  test('calling a service directly without credentials is refused', async ({ request }) => {
    expect((await request.get(`${msProjects}/hello`)).status()).toBe(401);
  });

  test('another service may call it with its API key', async ({ request }) => {
    const res = await request.get(`${msProjects}/hello`, { headers: { 'X-Api-Key': 'dev-key-gateway' } });
    expect(res.status()).toBe(200);
    expect((await res.json()).caller).toEqual({ type: 'service' });
  });

  test('health stays public', async ({ request }) => {
    expect((await request.get(`${msProjects}/health`)).status()).toBe(200);
  });
});
