import { z } from 'zod';

import { eventEnvelope } from './events';

/**
 * Emitted for every write through a service's Prisma client (admin CRUD included), by the
 * entity-events extension in @annophis/events. type = `<service>.<model>.<created|updated|deleted>`.
 * data = the written row, or `{ count, where }` for bulk writes without returned rows.
 */
export const entityChangedType = z.string().regex(/^[a-z0-9-]+\.[a-zA-Z0-9]+\.(created|updated|deleted)$/);

export const EntityChangedEvent = eventEnvelope(
  z.union([
    z.object({ count: z.number().int().nonnegative().optional(), where: z.unknown() }).strict(),
    z.record(z.string(), z.unknown()),
  ]),
).extend({ type: entityChangedType });
export type EntityChangedEvent = z.infer<typeof EntityChangedEvent>;
