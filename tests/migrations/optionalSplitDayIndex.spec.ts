import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { config } from 'dotenv';
config();

/**
 * Workouts stop writing their position in the mesocycle's copy of the routines: the column becomes
 * optional. A scratch database gets every earlier migration, a workout with a position, then this one.
 */
const MIGRATION = '20261011090000_optional_split_day_index';
const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
const scratchDbName = `splitdayindex_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
const adminUrl = process.env.DATABASE_URL!;
const scratchUrl = (() => {
	const url = new URL(adminUrl);
	url.pathname = `/${scratchDbName}`;
	return url.toString();
})();
const workDir = mkdtempSync(path.join(tmpdir(), 'splitdayindex-'));

function runSql(url: string, sql: string) {
	const file = path.join(workDir, `${Date.now()}-${Math.random()}.sql`);
	writeFileSync(file, sql);
	execFileSync('pnpm', ['exec', 'prisma', 'db', 'execute', '--url', url, '--file', file], { stdio: 'pipe' });
}

const seed = `
INSERT INTO "User" ("id", "email", "updatedAt") VALUES ('u1', 'u1@x', now());
INSERT INTO "Mesocycle" ("id", "name", "userId", "weeklyRIR", "startDate", "endDate", "startOverloadPercentage", "lastSetToFailure", "forceRIRMatching") VALUES
  ('m1', 'Block', 'u1', '{3,2,1}', now() - interval '20 days', NULL, 2.5, false, false);
INSERT INTO "Workout" ("id", "userId", "startedAt", "endedAt", "userBodyweight", "routineName") VALUES
  ('w-old', 'u1', now() - interval '10 days', now() - interval '10 days', 80, 'Pull');
INSERT INTO "WorkoutOfMesocycle" ("id", "workoutId", "mesocycleId", "splitDayIndex", "workoutStatus") VALUES
  ('wm-old', 'w-old', 'm1', 2, NULL);
`;

let db: PrismaClient;

test.beforeAll(async () => {
	runSql(adminUrl, `CREATE DATABASE "${scratchDbName}"`);
	const earlier = readdirSync(migrationsDir)
		.filter((name) => name < MIGRATION && !name.endsWith('.toml'))
		.sort();
	for (const name of earlier) runSql(scratchUrl, readFileSync(path.join(migrationsDir, name, 'migration.sql'), 'utf8'));
	runSql(scratchUrl, seed);
	runSql(scratchUrl, readFileSync(path.join(migrationsDir, MIGRATION, 'migration.sql'), 'utf8'));
	db = new PrismaClient({ datasourceUrl: scratchUrl });
});

test.afterAll(async () => {
	await db?.$disconnect();
	runSql(adminUrl, `DROP DATABASE IF EXISTS "${scratchDbName}" WITH (FORCE)`);
});

test('existing positions stay as they were; a new mesocycle workout can be saved without one', async () => {
	runSql(
		scratchUrl,
		`INSERT INTO "Workout" ("id", "userId", "startedAt", "endedAt", "userBodyweight", "routineName") VALUES
		  ('w-new', 'u1', now(), now(), 80, 'Legs');
		INSERT INTO "WorkoutOfMesocycle" ("id", "workoutId", "mesocycleId", "workoutStatus") VALUES ('wm-new', 'w-new', 'm1', NULL);`
	);
	expect(await db.$queryRawUnsafe(`SELECT "id", "splitDayIndex" FROM "WorkoutOfMesocycle" ORDER BY "id"`)).toEqual([
		{ id: 'wm-new', splitDayIndex: null },
		{ id: 'wm-old', splitDayIndex: 2 }
	]);
});
