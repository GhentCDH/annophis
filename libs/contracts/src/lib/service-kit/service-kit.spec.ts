import { describe, expect, it } from 'vitest';

import { HealthResponse, HelloResponse } from './service-kit';

describe('HealthResponse', () => {
  it('parses a healthy service', () => {
    expect(HealthResponse.parse({ service: 'ms-projects', status: 'ok', bus: true }).bus).toBe(true);
  });

  it.each([
    ['no service', { status: 'ok', bus: true }],
    ['a non-ok status', { service: 'x', status: 'down', bus: true }],
  ])('rejects %s', (_, payload) => {
    expect(HealthResponse.safeParse(payload).success).toBe(false);
  });
});

describe('HelloResponse', () => {
  it.each([
    ['a service caller', { type: 'service' }],
    ['a user caller', { type: 'user', userId: 'u1', email: 'a@b.c', roles: ['admin'], iss: 'annophis-gateway' }],
    ['no caller (auth off)', null],
  ])('parses %s', (_, caller) => {
    expect(HelloResponse.safeParse({ sent: true, service: 'ms-projects', caller }).success).toBe(true);
  });

  it('rejects a user caller without roles', () => {
    expect(
      HelloResponse.safeParse({ sent: true, service: 'x', caller: { type: 'user', userId: 'u1' } }).success,
    ).toBe(false);
  });
});
