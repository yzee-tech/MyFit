import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { config } from 'dotenv';
config();

/**
 * The "My routines" migration on data as it was before it: a scratch database gets every earlier
 * migration, old-style data, then this migration.
 */
const MIGRATION = '20261004090000_my_routines';
const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
const scratchDbName = `myroutines_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
const adminUrl = process.env.DATABASE_URL!;
const scratchUrl = (() => {
	const url = new URL(adminUrl);
	url.pathname = `/${scratchDbName}`;
	return url.toString();
})();
const workDir = mkdtempSync(path.join(tmpdir(), 'myroutines-'));

function runSql(url: string, sql: string) {
	const file = path.join(workDir, `${Date.now()}-${Math.random()}.sql`);
	writeFileSync(file, sql);
	execFileSync('pnpm', ['exec', 'prisma', 'db', 'execute', '--url', url, '--file', file], { stdio: 'pipe' });
}

const migrationSql = readFileSync(path.join(migrationsDir, MIGRATION, 'migration.sql'), 'utf8');
const dataMigrationSql = migrationSql.slice(
	migrationSql.indexOf('-- BEGIN DATA MIGRATION'),
	migrationSql.indexOf('-- END DATA MIGRATION')
);

// Old data, by person:
// u1: an active block from L1 (a rest day, "Pull A (2)" already taken), a finished block from L2, a
//     not-yet-started block from L3; L2 and L3 also have a "Pull A"; the block has "Arms", no library does
// u2: two libraries, no blocks: the one with more routines is kept
// u3: an active block whose library was deleted
// u4: only a finished block, no library
const seed = `
INSERT INTO "User" ("id", "email", "updatedAt") VALUES
  ('u1', 'u1@x', now()), ('u2', 'u2@x', now()), ('u3', 'u3@x', now()), ('u4', 'u4@x', now());

INSERT INTO "ExerciseSplit" ("id", "name", "userId") VALUES
  ('l1', 'Hotel', 'u1'), ('l2', 'Old', 'u1'), ('l3', 'Planned', 'u1'),
  ('la', 'Short', 'u2'), ('lb', 'Long', 'u2');

INSERT INTO "ExerciseSplitDay" ("id", "name", "dayIndex", "isRestDay", "weightUnit", "exerciseSplitId") VALUES
  ('l1-push', 'Push A', 0, false, 'KG', 'l1'), ('l1-rest', '', 1, true, 'KG', 'l1'),
  ('l1-pull', 'Pull A', 2, false, 'KG', 'l1'), ('l1-pull2', 'Pull A (2)', 3, false, 'KG', 'l1'),
  ('l2-pull', 'Pull A', 0, false, 'KG', 'l2'), ('l2-legs', 'Legs', 1, false, 'LB', 'l2'),
  ('l3-pull', 'Pull A', 0, false, 'KG', 'l3'),
  ('la-1', 'B1', 0, false, 'KG', 'la'), ('la-2', 'B2', 1, false, 'KG', 'la'),
  ('lb-1', 'A1', 0, false, 'KG', 'lb'), ('lb-2', 'A2', 1, false, 'KG', 'lb'), ('lb-3', 'A3', 2, false, 'KG', 'lb');

INSERT INTO "ExerciseTemplate" ("id", "name", "exerciseIndex", "targetMuscleGroup", "setType", "repRangeStart", "repRangeEnd", "sets", "exerciseSplitDayId") VALUES
  ('t-l1-push', 'Bench press (library)', 0, 'Chest', 'Straight', 5, 10, 3, 'l1-push'),
  ('t-l1-pull2', 'Chin-ups', 0, 'Lats', 'Straight', 5, 10, 3, 'l1-pull2'),
  ('t-l2-legs', 'Squats', 0, 'Quads', 'Straight', 5, 10, 3, 'l2-legs');

