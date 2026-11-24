import { connect } from '@nats-io/transport-node';
import { expect, test } from '@playwright/test';

import { EntityChangedEvent } from '@annophis/contracts';

import { authFile, sessionToken } from './users';

const NATS_URL = process.env['NATS_URL'] ?? 'nats://localhost:6422';

test.use({ storageState: authFile('admin') });

test('an admin write emits an entity event on the bus', async ({ page, request }) => {
  const nc = await connect({ servers: NATS_URL });
  try {
    const name = `e2e-event ${Date.now()}`;
    const sub = nc.subscribe('annophis.ms-projects.project.created', { timeout: 10_000 });
    const received = (async () => {
      for await (const m of sub) {
        const event = EntityChangedEvent.parse(m.json());
        if ((event.data as { name?: string }).name === name) return event;
      }
      throw new Error('subscription ended without the event');
    })();

    const headers = { Authorization: `Bearer ${await sessionToken(page)}` };
    const created = await request.post('/api/ms-projects/project', { headers, data: { name } });
    expect(created.status()).toBe(201);
    const { id } = await created.json();

    const event = await received;
    expect(event).toMatchObject({ type: 'ms-projects.project.created', source: 'ms-projects', subject: id });

    await request.delete(`/api/ms-projects/project/${id}`, { headers });
  } finally {
    await nc.close();
  }
});
