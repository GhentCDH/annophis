import { afterEach, describe, expect, it, vi } from 'vitest';

import { entityEvents, setEntityEventPublisher } from './entity-events.extension';

const run = (operation: string, result: unknown, args: unknown = {}, model = 'Project') =>
  entityEvents('ms-projects').query.$allModels.$allOperations({
    model,
    operation,
    args,
    query: async () => result,
  });

describe('entityEvents', () => {
  const publish = vi.fn(async () => ({}) as never);
  afterEach(() => {
    publish.mockClear();
    setEntityEventPublisher(undefined);
  });

  it.each`
    operation   | verb
    ${'create'} | ${'created'}
    ${'update'} | ${'updated'}
    ${'upsert'} | ${'updated'}
    ${'delete'} | ${'deleted'}
  `('$operation publishes <service>.<model>.$verb with the row', async ({ operation, verb }) => {
    setEntityEventPublisher({ publish });
    const row = { id: 'p1', name: 'x' };
    await expect(run(operation, row)).resolves.toBe(row);
    expect(publish).toHaveBeenCalledWith(`ms-projects.project.${verb}`, row, 'p1');
  });

  it('publishes one event per returned row', async () => {
    setEntityEventPublisher({ publish });
    await run('createManyAndReturn', [{ id: 'a' }, { id: 'b' }]);
    expect(publish).toHaveBeenCalledTimes(2);
  });

  it('publishes count + where for bulk writes without rows', async () => {
    setEntityEventPublisher({ publish });
    await run('deleteMany', { count: 3 }, { where: { name: 'x' } });
    expect(publish).toHaveBeenCalledWith('ms-projects.project.deleted', { count: 3, where: { name: 'x' } }, undefined);
  });

  it('ignores reads', async () => {
    setEntityEventPublisher({ publish });
    await run('findMany', [{ id: 'a' }]);
    expect(publish).not.toHaveBeenCalled();
  });

  it('never fails the write when the bus is down', async () => {
    setEntityEventPublisher({ publish: vi.fn(async () => Promise.reject(new Error('nats down'))) });
    await expect(run('create', { id: 'p1' })).resolves.toEqual({ id: 'p1' });
  });

  it('still returns the result without a connected bus', async () => {
    await expect(run('create', { id: 'p1' })).resolves.toEqual({ id: 'p1' });
  });
});

describe('withEntityEvents', () => {
  it('extends the client with the entity-events query extension', async () => {
    const { withEntityEvents } = await import('./entity-events.extension');
    const $extends = vi.fn(() => 'extended');
    expect(withEntityEvents({ $extends }, 'ms-projects')).toBe('extended');
    expect($extends).toHaveBeenCalledWith(expect.objectContaining({ name: 'annophis-entity-events' }));
  });
});
