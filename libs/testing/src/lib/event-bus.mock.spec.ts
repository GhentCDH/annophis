import { describe, expect, it } from 'vitest';

import { createEventBusMock } from './event-bus.mock';

describe('createEventBusMock', () => {
  it('records published events', async () => {
    const bus = createEventBusMock();
    await bus.publish('ms-projects.project.created', { id: 1 }, '1');
    expect(bus.published).toEqual([{ type: 'ms-projects.project.created', data: { id: 1 }, subject: '1' }]);
  });
});
