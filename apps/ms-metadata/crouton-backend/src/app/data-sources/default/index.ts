import { PrismaClient } from '@ms-metadata/generated-default-client';
import { PrismaPg } from '@prisma/adapter-pg';

import { withEntityEvents } from '@annophis/events';

const connectionString = process.env.DATABASE_URL ?? '';
const schema = new URLSearchParams(connectionString.split('?')[1] ?? '').get('schema') ?? undefined;
const adapter = new PrismaPg({ connectionString }, schema ? { schema } : undefined);
// Every write (admin CRUD included) publishes <service>.<model>.<created|updated|deleted> on the bus.
const client = withEntityEvents(new PrismaClient({ adapter }), 'ms-metadata');

export default client;
