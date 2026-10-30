import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { config } from 'dotenv';
config();

/**
 * Cardio adds how an exercise is measured and a set's time and distance: a scratch database gets every
 * earlier migration, an exercise and a workout as they were, then this migration. Nothing is rewritten:
 * every existing exercise reads Reps and every existing set reads no time and no distance
 */
const MIGRATION = '20261025090000_cardio_measures';
const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
const scratchDbName = `cardio_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
const adminUrl = process.env.DATABASE_URL!;
const scratchUrl = (() => {
	const url = new URL(adminUrl);
	url.pathname = `/${scratchDbName}`;
	return url.toString();
})();
const workDir = mkdtempSync(path.join(tmpdir(), 'cardio-'));

function runSql(url: string, sql: string) {
	const file = path.join(workDir, `${Date.now()}-${Math.random()}.sql`);
	writeFileSync(file, sql);
	execFileSync('pnpm', ['exec', 'prisma', 'db', 'execute', '--url', url, '--file', file], { stdio: 'pipe' });
}

const seed = `
INSERT INTO "User" ("id", "email", "updatedAt") VALUES ('u1', 'u1@x', now());
INSERT INTO "Exercise" ("id", "name", "targetMuscleGroup", "bodyweightFraction", "repsOnly", "levelsFrom", "levelsTo", "levelStep", "userId") VALUES
  ('e-rows', 'Barbell rows', 'Traps', NULL, false, NULL, NULL, NULL, 'u1'),
  ('e-bike', 'Bike', 'Quads', NULL, false, 1, 20, 1, 'u1');
INSERT INTO "Workout" ("id", "userId", "startedAt", "endedAt", "userBodyweight") VALUES
  ('w1', 'u1', now() - interval '2 days', now() - interval '2 days', 80);
INSERT INTO "WorkoutExercise" ("id", "workoutId", "name", "exerciseIndex", "targetMuscleGroup", "setType", "repRangeStart", "repRangeEnd", "weightUnit", "exerciseId") VALUES
  ('we-rows', 'w1', 'Barbell rows', 0, 'Traps', 'Straight', 8, 12, 'KG', 'e-rows'),
  ('we-bike', 'w1', 'Bike', 1, 'Quads', 'Straight', 8, 12, 'LEVEL', 'e-bike');
INSERT INTO "WorkoutExerciseSet" ("id", "setIndex", "workoutExerciseId", "reps", "load", "RIR", "skipped") VALUES
  ('s-1', 0, 'we-rows', 12, 40, 2, false),
  ('s-2', 1, 'we-rows', 0, 0, 0, true),
  ('s-3', 0, 'we-bike', 10, 8, 2, false);
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

test('existing exercises read Reps with no distance unit; their other settings are untouched', async () => {
	const exercises = await db.exercise.findMany({
		orderBy: { id: 'asc' },
		select: { id: true, measure: true, distanceUnit: true, levelsFrom: true, levelsTo: true, repsOnly: true }
	});
	expect(exercises).toEqual([
		{ id: 'e-bike', measure: 'Reps', distanceUnit: null, levelsFrom: 1, levelsTo: 20, repsOnly: false },
		{ id: 'e-rows', measure: 'Reps', distanceUnit: null, levelsFrom: null, levelsTo: null, repsOnly: false }
	]);
});

test('existing sets keep their numbers and read no time and no distance, so their rows are still reps rows', async () => {
	const sets = await db.workoutExerciseSet.findMany({
		orderBy: { id: 'asc' },
		select: { id: true, reps: true, load: true, RIR: true, skipped: true, timeSeconds: true, distanceMeters: true }
	});
	expect(sets).toEqual([
		{ id: 's-1', reps: 12, load: 40, RIR: 2, skipped: false, timeSeconds: null, distanceMeters: null },
		{ id: 's-2', reps: 0, load: 0, RIR: 0, skipped: true, timeSeconds: null, distanceMeters: null },
		{ id: 's-3', reps: 10, load: 8, RIR: 2, skipped: false, timeSeconds: null, distanceMeters: null }
	]);
});

test('the new values can be stored: a Cardio exercise measured in distance and time, and a set with both', async () => {
	await db.exercise.create({
		data: {
			id: 'e-run',
			name: 'Run',
			targetMuscleGroup: 'Cardio',
			measure: 'DistanceTime',
			distanceUnit: 'KM',
			userId: 'u1'
		}
	});
	await db.workoutExerciseSet.create({
		data: {
			id: 's-4',
			setIndex: 1,
			workoutExerciseId: 'we-bike',
			reps: 0,
			load: 8,
			RIR: 0,
			skipped: false,
			timeSeconds: 30,
			distanceMeters: null
		}
	});
	expect(await db.exercise.findUniqueOrThrow({ where: { id: 'e-run' } })).toMatchObject({
		targetMuscleGroup: 'Cardio',
		measure: 'DistanceTime',
		distanceUnit: 'KM'
	});
	expect(await db.workoutExerciseSet.findUniqueOrThrow({ where: { id: 's-4' } })).toMatchObject({
		timeSeconds: 30,
		distanceMeters: null
	});
});
