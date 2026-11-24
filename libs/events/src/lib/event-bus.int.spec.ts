import { jetstreamManager } from '@nats-io/jetstream';
import { connect } from '@nats-io/transport-node';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { EventBus, STREAM } from './event-bus';

const servers = process.env['NATS_URL'] ?? 'nats://localhost:6422';
const service = `int-${randomUUID().slice(0, 8)}`;

describe('EventBus against NATS JetStream', () => {
  const bus = new EventBus({ service, servers });

  beforeAll(() => bus.onModuleInit());
  afterAll(async () => {
    // remove the durable consumers this run created
    const nc = await connect({ servers });
    const jsm = await jetstreamManager(nc);
    for await (const c of jsm.consumers.list(STREAM)) {
      if (c.name.startsWith(`${service}--`)) await jsm.consumers.delete(STREAM, c.name);
    }
    await nc.close();
    await bus.onModuleDestroy();
  });

  it('delivers a published event with its envelope', async () => {
    const received: unknown[] = [];
    await bus.subscribe(`${service}.created`, (e) => {
      received.push(e);
    });
    const sent = await bus.publish(`${service}.created`, { n: 1 }, 'id-1');
    await vi.waitFor(() =>
      expect(received).toContainEqual(
        expect.objectContaining({ id: sent.id, type: `${service}.created`, source: service, subject: 'id-1', data: { n: 1 } }),
      ),
    );
  });

  it('redelivers when a handler throws (nak), so handlers must be idempotent', async () => {
    const attempts: string[] = [];
    await bus.subscribe(`${service}.flaky`, (e) => {
      attempts.push(e.id);
      if (attempts.length === 1) throw new Error('transient failure');
    });
    const sent = await bus.publish(`${service}.flaky`, {});
    await vi.waitFor(() => expect(attempts).toEqual([sent.id, sent.id]), { timeout: 15000 });
  });
});
