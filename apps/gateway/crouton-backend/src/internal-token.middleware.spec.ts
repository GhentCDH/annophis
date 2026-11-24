import type { IncomingMessage, ServerResponse } from 'node:http';
import { decodeJwt } from 'jose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { signSession } from '@ghentcdh/crouton-api';

import { attachInternalToken } from './internal-token.middleware';

const run = async (headers: Record<string, string>) => {
  const req = { headers: { ...headers } } as unknown as IncomingMessage;
  const next = vi.fn();
  await attachInternalToken('ms-projects')(req, {} as ServerResponse, next);
  expect(next).toHaveBeenCalledOnce();
  return req.headers['x-internal-token'] as string | undefined;
};

describe('attachInternalToken', () => {
  beforeEach(() => {
    vi.stubEnv('CROUTON_AUTH_SECRET', 'session-secret');
    vi.stubEnv('INTERNAL_JWT_SECRET', 'internal-secret');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('drops a token the client tried to send', async () => {
    expect(await run({ 'x-internal-token': 'forged' })).toBeUndefined();
  });

  it('mints a token for the service from a valid crouton session', async () => {
    const session = await signSession(
      { id: 'u1', email: 'a@b.c', name: 'A', roles: ['admin'], provider: 'keycloak' } as never,
      'session-secret',
    );
    const token = await run({ authorization: `Bearer ${session}`, 'x-internal-token': 'forged' });
    expect(decodeJwt(token ?? '')).toMatchObject({
      iss: 'annophis-gateway',
      aud: 'ms-projects',
      sub: 'u1',
      roles: ['admin'],
      email: 'a@b.c',
    });
  });

  it('attaches nothing for an invalid session', async () => {
    expect(await run({ authorization: 'Bearer nope' })).toBeUndefined();
  });
});
