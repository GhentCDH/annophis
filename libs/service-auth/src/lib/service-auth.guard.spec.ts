import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { SignJWT } from 'jose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { INTERNAL_JWT_ISSUER, signInternalToken } from './internal-token';
import { ServiceAuthGuard } from './service-auth.guard';

const SECRET = 'test-secret';
const sign = (claims: { iss?: string; aud?: string; exp?: string } = {}, secret = SECRET) =>
  new SignJWT({ roles: ['admin'] })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(claims.iss ?? INTERNAL_JWT_ISSUER)
    .setAudience(claims.aud ?? 'ms-projects')
    .setSubject('u1')
    .setExpirationTime(claims.exp ?? '5m')
    .sign(new TextEncoder().encode(secret));

const ctxFor = (headers: Record<string, string>) => {
  const req: { headers: Record<string, string>; caller?: unknown } = { headers };
  const ctx = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return { ctx, req };
};

describe('ServiceAuthGuard', () => {
  const reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) } as unknown as Reflector;
  const guard = new ServiceAuthGuard(reflector);

  beforeEach(() => {
    vi.stubEnv('SERVICE_AUTH', 'on');
    vi.stubEnv('SERVICE_NAME', 'ms-projects');
    vi.stubEnv('SERVICE_API_KEYS', 'k1,k2');
    vi.stubEnv('INTERNAL_JWT_SECRET', SECRET);
  });
  afterEach(() => vi.unstubAllEnvs());

  it('allows everything when SERVICE_AUTH=off', async () => {
    vi.stubEnv('SERVICE_AUTH', 'off');
    await expect(guard.canActivate(ctxFor({}).ctx)).resolves.toBe(true);
  });

  it('allows @Public() routes', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValueOnce(true);
    await expect(guard.canActivate(ctxFor({}).ctx)).resolves.toBe(true);
  });

  it('accepts a configured API key as a service caller', async () => {
    const { ctx, req } = ctxFor({ 'x-api-key': 'k2' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.caller).toEqual({ type: 'service' });
  });

  it('accepts a gateway token for this service as a user caller', async () => {
    const { ctx, req } = ctxFor({ 'x-internal-token': await sign() });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.caller).toMatchObject({ type: 'user', userId: 'u1', roles: ['admin'] });
  });

  it('accepts a token from signInternalToken (the gateway signer)', async () => {
    const token = await signInternalToken({ id: 'u2', email: 'a@b.c', roles: ['viewer'] }, 'ms-projects', SECRET);
    const { ctx, req } = ctxFor({ 'x-internal-token': token });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.caller).toMatchObject({ type: 'user', userId: 'u2', email: 'a@b.c', roles: ['viewer'] });
  });

  it('ignores a token sent as Authorization (that header carries the crouton session)', async () => {
    await expect(guard.canActivate(ctxFor({ authorization: `Bearer ${await sign()}` }).ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it.each([
    ['no credentials', async () => ({})],
    ['unknown API key', async () => ({ 'x-api-key': 'nope' })],
    ['token for another service', async () => ({ 'x-internal-token': await sign({ aud: 'ms-corpora' }) })],
    ['token from another issuer', async () => ({ 'x-internal-token': await sign({ iss: 'someone' }) })],
    ['token with wrong secret', async () => ({ 'x-internal-token': await sign({}, 'other') })],
    ['expired token', async () => ({ 'x-internal-token': await sign({ exp: '-1s' }) })],
    ['garbage token', async () => ({ 'x-internal-token': 'abc' })],
  ])('rejects %s with 401', async (_, headers) => {
    await expect(guard.canActivate(ctxFor(await headers()).ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
