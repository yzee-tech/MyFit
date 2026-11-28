import { PrismaClient } from '@prisma/client';
import { withConnectTimeout } from './server/databaseUrl';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// The one database client of the app (the sign-in system uses it too). It waits up to 8 seconds for a database that
// was asleep to connect, instead of Prisma's 5
export const prisma =
	globalForPrisma.prisma || new PrismaClient({ datasourceUrl: withConnectTimeout(process.env.DATABASE_URL) });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
