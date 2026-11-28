import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * One database client for the whole app (src/lib/prisma.ts, which sets the connect timeout): the sign-in system's
 * lookup, the first database call of almost every request, must use it too, not a second client with its own pool and
 * Prisma's default 5-second connect timeout
 */

const hooks = readFileSync(path.join(process.cwd(), 'src', 'hooks.server.ts'), 'utf8');

test('hooks.server.ts makes no database client of its own', () => {
	expect(hooks).not.toMatch(/new\s+PrismaClient\s*\(/);
	expect(hooks).not.toMatch(/from\s+['"]@prisma\/client['"]/);
});

test('hooks.server.ts gives the sign-in adapter the shared client', () => {
	expect(hooks).toMatch(/import\s*\{\s*prisma\s*\}\s*from\s*['"]\$lib\/prisma(\.js)?['"]/);
	expect(hooks).toMatch(/PrismaAdapter\(\s*prisma\s*\)/);
});

test('the shared client asks for the connect timeout', () => {
	const shared = readFileSync(path.join(process.cwd(), 'src', 'lib', 'prisma.ts'), 'utf8');
	expect(shared).toMatch(/withConnectTimeout\(/);
});
