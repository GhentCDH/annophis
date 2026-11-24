import { describe, expect, it } from 'vitest';

import { HelloEvent } from './events';

// Contract fixtures: every schema gets example payloads that must (not) parse.
const valid = {
  id: '6f1c2a3e-1d2b-4c5d-8e9f-0a1b2c3d4e5f',
  type: 'ms-projects.hello',
  source: 'ms-projects',
  time: '2026-11-24T12:00:00.000Z',
  dataVersion: '1',
  data: { message: 'started' },
};

describe('HelloEvent', () => {
  it('parses a valid event', () => {
    expect(HelloEvent.parse(valid)).toEqual(valid);
  });

  it('defaults dataVersion to "1"', () => {
    const { dataVersion, ...rest } = valid;
    void dataVersion;
    expect(HelloEvent.parse(rest).dataVersion).toBe('1');
  });

  it.each([
    ['non-uuid id', { ...valid, id: '1' }],
    ['non-ISO time', { ...valid, time: 'yesterday' }],
    ['missing data.message', { ...valid, data: {} }],
  ])('rejects %s', (_, payload) => {
    expect(HelloEvent.safeParse(payload).success).toBe(false);
  });
});
