import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { attachInternalToken } from './internal-token.middleware';
import { mergeLayouts } from './merge-layouts';
import type { Layout } from './merge-layouts';
import { adminServices, serviceUrl } from './services';

const log = new Logger('AdminFacade');
const OWN = 'x-annophis-own-layout';

type Next = (err?: unknown) => void;

/**
 * Presents every service as one crouton backend, so the gateway's single admin UI covers them all:
 * - GET /_app/layout: the gateway's own sidebar plus one group per service (admins only);
 * - /<svc>/*: reverse proxy to that service (prefix stripped). Authorization (crouton session) is forwarded, so each
 *   service can ignore it; an internal token (X-Internal-Token) for that service is attached and its
 *   InternalAdminGuard/ServiceAuthGuard verify it.
 * Express middleware registered before Nest's router, so it takes /_app/layout over from crouton.
 */
export const mountAdminFacade = (app: INestApplication, port: number | string) => {
  const self = `http://127.0.0.1:${port}`;

  app.use('/_app/layout', async (req: IncomingMessage, res: ServerResponse, next: Next) => {
    if (req.method !== 'GET' || req.headers[OWN]) return next(); // the gateway's own crouton layout
    try {
      const auth = req.headers.authorization ? { authorization: req.headers.authorization } : {};
      const own = (await (await fetch(`${self}/_app/layout`, { headers: { ...auth, [OWN]: '1' } })).json()) as Layout;
      const me = (await (await fetch(`${self}/_app/me`, { headers: auth })).json().catch(() => null)) as {
        roles?: string[];
      } | null;

      const services = me?.roles?.includes('admin')
        ? (
            await Promise.allSettled(
              adminServices.map(async (s) => {
                const r = await fetch(`${serviceUrl(s)}/_app/layout`, { headers: auth });
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return { name: s.name, title: s.title, layout: (await r.json()) as Layout };
              }),
            )
          ).flatMap((r, i) => {
            if (r.status === 'fulfilled') return [r.value];
            log.warn(`${adminServices[i].name}: layout unavailable (${String(r.reason)})`);
            return [];
          })
        : [];

      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(mergeLayouts(own, services)));
    } catch (e) {
      next(e);
    }
  });

  for (const s of adminServices) {
    // mounted at /<svc>: express strips the prefix, the service serves its routes unprefixed.
    // The user's crouton session is turned into an internal token for that service (X-Internal-Token).
    app.use(`/${s.name}`, attachInternalToken(s.name), createProxyMiddleware({ target: serviceUrl(s), changeOrigin: true }));
  }
};
