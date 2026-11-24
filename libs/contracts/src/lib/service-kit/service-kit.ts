import { z } from 'zod';

/**
 * Endpoints every Annophis backend exposes through `AnnophisServiceModule` (@annophis/service-kit).
 * Folder convention: one folder per service under libs/contracts/src/lib/<svc>/; this one is shared by all.
 */

/** GET /health (public). */
export const HealthResponse = z.object({
  service: z.string().min(1),
  status: z.literal('ok'),
  bus: z.boolean(),
});
export type HealthResponse = z.infer<typeof HealthResponse>;

/** Who called a ServiceAuthGuard-protected route (`req.caller`). */
export const Caller = z.discriminatedUnion('type', [
  z.object({ type: z.literal('service') }),
  z
    .object({
      type: z.literal('user'),
      userId: z.string().min(1),
      email: z.string().optional(),
      roles: z.array(z.string()),
    })
    .loose(),
]);
export type Caller = z.infer<typeof Caller>;

/** GET /hello (ServiceAuthGuard): the skeleton's sample domain route. */
export const HelloResponse = z.object({
  sent: z.literal(true),
  service: z.string().min(1),
  caller: Caller.nullable(),
});
export type HelloResponse = z.infer<typeof HelloResponse>;
