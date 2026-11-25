import type { EventEnvelope } from './event-bus';
import type { OutboxRow } from './entity-events.extension';

/** The slice of a Prisma `outbox` delegate the relay needs (kept minimal so it is easy to fake in tests). */
export type OutboxStore = {
  findMany: (args: {
    where: { publishedAt: null };
    orderBy: { createdAt: 'asc' };
    take: number;
  }) => Promise<OutboxRow[]>;
  updateMany: (args: { where: { id: { in: string[] } }; data: { publishedAt: Date } }) => Promise<unknown>;
};

export const envelopeOf = (service: string, row: OutboxRow): EventEnvelope => ({
  id: row.id,
  type: row.type,
  source: service,
  time: row.createdAt.toISOString(),
  ...(row.subject ? { subject: row.subject } : {}),
  dataVersion: '1',
  data: row.data,
});

/**
 * One relay pass: publish the oldest unpublished outbox rows in order, then mark them published. Stops at the
 * first publish failure (NATS down) so order is kept; the rest is retried on the next pass. The event id is the
 * outbox id, so JetStream drops a re-publish within its dedupe window, and consumers dedupe on `event.id`.
 *
 * ponytail: one relay per service instance without row locking; with several replicas, add
 * `SELECT … FOR UPDATE SKIP LOCKED` (duplicates are already harmless: msgID dedupe + idempotent consumers).
 */
export const relayOutbox = async (
  service: string,
  store: OutboxStore,
  publish: (env: EventEnvelope) => Promise<unknown>,
  batch = 100,
) => {
  const rows = await store.findMany({ where: { publishedAt: null }, orderBy: { createdAt: 'asc' }, take: batch });
  const published: string[] = [];
  for (const row of rows) {
    try {
      await publish(envelopeOf(service, row));
      published.push(row.id);
    } catch {
      break;
    }
  }
  if (published.length) {
    await store.updateMany({ where: { id: { in: published } }, data: { publishedAt: new Date() } });
  }
  return { published: published.length, pending: rows.length - published.length };
};
