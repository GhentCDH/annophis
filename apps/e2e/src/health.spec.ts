import { expect, test } from '@playwright/test';

import { services } from './services';

test.describe('service health', () => {
  for (const { name, url } of services) {
    test(`${name} is up and connected to the bus`, async ({ request }) => {
      const res = await request.get(`${url}/health`);
      expect(res.ok()).toBe(true);
      expect(await res.json()).toEqual({ service: name, status: 'ok', bus: true });
    });
  }
});
