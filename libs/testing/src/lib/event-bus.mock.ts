import type { EventBus } from '@annophis/events';
import { vi } from 'vitest';

/** In-memory stand-in for EventBus: records published events, never touches NATS. */
export const createEventBusMock = () => {
  const published: { type: string; data: unknown; subject?: string }[] = [];
  const bus = {
    published,
    isConnected: vi.fn(() => true),
    publish: vi.fn(async (type: string, data: unknown, subject?: string) => {
      published.push({ type, data, subject });
    }),
    subscribe: vi.fn(async () => undefined),
  };
  return bus as typeof bus & Pick<EventBus, 'isConnected' | 'publish' | 'subscribe'>;
};
