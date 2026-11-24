import { expect, test } from '@playwright/test';

import { HealthResponse, HelloResponse, ServicesHealthResponse } from '@annophis/contracts';

import { services } from '../services';

/**
 * Provider contract tests: every running service must answer with payloads that parse against the schemas in
 * @annophis/contracts. A change to a service that breaks its contract fails here, before any UI test runs.
 */
for (const { name, url } of services) {
  test.describe(name, () => {
    test('GET /health matches HealthResponse', async ({ request }) => {
      const res = await request.get(`${url}/health`);
      expect(res.status()).toBe(200);
      expect(HealthResponse.parse(await res.json())).toMatchObject({ service: name, bus: true });
    });

    test('GET /hello (API key) matches HelloResponse', async ({ request }) => {
      const res = await request.get(`${url}/hello`, { headers: { 'X-Api-Key': 'dev-key-gateway' } });
      expect(res.status()).toBe(200);
      expect(HelloResponse.parse(await res.json())).toMatchObject({ service: name, caller: { type: 'service' } });
    });
  });
}

test('gateway GET /health/services matches ServicesHealthResponse', async ({ request }) => {
  const res = await request.get('/api/health/services');
  expect(res.status()).toBe(200);
  const body = ServicesHealthResponse.parse(await res.json());
  expect(body.services.map((s) => s.service).sort()).toEqual(services.map((s) => s.name).sort());
});
