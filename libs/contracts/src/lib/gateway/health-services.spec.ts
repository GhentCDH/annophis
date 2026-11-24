import { describe, expect, it } from 'vitest';

import { ServicesHealthResponse } from './health-services';

const crouton = {
  version: 'unknown',
  croutonVersion: '0.2.0-rc.4',
  environment: 'unknown',
  summary: { ok: true, databaseErrors: 0, resourceErrors: 0, warningCount: 0 },
  databases: [{ name: 'default', connected: true }],
  resources: [{ name: 'project', path: 'project', valid: true, version: 1, kind: 'prisma' }],
};

describe('ServicesHealthResponse', () => {
  it.each([
    ['a healthy stack', { status: 'ok', services: [{ service: 'ms-projects', status: 'ok', bus: true, crouton }] }],
    ['a degraded stack', { status: 'degraded', services: [{ service: 'ms-corpora', status: 'down', error: 'fetch failed' }] }],
  ])('parses %s', (_, payload) => {
    expect(ServicesHealthResponse.safeParse(payload).success).toBe(true);
  });

  it('rejects an empty service list', () => {
    expect(ServicesHealthResponse.safeParse({ status: 'ok', services: [] }).success).toBe(false);
  });
});