INSERT INTO "Mesocycle" ("id", "name", "userId", "exerciseSplitId", "weeklyRIR", "startDate", "endDate", "startOverloadPercentage", "lastSetToFailure", "forceRIRMatching") VALUES
  ('m1-active', 'Now', 'u1', 'l1', '{3,2,1}', now() - interval '7 days', NULL, 2.5, false, false),
  ('m1-done', 'Before', 'u1', 'l2', '{3,2,1}', now() - interval '90 days', now() - interval '60 days', 2.5, false, false),
  ('m1-next', 'Next', 'u1', 'l3', '{3,2,1}', NULL, NULL, 2.5, false, false),
  ('m3-active', 'Orphan', 'u3', NULL, '{3,2,1}', now() - interval '3 days', NULL, 2.5, false, false),
  ('m4-done', 'Long ago', 'u4', NULL, '{3,2,1}', now() - interval '400 days', now() - interval '300 days', 2.5, false, false);

INSERT INTO "MesocycleExerciseSplitDay" ("id", "name", "dayIndex", "isRestDay", "weightUnit", "mesocycleId") VALUES
  ('d1-push', 'Push A', 0, false, 'LB', 'm1-active'), ('d1-rest', '', 1, true, 'KG', 'm1-active'),
  ('d1-pull', 'Pull A', 2, false, 'KG', 'm1-active'), ('d1-arms', 'Arms', 3, false, 'KG', 'm1-active'),
  ('d3-full', 'Full body', 0, false, 'KG', 'm3-active');

INSERT INTO "MesocycleExerciseTemplate" ("id", "name", "exerciseIndex", "targetMuscleGroup", "setType", "repRangeStart", "repRangeEnd", "sets", "mesocycleExerciseSplitDayId", "overloadPercentage", "weightUnit") VALUES
  ('b-push-1', 'Bench press', 0, 'Chest', 'Straight', 6, 10, 4, 'd1-push', 5, 'KG'),
  ('b-push-2', 'Dips', 1, 'Chest', 'Straight', 8, 12, 3, 'd1-push', NULL, NULL),
  ('b-pull-1', 'Barbell rows', 0, 'Traps', 'Straight', 10, 15, 3, 'd1-pull', NULL, NULL),
  ('b-arms-1', 'Curls', 0, 'Biceps', 'Straight', 10, 20, 2, 'd1-arms', NULL, NULL),
  ('b-full-1', 'Deadlift', 0, 'Hamstrings', 'Straight', 3, 6, 3, 'd3-full', NULL, NULL);
