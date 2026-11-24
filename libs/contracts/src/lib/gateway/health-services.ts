import { z } from 'zod';

/** GET /health/services on the gateway (public): the whole stack's health. */
export const ServiceHealth = z.object({
  service: z.string().min(1),
  status: z.enum(['ok', 'down']),
  bus: z.boolean().optional(),
  error: z.string().optional(),
  crouton: z
    .object({
      version: z.string(),
      croutonVersion: z.string(),
      environment: z.string(),
      summary: z.object({
        ok: z.boolean(),
        databaseErrors: z.number().int().nonnegative(),
        resourceErrors: z.number().int().nonnegative(),
        warningCount: z.number().int().nonnegative(),
      }),
      databases: z.array(z.object({ name: z.string(), connected: z.boolean(), error: z.string().optional() })),
      resources: z.array(z.object({ name: z.string(), valid: z.boolean() }).loose()),
    })
    .optional(),
});
export type ServiceHealth = z.infer<typeof ServiceHealth>;

export const ServicesHealthResponse = z.object({
  status: z.enum(['ok', 'degraded']),
  services: z.array(ServiceHealth).min(1),
});
export type ServicesHealthResponse = z.infer<typeof ServicesHealthResponse>;
