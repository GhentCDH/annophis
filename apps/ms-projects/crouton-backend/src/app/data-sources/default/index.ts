import { PrismaClient } from '@ms-projects/generated-default-client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL ?? '';
const schema = new URLSearchParams(connectionString.split('?')[1] ?? '').get('schema') ?? undefined;
const adapter = new PrismaPg({ connectionString }, schema ? { schema } : undefined);
const client = new PrismaClient({ adapter });

export default client;