`;

let db: PrismaClient;

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

type Snapshot = Awaited<ReturnType<typeof snapshot>>;

async function snapshot() {
	const lists = await db.$queryRawUnsafe<{ id: string; name: string; userId: string }[]>(
		`SELECT "id", "name", "userId" FROM "ExerciseSplit" ORDER BY "userId"`
	);
	const routines = await db.$queryRawUnsafe<
		{
			listId: string;
			name: string;
			dayIndex: number;
			isRestDay: boolean;
			weightUnit: string;
			exercises: string | null;
		}[]
	>(
		`SELECT d."exerciseSplitId" AS "listId", d."name", d."dayIndex", d."isRestDay", d."weightUnit"::text AS "weightUnit",
		        string_agg(t."name" || ':' || coalesce(t."sets"::text, '-') || ':' || coalesce(t."overloadPercentage"::text, '-')
		                   || ':' || coalesce(t."weightUnit"::text, '-'), ',' ORDER BY t."exerciseIndex") AS "exercises"
		 FROM "ExerciseSplitDay" d LEFT JOIN "ExerciseTemplate" t ON t."exerciseSplitDayId" = d."id"
		 GROUP BY d."id" ORDER BY d."exerciseSplitId", d."dayIndex"`
	);
	const blocks = await db.$queryRawUnsafe<{ id: string; exerciseSplitId: string | null }[]>(
		`SELECT "id", "exerciseSplitId" FROM "Mesocycle" ORDER BY "id"`
	);
	return { lists, routines, blocks };
}

const routinesOf = (snap: Snapshot, listId: string) => snap.routines.filter((routine) => routine.listId === listId);

test('one list per person: the active block’s library is kept, the others merge in with unique names', async () => {
	const snap = await snapshot();
	expect(snap.lists.filter((list) => list.userId === 'u1')).toEqual([{ id: 'l1', name: 'My routines', userId: 'u1' }]);
	expect(
		routinesOf(snap, 'l1').map(({ name, dayIndex, isRestDay, weightUnit, exercises }) => [
			name,
			dayIndex,
			isRestDay,
			weightUnit,
			exercises
		])
	).toEqual([
		// The active block's routines are what's trained: its exercises, sets, overrides and kg/lb replace the library's
		['Push A', 0, false, 'LB', 'Bench press:4:5:KG,Dips:3:-:-'],
		['Pull A', 1, false, 'KG', 'Barbell rows:3:-:-'],
		['Pull A (2)', 2, false, 'KG', 'Chin-ups:3:-:-'],
		// L2 (used by the most recently started block) before L3; "Pull A (2)" was taken
		['Pull A (3)', 3, false, 'KG', null],
		['Legs', 4, false, 'LB', 'Squats:3:-:-'],
		['Pull A (4)', 5, false, 'KG', null],
		// Only in the block
		['Arms', 6, false, 'KG', 'Curls:2:-:-']
	]);
});

test('no rest days in My routines; libraries without blocks keep the one with most routines', async () => {
	const snap = await snapshot();
	expect(snap.routines.some((routine) => routine.isRestDay)).toBe(false);
	expect(snap.lists.filter((list) => list.userId === 'u2').map((list) => list.id)).toEqual(['lb']);
	expect(routinesOf(snap, 'lb').map((routine) => routine.name)).toEqual(['A1', 'A2', 'A3', 'B1', 'B2']);
});

test('an active block without a library gets a list made from it; no blocks and no library: none', async () => {
	const snap = await snapshot();
	const u3List = snap.lists.find((list) => list.userId === 'u3')!;
	expect(u3List.name).toBe('My routines');
	expect(routinesOf(snap, u3List.id).map((routine) => [routine.name, routine.exercises])).toEqual([
		['Full body', 'Deadlift:3:-:-']
	]);
	expect(snap.lists.some((list) => list.userId === 'u4')).toBe(false);
});

test('blocks not yet finished follow the list; finished blocks follow none', async () => {
	const snap = await snapshot();
	const u3List = snap.lists.find((list) => list.userId === 'u3')!;
	expect(snap.blocks).toEqual([
		{ id: 'm1-active', exerciseSplitId: 'l1' },
		{ id: 'm1-done', exerciseSplitId: null },
		{ id: 'm1-next', exerciseSplitId: 'l1' },
		{ id: 'm3-active', exerciseSplitId: u3List.id },
		{ id: 'm4-done', exerciseSplitId: null }
	]);
});

test('the block’s own routines are untouched, and one list per person is enforced', async () => {
	const blockRoutines = await db.$queryRawUnsafe<{ id: string; dayIndex: number; hidden: boolean }[]>(
		`SELECT "id", "dayIndex", "hidden" FROM "MesocycleExerciseSplitDay" WHERE "mesocycleId" = 'm1-active' ORDER BY "dayIndex"`
	);
	expect(blockRoutines).toEqual([
		{ id: 'd1-push', dayIndex: 0, hidden: false },
		{ id: 'd1-rest', dayIndex: 1, hidden: false },
		{ id: 'd1-pull', dayIndex: 2, hidden: false },
		{ id: 'd1-arms', dayIndex: 3, hidden: false }
	]);
	await expect(
		db.$executeRawUnsafe(`INSERT INTO "ExerciseSplit" ("id", "name", "userId") VALUES ('second', 'Second', 'u1')`)
	).rejects.toThrow(/23505|already exists/);
});

test('running the data migration again changes nothing', async () => {
	const before = await snapshot();
	runSql(scratchUrl, dataMigrationSql);
	expect(await snapshot()).toEqual(before);
});
