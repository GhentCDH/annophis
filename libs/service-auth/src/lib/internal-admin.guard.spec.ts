import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { SignJWT } from 'jose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InternalAdminGuard } from './internal-admin.guard';
import { INTERNAL_JWT_ISSUER } from './internal-token';

const SECRET = 'test-secret';
const sign = (
  claims: { iss?: string; aud?: string; exp?: string; roles?: string[] } = {},
  secret = SECRET,
) =>
  new SignJWT({ roles: claims.roles ?? ['admin'] })
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

describe('InternalAdminGuard', () => {
  const guard = new InternalAdminGuard();

  beforeEach(() => {
    vi.stubEnv('SERVICE_NAME', 'ms-projects');
    vi.stubEnv('INTERNAL_JWT_SECRET', SECRET);
  });
  afterEach(() => vi.unstubAllEnvs());

  it('accepts a gateway token with the admin role and exposes the caller', async () => {
    const { ctx, req } = ctxFor({ 'x-internal-token': await sign() });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.caller).toMatchObject({ type: 'user', userId: 'u1', roles: ['admin'] });
  });

  it('rejects a valid token without the admin role with 403', async () => {
    const { ctx } = ctxFor({ 'x-internal-token': await sign({ roles: ['viewer'] }) });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('ignores an API key (admin CRUD is gateway-only)', async () => {
    await expect(guard.canActivate(ctxFor({ 'x-api-key': 'dev-key-gateway' }).ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('ignores the crouton session in Authorization', async () => {
    await expect(
      guard.canActivate(ctxFor({ authorization: `Bearer ${await sign()}` }).ctx),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it.each([
    ['no credentials', async () => ({})],
    ['token for another service', async () => ({ 'x-internal-token': await sign({ aud: 'ms-corpora' }) })],
    ['token from another issuer', async () => ({ 'x-internal-token': await sign({ iss: 'someone' }) })],
    ['token with wrong secret', async () => ({ 'x-internal-token': await sign({}, 'other') })],
    ['expired token', async () => ({ 'x-internal-token': await sign({ exp: '-1s' }) })],
    ['garbage token', async () => ({ 'x-internal-token': 'abc' })],
  ])('rejects %s with 401', async (_, headers) => {
    await expect(guard.canActivate(ctxFor(await headers()).ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
