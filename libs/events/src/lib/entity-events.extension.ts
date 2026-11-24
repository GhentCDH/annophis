import { Logger } from '@nestjs/common';

import type { EventBus } from './event-bus';

const log = new Logger('EntityEvents');

type Publisher = Pick<EventBus, 'publish'>;
// On globalThis, not module scope: in production builds the data source (which applies the extension) is bundled
// separately from main.js (which runs EventBus), so this module exists twice and module state would not be shared.
const KEY = Symbol.for('annophis.entityEventPublisher');
const registry = globalThis as typeof globalThis & { [KEY]?: Publisher };
/** Called by EventBus once connected; the Prisma client lives outside Nest DI. */
export const setEntityEventPublisher = (p: Publisher | undefined) => {
  registry[KEY] = p;
};

const VERBS: Record<string, 'created' | 'updated' | 'deleted'> = {
  create: 'created',
  createMany: 'created',
  createManyAndReturn: 'created',
  update: 'updated',
  updateMany: 'updated',
  updateManyAndReturn: 'updated',
  upsert: 'updated',
  delete: 'deleted',
  deleteMany: 'deleted',
};

type Row = Record<string, unknown> & { id?: unknown };
type OperationParams = {
  model?: string;
  operation: string;
  args: unknown;
  query: (args: unknown) => Promise<unknown>;
};

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/**
 * Prisma client extension: after every successful write, publish `<service>.<model>.<created|updated|deleted>`
 * on the bus (data = the written row, subject = its id). Because crouton's admin CRUD goes through the same
 * client, admin writes emit events too — never publish entity events from controllers.
 *
 * Bulk writes without returned rows (createMany/updateMany/deleteMany) publish one event with `{ count, where }`.
 *
 * ponytail: fire-and-forget after the query returns. Inside an interactive transaction the event may precede the
 * commit (or survive a rollback), and a NATS outage drops the event (logged). Upgrade path: a transactional outbox.
 */
// Prisma's $allOperations params are generic per client; the extension is model-agnostic, so the exported
// signature takes `any` (validated structurally inside) to be assignable to every generated client's $extends.
type AnyOperation = {
  name: string;
  query: {
    $allModels: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $allOperations: (params: any) => Promise<unknown>;
    };
  };
};

export const entityEvents = (service: string): AnyOperation => ({
  name: 'annophis-entity-events',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }: OperationParams) {
        const result = await query(args);
        const verb = VERBS[operation];
        if (!verb || !model) return result;

        const type = `${service}.${lowerFirst(model)}.${verb}`;
        const rows: Row[] = Array.isArray(result) ? result : 'count' in Object(result) ? [] : [result as Row];
        const events =
          rows.length > 0
            ? rows.map((row) => ({ data: row, subject: row.id == null ? undefined : String(row.id) }))
            : [{ data: { count: (result as { count?: number }).count, where: (args as { where?: unknown })?.where }, subject: undefined }];

        const activePublisher = registry[KEY];
        if (!activePublisher) {
          log.warn(`${type}: no EventBus connected, event dropped`);
          return result;
        }
        for (const { data, subject } of events) {
          activePublisher.publish(type, data, subject).catch((e) => log.error(`${type}: publish failed`, e));
        }
        return result;
      },
    },
  },
});

/**
 * `withEntityEvents(new PrismaClient({ adapter }), 'ms-projects')`. The extension only hooks queries and adds no API,
 * so the client keeps its own type (Prisma's `$extends` typing is specific to every generated client).
 */
export const withEntityEvents = <C extends { $extends: (extension: never) => unknown }>(client: C, service: string): C =>
  client.$extends(entityEvents(service) as never) as C;
