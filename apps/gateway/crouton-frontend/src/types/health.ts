/** Shape of GET /api/health/services (apps/gateway/crouton-backend/src/service-health.ts). */
export type CroutonResource = {
  name: string;
  path: string;
  valid: boolean;
  error?: string;
  version?: number;
  expectedVersion?: number;
  draft?: boolean;
  kind?: string;
  warnings?: string[];
};

export type CroutonStatus = {
  version: string;
  croutonVersion: string;
  environment: string;
  summary: { ok: boolean; databaseErrors: number; resourceErrors: number; warningCount: number };
  databases: { name: string; connected: boolean; error?: string }[];
  resources: CroutonResource[];
};

export type ServiceHealth = {
  service: string;
  status: 'ok' | 'down';
  bus?: boolean;
  crouton?: CroutonStatus;
  error?: string;
};

export type Health = { status: 'ok' | 'degraded'; services: ServiceHealth[] };
