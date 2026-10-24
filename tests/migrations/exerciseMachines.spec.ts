import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { config } from 'dotenv';
config();

/**
 * Assisted machines move from weight sets onto exercises: a scratch database gets every earlier
 * migration, weight sets as they were, then this migration.
 */
const MIGRATION = '20261024090000_exercise_machines';
const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
const scratchDbName = `machines_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
const adminUrl = process.env.DATABASE_URL!;
const scratchUrl = (() => {
	const url = new URL(adminUrl);
	url.pathname = `/${scratchDbName}`;
	return url.toString();
})();
const workDir = mkdtempSync(path.join(tmpdir(), 'machines-'));

function runSql(url: string, sql: string) {
	const file = path.join(workDir, `${Date.now()}-${Math.random()}.sql`);
	writeFileSync(file, sql);
	execFileSync('pnpm', ['exec', 'prisma', 'db', 'execute', '--url', url, '--file', file], { stdio: 'pipe' });
}

// u1's sets: "Gym assist" (assistance, kg) and "Hotel assist" (assistance, lb), "DBs" (kg dumbbells).
// - Assisted pull-ups (A): only Gym assist, plus DBs in another routine → moves, both links cleared
// - Assisted dips (B): Gym assist and Hotel assist → stays, links kept; so Gym assist stays too
// - Hotel chin-ups (C): only Hotel assist in routines, but shares it with B → moves; Hotel assist kept for B
// - Band pull-ups (D): reps only, Gym assist → stays
// - Assist press (E): levels, Gym assist → stays
// - Curls (F): DBs only → untouched
// - Solo assist (G): only "Solo assist" → moves, and Solo assist is deleted (its old workout link cleared)
const seed = `
INSERT INTO "User" ("id", "email", "updatedAt") VALUES ('u1', 'u1@x', now());

INSERT INTO "WeightSet" ("id", "name", "unit", "weights", "isAssistance", "userId") VALUES
  ('ws-gym', 'Gym assist', 'KG', '{5,10,15,20,25,30,35,40,45,50}', true, 'u1'),
  ('ws-hotel', 'Hotel assist', 'LB', '{10,20,30,40,50}', true, 'u1'),
  ('ws-solo', 'Solo assist', 'KG', '{7,14,21}', true, 'u1'),
  ('ws-dbs', 'DBs', 'KG', '{5,7.5,10}', false, 'u1');

INSERT INTO "Exercise" ("id", "name", "targetMuscleGroup", "bodyweightFraction", "repsOnly", "levelsFrom", "levelsTo", "levelStep", "userId") VALUES
  ('e-a', 'Assisted pull-ups', 'Lats', NULL, false, NULL, NULL, NULL, 'u1'),
  ('e-b', 'Assisted dips', 'Triceps', 1, false, NULL, NULL, NULL, 'u1'),
  ('e-c', 'Hotel chin-ups', 'Lats', 1, false, NULL, NULL, NULL, 'u1'),
  ('e-d', 'Band pull-ups', 'Lats', 1, true, NULL, NULL, NULL, 'u1'),
  ('e-e', 'Assist press', 'Chest', NULL, false, 1, 10, 1, 'u1'),
  ('e-f', 'Curls', 'Biceps', NULL, false, NULL, NULL, NULL, 'u1'),
  ('e-g', 'Solo assist', 'Lats', NULL, false, NULL, NULL, NULL, 'u1');

INSERT INTO "ExerciseSplit" ("id", "name", "userId") VALUES ('l1', 'My routines', 'u1');
INSERT INTO "ExerciseSplitDay" ("id", "name", "dayIndex", "weightUnit", "exerciseSplitId") VALUES
  ('d1', 'Gym', 0, 'KG', 'l1'),
  ('d2', 'Hotel', 1, 'LB', 'l1');
