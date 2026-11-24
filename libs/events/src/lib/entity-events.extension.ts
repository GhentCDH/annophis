import { randomUUID } from 'node:crypto';

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

/** The outbox model every service's Prisma schema has (see `model Outbox`); never itself evented. */
export const OUTBOX_MODEL = 'Outbox';

export type OutboxRow = {
  id: string;
  type: string;
  subject: string | null;
  data: unknown;
  createdAt: Date;
  publishedAt: Date | null;
};

type Row = Record<string, unknown> & { id?: unknown };
type Delegate = Record<string, (args: unknown) => Promise<unknown>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
/** Prisma Json columns take plain JSON: Dates become ISO strings, like on the bus. */
const toJson = (v: unknown) => JSON.parse(JSON.stringify(v ?? null)) as unknown;

/**
 * The outbox rows for one write: `<service>.<model>.<created|updated|deleted>`, data = the written row, subject = its
 * id. Bulk writes without returned rows (createMany/updateMany/deleteMany) give one row with `{ count, where }`.
 */
export const outboxRowsFor = (service: string, model: string, operation: string, args: unknown, result: unknown) => {
  const verb = VERBS[operation];
  if (!verb) return [];
  const type = `${service}.${lowerFirst(model)}.${verb}`;
  const rows: Row[] = Array.isArray(result) ? result : 'count' in Object(result) ? [] : [result as Row];
  const events =
    rows.length > 0
      ? rows.map((row) => ({ data: row, subject: row.id == null ? null : String(row.id) }))
      : [{ data: { count: (result as { count?: number }).count, where: (args as { where?: unknown })?.where }, subject: null }];
  return events.map(({ data, subject }) => ({ id: randomUUID(), type, subject, data: toJson(data) }));
};

const OUTBOX_STORE = Symbol.for('annophis.outboxStore');
type Registry = typeof globalThis & { [OUTBOX_STORE]?: { service: string; client: AnyClient } };
/**
 * The OutboxRelay (Nest) finds the service's Prisma client here: crouton builds the client in the data source,
 * outside Nest DI, and in production the data source is bundled separately from main.js — hence globalThis.
 */
export const getOutboxStore = () => (globalThis as Registry)[OUTBOX_STORE];

/**
 * `withEntityEvents(new PrismaClient({ adapter }), 'ms-projects')`: every write runs in a transaction together with
 * its outbox row(s), so an event is stored if and only if the change is committed. The OutboxRelay publishes them.
 * Crouton's admin CRUD goes through the same client, so admin writes produce events too.
 *
 * Caveat: a write inside a caller's own interactive transaction (`$transaction(async tx => …)`) opens a separate
 * transaction for itself, so it is not atomic with the caller's other statements.
 */
export const withEntityEvents = <C extends { $extends: (extension: never) => unknown }>(client: C, service: string): C => {
  const base = client as AnyClient;
  (globalThis as Registry)[OUTBOX_STORE] = { service, client: base };
  return base.$extends({
    name: 'annophis-entity-events',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: { model?: string; operation: string; args: unknown; query: (a: unknown) => Promise<unknown> }) {
          if (!model || model === OUTBOX_MODEL || !VERBS[operation]) return query(args);
          return base.$transaction(async (tx: AnyClient) => {
            const result = await (tx[lowerFirst(model)] as Delegate)[operation](args);
            await tx.outbox.createMany({ data: outboxRowsFor(service, model, operation, args, result) });
            return result;
          });
        },
      },
    },
  }) as C;
};
