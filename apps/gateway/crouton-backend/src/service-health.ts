import type { INestApplication } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { adminServices, serviceUrl } from './services';

export type ServiceHealth = { service: string; status: 'ok' | 'down'; bus?: boolean; error?: string };

/** Healthy only when every service answers `status: ok` and is connected to the bus. */
export const aggregateHealth = (services: ServiceHealth[]) => {
  const ok = services.every((s) => s.status === 'ok' && s.bus === true);
  return { status: ok ? 'ok' : 'degraded', services } as const;
};

const probe = async (url: string, service: string): Promise<ServiceHealth> => {
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return { service, status: 'down', error: `HTTP ${res.status}` };
    const body = (await res.json()) as { status?: string; bus?: boolean };
    return { service, status: body.status === 'ok' ? 'ok' : 'down', bus: body.bus };
  } catch (e) {
    return { service, status: 'down', error: e instanceof Error ? e.message : String(e) };
  }
};

/**
 * GET /health/services (public): the gateway plus every service's /health. 503 when anything is down or off the
 * bus, so compose / Nomad health checks see the whole stack, not just the gateway.
 */
export const mountServiceHealth = (app: INestApplication, port: number | string) => {
  app.use('/health/services', async (req: IncomingMessage, res: ServerResponse, next: (e?: unknown) => void) => {
    if (req.method !== 'GET') return next();
    const result = aggregateHealth(
      await Promise.all([
        probe(`http://127.0.0.1:${port}`, 'gateway'),
        ...adminServices.map((s) => probe(serviceUrl(s), s.name)),
      ]),
    );
    res.statusCode = result.status === 'ok' ? 200 : 503;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(result));
  });
};