INSERT INTO "ExerciseTemplate" ("id", "name", "exerciseIndex", "targetMuscleGroup", "setType", "repRangeStart", "repRangeEnd", "sets", "exerciseSplitDayId", "exerciseId", "weightSetId") VALUES
  ('t-a1', 'Assisted pull-ups', 0, 'Lats', 'Straight', 8, 12, 3, 'd1', 'e-a', 'ws-gym'),
  ('t-a2', 'Assisted pull-ups', 0, 'Lats', 'Straight', 8, 12, 3, 'd2', 'e-a', 'ws-dbs'),
  ('t-b1', 'Assisted dips', 1, 'Triceps', 'Straight', 8, 12, 3, 'd1', 'e-b', 'ws-gym'),
  ('t-b2', 'Assisted dips', 1, 'Triceps', 'Straight', 8, 12, 3, 'd2', 'e-b', 'ws-hotel'),
  ('t-c', 'Hotel chin-ups', 2, 'Lats', 'Straight', 8, 12, 3, 'd2', 'e-c', 'ws-hotel'),
  ('t-d', 'Band pull-ups', 2, 'Lats', 'Straight', 8, 12, 3, 'd1', 'e-d', 'ws-gym'),
  ('t-e', 'Assist press', 3, 'Chest', 'Straight', 8, 12, 3, 'd1', 'e-e', 'ws-gym'),
  ('t-f', 'Curls', 4, 'Biceps', 'Straight', 8, 12, 3, 'd1', 'e-f', 'ws-dbs'),
  ('t-g', 'Solo assist', 5, 'Lats', 'Straight', 8, 12, 3, 'd1', 'e-g', 'ws-solo');

INSERT INTO "Workout" ("id", "userId", "startedAt", "endedAt", "userBodyweight") VALUES
  ('w1', 'u1', now() - interval '2 days', now() - interval '2 days', 80);
INSERT INTO "WorkoutExercise" ("id", "workoutId", "name", "exerciseIndex", "targetMuscleGroup", "setType", "repRangeStart", "repRangeEnd", "weightUnit", "exerciseId", "weightSetId") VALUES
  ('we-a', 'w1', 'Assisted pull-ups', 0, 'Lats', 'Straight', 8, 12, 'KG', 'e-a', 'ws-gym'),
  ('we-g', 'w1', 'Solo assist', 1, 'Lats', 'Straight', 8, 12, 'KG', 'e-g', 'ws-solo');
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

test('an exercise linked to one assistance set gets its weights, unit and assisted; nothing else moves', async () => {
	const exercises = await db.exercise.findMany({
		orderBy: { id: 'asc' },
		select: { id: true, machineWeights: true, machineUnit: true, assisted: true, bodyweightFraction: true }
	});
	expect(exercises).toEqual([
		// One assistance set (and dumbbells elsewhere): moved; no bodyweight share added
		{
			id: 'e-a',
			machineWeights: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
			machineUnit: 'KG',
			assisted: true,
			bodyweightFraction: null
		},
		// Two assistance sets: left to choose
		{ id: 'e-b', machineWeights: [], machineUnit: null, assisted: false, bodyweightFraction: 1 },
		{ id: 'e-c', machineWeights: [10, 20, 30, 40, 50], machineUnit: 'LB', assisted: true, bodyweightFraction: 1 },
		// Reps only and levels: never
		{ id: 'e-d', machineWeights: [], machineUnit: null, assisted: false, bodyweightFraction: 1 },
		{ id: 'e-e', machineWeights: [], machineUnit: null, assisted: false, bodyweightFraction: null },
		{ id: 'e-f', machineWeights: [], machineUnit: null, assisted: false, bodyweightFraction: null },
		{ id: 'e-g', machineWeights: [7, 14, 21], machineUnit: 'KG', assisted: true, bodyweightFraction: null }
	]);
});

test('moved exercises lose their routine links; the others keep theirs, and a set still used stays', async () => {
	const links = await db.exerciseTemplate.findMany({ orderBy: { id: 'asc' }, select: { id: true, weightSetId: true } });
	expect(links).toEqual([
		{ id: 't-a1', weightSetId: null },
		{ id: 't-a2', weightSetId: null },
		{ id: 't-b1', weightSetId: 'ws-gym' },
		{ id: 't-b2', weightSetId: 'ws-hotel' },
		{ id: 't-c', weightSetId: null },
		{ id: 't-d', weightSetId: 'ws-gym' },
		{ id: 't-e', weightSetId: 'ws-gym' },
		{ id: 't-f', weightSetId: 'ws-dbs' },
		{ id: 't-g', weightSetId: null }
	]);
	// Gym assist (dips, band pull-ups, the press) and Hotel assist (dips) are still used; Solo assist goes
	const sets = await db.weightSet.findMany({ orderBy: { id: 'asc' }, select: { id: true } });
	expect(sets).toEqual([{ id: 'ws-dbs' }, { id: 'ws-gym' }, { id: 'ws-hotel' }]);
	const workoutLinks = await db.workoutExercise.findMany({
		orderBy: { id: 'asc' },
		select: { id: true, weightSetId: true }
	});
	expect(workoutLinks).toEqual([
		{ id: 'we-a', weightSetId: 'ws-gym' },
		{ id: 'we-g', weightSetId: null }
	]);
});
