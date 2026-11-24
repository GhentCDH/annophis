import { describe, expect, it } from 'vitest';

import { EntityChangedEvent } from './entity-changed';

const base = {
  id: '6f1c2a3e-1d2b-4c5d-8e9f-0a1b2c3d4e5f',
  source: 'ms-projects',
  time: '2026-11-24T12:00:00.000Z',
  dataVersion: '1',
};

describe('EntityChangedEvent', () => {
  it.each([
    ['a created row', { ...base, type: 'ms-projects.project.created', subject: 'p1', data: { id: 'p1', name: 'x' } }],
    ['a bulk delete', { ...base, type: 'ms-projects.project.deleted', data: { count: 3, where: { name: 'x' } } }],
  ])('parses %s', (_, payload) => {
    expect(EntityChangedEvent.parse(payload)).toEqual(payload);
  });

  it.each([
    ['an unknown verb', 'ms-projects.project.archived'],
    ['a missing model', 'ms-projects.created'],
    ['an uppercase service', 'MS.project.created'],
  ])('rejects %s', (_, type) => {
    expect(EntityChangedEvent.safeParse({ ...base, type, data: {} }).success).toBe(false);
  });
});
