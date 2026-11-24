import type { INestApplication } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { adminServices, serviceUrl } from './services';

/** The main parts of a service's crouton self-check (GET /crouton/status.json); enums and i18n are left out. */
export type CroutonStatus = {
  version: string;
  croutonVersion: string;
  environment: string;
  summary: { ok: boolean; databaseErrors: number; resourceErrors: number; warningCount: number };
  databases: { name: string; connected: boolean; error?: string }[];
  resources: {
    name: string;
    path: string;
    valid: boolean;
    error?: string;
    version?: number;
    expectedVersion?: number;
    draft?: boolean;
    kind?: string;
    warnings?: string[];
  }[];
};
export type ServiceHealth = {
  service: string;
  status: 'ok' | 'down';
  bus?: boolean;
  crouton?: CroutonStatus;
  error?: string;
};

/** Healthy only when every service answers `status: ok` and is connected to the bus. */
export const aggregateHealth = (services: ServiceHealth[]) => {
  // crouton problems (DB unreachable, invalid resource.json) count as degraded too
  const ok = services.every((s) => s.status === 'ok' && s.bus === true && s.crouton?.summary.ok !== false);
  return { status: ok ? 'ok' : 'degraded', services } as const;
};

const pickCrouton = ({ version, croutonVersion, environment, summary, databases, resources }: CroutonStatus) => ({
  version,
  croutonVersion,
  environment,
  summary,
  databases: databases ?? [],
  resources: resources ?? [],
});

const getJson = async <T>(url: string) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
};

const probe = async (url: string, service: string): Promise<ServiceHealth> => {
  try {
    const [health, crouton] = await Promise.all([
      getJson<{ status?: string; bus?: boolean }>(`${url}/health`),
      getJson<CroutonStatus>(`${url}/crouton/status.json`).catch(() => undefined),
    ]);
    return {
      service,
      status: health.status === 'ok' ? 'ok' : 'down',
      bus: health.bus,
      ...(crouton?.summary ? { crouton: pickCrouton(crouton) } : {}),
    };
  } catch (e) {
    return { service, status: 'down', error: e instanceof Error ? e.message : String(e) };
  }
};

/**
 * GET /health/services (public): the gateway plus every service's /health and crouton status summary. 503 when
 * anything is down, off the bus or reports crouton errors, so compose / Nomad health checks see the whole stack, not just the gateway.
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

