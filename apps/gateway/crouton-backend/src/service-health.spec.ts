import { describe, expect, it } from 'vitest';

import { aggregateHealth } from './service-health';

describe('aggregateHealth', () => {
  it.each`
    services                                                                                          | status
    ${[{ service: 'a', status: 'ok', bus: true }, { service: 'b', status: 'ok', bus: true }]}        | ${'ok'}
    ${[{ service: 'a', status: 'ok', bus: true }, { service: 'b', status: 'down', error: 'refused' }]} | ${'degraded'}
    ${[{ service: 'a', status: 'ok', bus: false }]}                                                   | ${'degraded'}
    ${[{ service: 'a', status: 'ok', bus: true, crouton: { ok: false, databaseErrors: 1, resourceErrors: 0, warningCount: 0 } }]} | ${'degraded'}
  `('$status', ({ services, status }) => {
    expect(aggregateHealth(services).status).toBe(status);
  });
});
