import { describe, expect, it, vi } from 'vitest';

import type { OutboxRow } from './entity-events.extension';
import { relayOutbox } from './outbox-relay';
import type { OutboxStore } from './outbox-relay';

const row = (id: string): OutboxRow => ({
  id,
  type: 'ms-projects.project.created',
  subject: id,
  data: { id },
  createdAt: new Date('2026-11-25T10:00:00Z'),
  publishedAt: null,
});

const storeWith = (rows: OutboxRow[]) => ({
  findMany: vi.fn(async () => rows),
  updateMany: vi.fn(async () => ({ count: 0 })),
});

describe('relayOutbox', () => {
  it('publishes pending rows in order as envelopes (event id = outbox id) and marks them published', async () => {
    const store = storeWith([row('a'), row('b')]);
    const publish = vi.fn(async () => undefined);
    await expect(relayOutbox('ms-projects', store as OutboxStore, publish)).resolves.toEqual({ published: 2, pending: 0 });
    expect(publish.mock.calls.map(([env]) => env)).toEqual([
      expect.objectContaining({ id: 'a', type: 'ms-projects.project.created', source: 'ms-projects', subject: 'a', time: '2026-11-25T10:00:00.000Z' }),
      expect.objectContaining({ id: 'b' }),
    ]);
    expect(store.updateMany).toHaveBeenCalledWith({ where: { id: { in: ['a', 'b'] } }, data: { publishedAt: expect.any(Date) } });
  });

  it('stops at the first failure (NATS down) and leaves the rest pending, keeping order', async () => {
    const store = storeWith([row('a'), row('b'), row('c')]);
    const publish = vi.fn(async (env: { id: string }) => {
      if (env.id === 'b') throw new Error('nats down');
    });
    await expect(relayOutbox('s', store as OutboxStore, publish)).resolves.toEqual({ published: 1, pending: 2 });
    expect(publish).toHaveBeenCalledTimes(2);
    expect(store.updateMany).toHaveBeenCalledWith({ where: { id: { in: ['a'] } }, data: { publishedAt: expect.any(Date) } });
  });

  it('does nothing when the outbox is empty', async () => {
    const store = storeWith([]);
    await relayOutbox('s', store as OutboxStore, vi.fn());
    expect(store.updateMany).not.toHaveBeenCalled();
  });
});
