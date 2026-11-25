import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';

import { INTERNAL_TOKEN_HEADER, verifyInternalToken } from './internal-token';

/**
 * Admin guard for crouton's generated CRUD routes.
 *
 * Crouton's auth-providers are not used by services anymore. Instead, enabling the `security` option on
 * `CroutonApiModule.forResourceDir` turns on `CroutonSecurityGuard` and resolves the `admin` guard from:
 *
 *   security: { default: { guard: 'admin' }, guards: { admin: InternalAdminGuard } }
 *
 * `CroutonSecurityGuard` constructs guards with `new cls()`, so this class must stay dependency-free.
 * It accepts only the gateway's `X-Internal-Token` (not `Authorization`, not `X-Api-Key`), requires the
 * `admin` role, and exposes the caller as `req.caller`.
 */
@Injectable()
export class InternalAdminGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const token = req.headers[INTERNAL_TOKEN_HEADER];
    const secret = process.env['INTERNAL_JWT_SECRET'];
    if (typeof token !== 'string' || !secret) throw new UnauthorizedException();

    let payload: Awaited<ReturnType<typeof verifyInternalToken>>;
    try {
      payload = await verifyInternalToken(token, process.env['SERVICE_NAME'] ?? '', secret);
    } catch {
      throw new UnauthorizedException();
    }

    const roles = Array.isArray(payload['roles']) ? (payload['roles'] as string[]) : [];
    if (!roles.includes('admin')) throw new ForbiddenException();

    req.caller = { ...payload, type: 'user', userId: String(payload.sub), roles };
    return true;
  }
}
