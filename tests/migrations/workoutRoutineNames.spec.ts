import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { config } from 'dotenv';
config();

/**
 * Old mesocycle workouts get their routine's name from the mesocycle's copy of the routines: a
 * scratch database gets every earlier migration, workouts as they were, then this migration.
 */
const MIGRATION = '20261010090000_backfill_workout_routine_names';
const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
const scratchDbName = `routinenames_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
const adminUrl = process.env.DATABASE_URL!;
const scratchUrl = (() => {
	const url = new URL(adminUrl);
	url.pathname = `/${scratchDbName}`;
	return url.toString();
})();
const workDir = mkdtempSync(path.join(tmpdir(), 'routinenames-'));

function runSql(url: string, sql: string) {
	const file = path.join(workDir, `${Date.now()}-${Math.random()}.sql`);
	writeFileSync(file, sql);
	execFileSync('pnpm', ['exec', 'prisma', 'db', 'execute', '--url', url, '--file', file], { stdio: 'pipe' });
}

// A mesocycle with Pull (position 0), a rest day (1), Legs, since removed from My routines (2, hidden).
// w-pull: unnamed → Pull. w-named: already named (after a rename) → keeps its name. w-legs: hidden
// routine → Legs. w-rest: rest day → none. w-blank: no mesocycle → none
const seed = `
INSERT INTO "User" ("id", "email", "updatedAt") VALUES ('u1', 'u1@x', now());
INSERT INTO "Mesocycle" ("id", "name", "userId", "weeklyRIR", "startDate", "endDate", "startOverloadPercentage", "lastSetToFailure", "forceRIRMatching") VALUES
  ('m1', 'Block', 'u1', '{3,2,1}', now() - interval '20 days', NULL, 2.5, false, false);
INSERT INTO "MesocycleExerciseSplitDay" ("id", "name", "dayIndex", "isRestDay", "weightUnit", "hidden", "mesocycleId") VALUES
  ('d-pull', 'Pull', 0, false, 'KG', false, 'm1'),
  ('d-rest', '', 1, true, 'KG', false, 'm1'),
  ('d-legs', 'Legs', 2, false, 'KG', true, 'm1');
INSERT INTO "Workout" ("id", "userId", "startedAt", "endedAt", "userBodyweight", "routineName") VALUES
  ('w-pull', 'u1', now() - interval '10 days', now() - interval '10 days', 80, NULL),
  ('w-named', 'u1', now() - interval '9 days', now() - interval '9 days', 80, 'Pull (old name)'),
  ('w-legs', 'u1', now() - interval '8 days', now() - interval '8 days', 80, NULL),
  ('w-rest', 'u1', now() - interval '7 days', now() - interval '7 days', 80, NULL),
  ('w-blank', 'u1', now() - interval '6 days', now() - interval '6 days', 80, NULL);
INSERT INTO "WorkoutOfMesocycle" ("id", "workoutId", "mesocycleId", "splitDayIndex", "workoutStatus") VALUES
  ('wm-pull', 'w-pull', 'm1', 0, NULL),
  ('wm-named', 'w-named', 'm1', 0, NULL),
  ('wm-legs', 'w-legs', 'm1', 2, NULL),
  ('wm-rest', 'w-rest', 'm1', 1, 'RestDay');
`;

let db: PrismaClient;
const migrationSql = readFileSync(path.join(migrationsDir, MIGRATION, 'migration.sql'), 'utf8');

test.beforeAll(async () => {
	runSql(adminUrl, `CREATE DATABASE "${scratchDbName}"`);
	const earlier = readdirSync(migrationsDir)
		.filter((name) => name < MIGRATION && !name.endsWith('.toml'))
		.sort();
	for (const name of earlier) runSql(scratchUrl, readFileSync(path.join(migrationsDir, name, 'migration.sql'), 'utf8'));
	runSql(scratchUrl, seed);
	runSql(scratchUrl, migrationSql);
	db = new PrismaClient({ datasourceUrl: scratchUrl });
});

test.afterAll(async () => {
	await db?.$disconnect();
	runSql(adminUrl, `DROP DATABASE IF EXISTS "${scratchDbName}" WITH (FORCE)`);
});

const names = () =>
	db.$queryRawUnsafe<{ id: string; routineName: string | null }[]>(
		`SELECT "id", "routineName" FROM "Workout" ORDER BY "id"`
	);

test('mesocycle workouts get their routine’s name; named ones, rest days and blank workouts keep theirs', async () => {
	expect(await names()).toEqual([
		{ id: 'w-blank', routineName: null },
		{ id: 'w-legs', routineName: 'Legs' },
		{ id: 'w-named', routineName: 'Pull (old name)' },
		{ id: 'w-pull', routineName: 'Pull' },
		{ id: 'w-rest', routineName: null }
	]);
});

test('running it again changes nothing', async () => {
	const before = await names();
	runSql(scratchUrl, migrationSql);
	expect(await names()).toEqual(before);
});
