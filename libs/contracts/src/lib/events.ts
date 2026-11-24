import { z } from 'zod';

/** CloudEvents-like envelope every bus event is wrapped in (see @annophis/events EventBus.publish). */
export const eventEnvelope = <T extends z.ZodType>(data: T) =>
  z.object({
    id: z.uuid(),
    type: z.string(),
    source: z.string(),
    time: z.iso.datetime(),
    subject: z.string().optional(),
    dataVersion: z.string().default('1'),
    data,
  });

export const HelloEvent = eventEnvelope(z.object({ message: z.string() }));
export type HelloEvent = z.infer<typeof HelloEvent>;
