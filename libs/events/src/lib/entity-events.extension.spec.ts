import { describe, expect, it, vi } from 'vitest';

import { getOutboxStore, outboxRowsFor, withEntityEvents } from './entity-events.extension';

describe('outboxRowsFor', () => {
  it.each`
    operation   | verb
    ${'create'} | ${'created'}
    ${'update'} | ${'updated'}
    ${'upsert'} | ${'updated'}
    ${'delete'} | ${'deleted'}
  `('$operation → <service>.<model>.$verb with the row as data', ({ operation, verb }) => {
    const [row] = outboxRowsFor('ms-projects', 'Project', operation, {}, { id: 'p1', at: new Date(0) });
    expect(row).toMatchObject({
      type: `ms-projects.project.${verb}`,
      subject: 'p1',
      data: { id: 'p1', at: '1970-01-01T00:00:00.000Z' },
    });
    expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('gives one row per returned row', () => {
    expect(outboxRowsFor('s', 'Project', 'createManyAndReturn', {}, [{ id: 'a' }, { id: 'b' }])).toHaveLength(2);
  });

  it('gives { count, where } for bulk writes without rows', () => {
    expect(outboxRowsFor('s', 'Project', 'deleteMany', { where: { name: 'x' } }, { count: 3 })).toMatchObject([
      { type: 's.project.deleted', subject: null, data: { count: 3, where: { name: 'x' } } },
    ]);
  });

  it('ignores reads', () => {
    expect(outboxRowsFor('s', 'Project', 'findMany', {}, [{ id: 'a' }])).toEqual([]);
  });
});

/** A fake Prisma client: $extends hands back the query hook, $transaction records what ran inside it. */
const fakeClient = (failOutbox = false) => {
  const committed: string[] = [];
  let hook: (p: { model?: string; operation: string; args: unknown; query: (a: unknown) => Promise<unknown> }) => Promise<unknown> =
    () => Promise.resolve();
  const client = {
    $extends: vi.fn((ext: { query: { $allModels: { $allOperations: typeof hook } } }) => {
      hook = ext.query.$allModels.$allOperations;
      return client;
    }),
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      const staged: string[] = [];
      const tx = {
        project: { create: async () => (staged.push('project'), { id: 'p1' }) },
        outbox: {
          createMany: async ({ data }: { data: { type: string }[] }) => {
            if (failOutbox) throw new Error('outbox insert failed');
            staged.push(...data.map((d) => d.type));
          },
        },
      };
      const result = await fn(tx); // throws → nothing is committed
      committed.push(...staged);
      return result;
    }),
  };
  return { client, committed, run: (p: Parameters<typeof hook>[0]) => hook(p) };
};

describe('withEntityEvents', () => {
  it('commits the write and its outbox row in one transaction', async () => {
    const { client, committed, run } = fakeClient();
    withEntityEvents(client as never, 'ms-projects');
    await expect(run({ model: 'Project', operation: 'create', args: {}, query: vi.fn() })).resolves.toEqual({ id: 'p1' });
    expect(committed).toEqual(['project', 'ms-projects.project.created']);
    expect(getOutboxStore()).toMatchObject({ service: 'ms-projects' });
  });

  it('commits neither when the outbox insert fails', async () => {
    const { client, committed, run } = fakeClient(true);
    withEntityEvents(client as never, 'ms-projects');
    await expect(run({ model: 'Project', operation: 'create', args: {}, query: vi.fn() })).rejects.toThrow('outbox');
    expect(committed).toEqual([]);
  });

  it('passes reads and the outbox itself straight through', async () => {
    const { client, run } = fakeClient();
    withEntityEvents(client as never, 'ms-projects');
    const query = vi.fn(async () => 'direct');
    await run({ model: 'Project', operation: 'findMany', args: {}, query });
    await run({ model: 'Outbox', operation: 'updateMany', args: {}, query });
    expect(query).toHaveBeenCalledTimes(2);
    expect(client.$transaction).not.toHaveBeenCalled();
  });
});
