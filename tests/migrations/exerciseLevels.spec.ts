import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { config } from 'dotenv';
config();

/**
 * Levels move from weight sets onto exercises: a scratch database gets every earlier migration,
 * level sets as they were, then this migration.
 */
const MIGRATION = '20261009090000_exercise_levels';
const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
const scratchDbName = `levels_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
const adminUrl = process.env.DATABASE_URL!;
const scratchUrl = (() => {
	const url = new URL(adminUrl);
	url.pathname = `/${scratchDbName}`;
	return url.toString();
})();
const workDir = mkdtempSync(path.join(tmpdir(), 'levels-'));

function runSql(url: string, sql: string) {
	const file = path.join(workDir, `${Date.now()}-${Math.random()}.sql`);
	writeFileSync(file, sql);
	execFileSync('pnpm', ['exec', 'prisma', 'db', 'execute', '--url', url, '--file', file], { stdio: 'pipe' });
}

// u1's machines: "Hotel press" levels 1–10 (used in My routines), "Half" 1–5 by 0.5 (a block and a
// workout), "Unused" with no exercise; a kg dumbbell set stays. Crunches are reps only
const seed = `
INSERT INTO "User" ("id", "email", "updatedAt") VALUES ('u1', 'u1@x', now());

INSERT INTO "WeightSet" ("id", "name", "unit", "weights", "isAssistance", "userId") VALUES
  ('ws-press', 'Hotel press', 'LEVEL', '{1,2,3,4,5,6,7,8,9,10}', false, 'u1'),
  ('ws-half', 'Half', 'LEVEL', '{1,1.5,2,2.5,3,3.5,4,4.5,5}', false, 'u1'),
  ('ws-unused', 'Unused', 'LEVEL', '{1,2,3}', false, 'u1'),
  ('ws-crunch', 'Crunch machine', 'LEVEL', '{1,2,3}', false, 'u1'),
  ('ws-dbs', 'Hotel DBs', 'KG', '{5,7.5,10}', false, 'u1');

INSERT INTO "Exercise" ("id", "name", "targetMuscleGroup", "repsOnly", "userId") VALUES
  ('e-press', 'Chest press', 'Chest', false, 'u1'),
  ('e-half', 'Leg extension', 'Quads', false, 'u1'),
  ('e-curls', 'Curls', 'Biceps', false, 'u1'),
  ('e-crunch', 'Crunches', 'Abs', true, 'u1');

INSERT INTO "ExerciseSplit" ("id", "name", "userId") VALUES ('l1', 'My routines', 'u1');
INSERT INTO "ExerciseSplitDay" ("id", "name", "dayIndex", "isRestDay", "weightUnit", "exerciseSplitId") VALUES
  ('d1', 'Hotel', 0, false, 'KG', 'l1');
INSERT INTO "ExerciseTemplate" ("id", "name", "exerciseIndex", "targetMuscleGroup", "setType", "repRangeStart", "repRangeEnd", "sets", "exerciseSplitDayId", "exerciseId", "weightSetId") VALUES
  ('t-press', 'Chest press', 0, 'Chest', 'Straight', 10, 15, 3, 'd1', 'e-press', 'ws-press'),
  ('t-curls', 'Curls', 1, 'Biceps', 'Straight', 10, 15, 3, 'd1', 'e-curls', 'ws-dbs'),
  ('t-crunch', 'Crunches', 2, 'Abs', 'Straight', 10, 15, 3, 'd1', 'e-crunch', 'ws-crunch');

INSERT INTO "Mesocycle" ("id", "name", "userId", "exerciseSplitId", "weeklyRIR", "startDate", "endDate", "startOverloadPercentage", "lastSetToFailure", "forceRIRMatching") VALUES
  ('m1', 'Now', 'u1', 'l1', '{3,2,1}', now() - interval '7 days', NULL, 2.5, false, false);
INSERT INTO "MesocycleExerciseSplitDay" ("id", "name", "dayIndex", "isRestDay", "weightUnit", "mesocycleId") VALUES
  ('md1', 'Legs', 0, false, 'KG', 'm1');
INSERT INTO "MesocycleExerciseTemplate" ("id", "name", "exerciseIndex", "targetMuscleGroup", "setType", "repRangeStart", "repRangeEnd", "sets", "mesocycleExerciseSplitDayId", "exerciseId", "weightSetId") VALUES
  ('b-half', 'Leg extension', 0, 'Quads', 'Straight', 10, 15, 3, 'md1', 'e-half', 'ws-half');

INSERT INTO "Workout" ("id", "userId", "startedAt", "endedAt", "userBodyweight") VALUES
  ('w1', 'u1', now() - interval '2 days', now() - interval '2 days', 80);
INSERT INTO "WorkoutExercise" ("id", "workoutId", "name", "exerciseIndex", "targetMuscleGroup", "setType", "repRangeStart", "repRangeEnd", "weightUnit", "exerciseId", "weightSetId") VALUES
  ('we-half', 'w1', 'Leg extension', 0, 'Quads', 'Straight', 10, 15, 'LEVEL', 'e-half', 'ws-half');
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

test('each machine’s levels move onto its exercise; reps-only and weight exercises get none', async () => {
	const exercises = await db.$queryRawUnsafe<
		{ id: string; levelsFrom: number | null; levelsTo: number | null; levelStep: number | null }[]
	>(`SELECT "id", "levelsFrom", "levelsTo", "levelStep" FROM "Exercise" ORDER BY "id"`);
	expect(exercises).toEqual([
		{ id: 'e-crunch', levelsFrom: null, levelsTo: null, levelStep: null },
		{ id: 'e-curls', levelsFrom: null, levelsTo: null, levelStep: null },
		{ id: 'e-half', levelsFrom: 1, levelsTo: 5, levelStep: 0.5 },
		{ id: 'e-press', levelsFrom: 1, levelsTo: 10, levelStep: 1 }
	]);
});

test('level sets are deleted, used or not, and nothing links to them; kg/lb sets stay linked', async () => {
	const sets = await db.$queryRawUnsafe<{ id: string }[]>(`SELECT "id" FROM "WeightSet" ORDER BY "id"`);
	expect(sets).toEqual([{ id: 'ws-dbs' }]);
	const links = await db.$queryRawUnsafe<{ id: string; weightSetId: string | null }[]>(
		`SELECT "id", "weightSetId" FROM "ExerciseTemplate"
		 UNION ALL SELECT "id", "weightSetId" FROM "MesocycleExerciseTemplate"
		 UNION ALL SELECT "id", "weightSetId" FROM "WorkoutExercise" ORDER BY "id"`
	);
	expect(links).toEqual([
		{ id: 'b-half', weightSetId: null },
		{ id: 't-crunch', weightSetId: null },
		{ id: 't-curls', weightSetId: 'ws-dbs' },
		{ id: 't-press', weightSetId: null },
		{ id: 'we-half', weightSetId: null }
	]);
	// Past workouts still log levels
	const logged = await db.$queryRawUnsafe<{ weightUnit: string }[]>(
		`SELECT "weightUnit"::text AS "weightUnit" FROM "WorkoutExercise" WHERE "id" = 'we-half'`
	);
	expect(logged).toEqual([{ weightUnit: 'LEVEL' }]);
});
