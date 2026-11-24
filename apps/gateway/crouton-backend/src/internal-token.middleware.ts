import { Logger } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { getSessionSecret, verifySession } from '@ghentcdh/crouton-api';
import { INTERNAL_TOKEN_HEADER, signInternalToken } from '@annophis/service-auth';

const log = new Logger('InternalToken');

/**
 * Before the gateway proxies a request to `service`: drop any X-Internal-Token the client sent (only the gateway
 * may mint one), and when the request carries a valid crouton session, attach a fresh internal token for that
 * service (aud = service, 60 s). Anonymous requests pass through without one; the service decides.
 */
export const attachInternalToken =
  (service: string) => async (req: IncomingMessage, _res: ServerResponse, next: (e?: unknown) => void) => {
    delete req.headers[INTERNAL_TOKEN_HEADER];
    const bearer = req.headers.authorization?.replace(/^Bearer /, '');
    const sessionSecret = getSessionSecret();
    const internalSecret = process.env['INTERNAL_JWT_SECRET'];
    if (!bearer || !sessionSecret || !internalSecret) return next();
    try {
      const user = await verifySession(bearer, sessionSecret);
      if (user) {
        req.headers[INTERNAL_TOKEN_HEADER] = await signInternalToken(
          { id: user.id, email: user.email, roles: user.roles ?? [] },
          service,
          internalSecret,
        );
      }
    } catch (e) {
      log.warn(`${service}: could not mint internal token (${e instanceof Error ? e.message : String(e)})`);
    }
    next();
  };
