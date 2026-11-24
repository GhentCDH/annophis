import { Inject, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, CustomDecorator, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { jwtVerify } from 'jose';

import { INTERNAL_JWT_ISSUER, INTERNAL_TOKEN_HEADER } from './internal-token';

const PUBLIC = 'annophis:public';
/** Marks a route as reachable without service auth (e.g. /health). */
export const Public = (): CustomDecorator<string> => SetMetadata(PUBLIC, true);


export type Caller =
  | { type: 'service' }
  | { type: 'user'; userId: string; email?: string; roles: string[]; [claim: string]: unknown };

/**
 * Accepts either an `X-Api-Key` from SERVICE_API_KEYS (service → service) or the internal HS256 JWT the
 * gateway attaches in `X-Internal-Token` (iss `annophis-gateway`, aud = SERVICE_NAME, sub = user id).
 * SERVICE_AUTH=off disables the check (local dev only).
 */
@Injectable()
export class ServiceAuthGuard implements CanActivate {
  // explicit token: tsx (pnpm dev) emits no decorator metadata
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext) {
    if (process.env['SERVICE_AUTH'] === 'off') return true;
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC, [ctx.getHandler(), ctx.getClass()])) return true;

    const req = ctx.switchToHttp().getRequest();
    const key = req.headers['x-api-key'];
    const keys = (process.env['SERVICE_API_KEYS'] ?? '').split(',').filter(Boolean);
    if (typeof key === 'string' && keys.includes(key)) {
      req.caller = { type: 'service' } satisfies Caller;
      return true;
    }

    const token = req.headers[INTERNAL_TOKEN_HEADER];
    const secret = process.env['INTERNAL_JWT_SECRET'];
    if (typeof token !== 'string' || !secret) throw new UnauthorizedException();
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
        issuer: INTERNAL_JWT_ISSUER,
        audience: process.env['SERVICE_NAME'],
        algorithms: ['HS256'],
      });
      req.caller = {
        ...payload,
        type: 'user',
        userId: String(payload.sub),
        roles: Array.isArray(payload['roles']) ? (payload['roles'] as string[]) : [],
      } satisfies Caller;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
