import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { config } from 'dotenv';
config();

/**
 * Pausing adds a table of pauses and a workout's "counts toward progression" choice: a scratch database gets
 * every earlier migration, a block and workouts as they were, then this migration. Every existing workout
 * counts, as it did, and a block can have only one pause that is still open
 */
const MIGRATION = '20261101090000_mesocycle_pause';
const INDEX = 'MesocyclePause_one_open_per_mesocycle';
const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
const scratchDbName = `pause_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
const adminUrl = process.env.DATABASE_URL!;
const scratchUrl = (() => {
	const url = new URL(adminUrl);
	url.pathname = `/${scratchDbName}`;
	return url.toString();
})();
const workDir = mkdtempSync(path.join(tmpdir(), 'pause-'));

function runSql(url: string, sql: string) {
	const file = path.join(workDir, `${Date.now()}-${Math.random()}.sql`);
	writeFileSync(file, sql);
	execFileSync('pnpm', ['exec', 'prisma', 'db', 'execute', '--url', url, '--file', file], { stdio: 'pipe' });
}

const seed = `
INSERT INTO "User" ("id", "email", "updatedAt") VALUES ('u1', 'u1@x', now());
INSERT INTO "Mesocycle" ("id", "name", "userId", "weeklyRIR", "startDate", "startOverloadPercentage", "lastSetToFailure", "forceRIRMatching") VALUES
  ('m1', 'Block', 'u1', ARRAY[3,2,1,0], now() - interval '10 days', 2.5, false, false);
INSERT INTO "Workout" ("id", "userId", "startedAt", "endedAt", "userBodyweight") VALUES
  ('w1', 'u1', now() - interval '3 days', now() - interval '3 days', 80),
  ('w2', 'u1', now() - interval '2 days', now() - interval '2 days', 80);
INSERT INTO "WorkoutOfMesocycle" ("id", "workoutId", "mesocycleId") VALUES ('wm1', 'w1', 'm1');
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

test('every workout that was there counts toward progression, and the block and its links are untouched', async () => {
	const workouts = await db.workout.findMany({
		orderBy: { id: 'asc' },
		select: { id: true, countsForProgression: true }
	});
	expect(workouts).toEqual([
		{ id: 'w1', countsForProgression: true },
		{ id: 'w2', countsForProgression: true }
	]);
	expect(await db.workoutOfMesocycle.count({ where: { mesocycleId: 'm1' } })).toBe(1);
	expect(await db.mesocyclePause.count()).toBe(0);
});

test('the one-open-pause rule is in the database: a second open pause is refused, a closed one is not', async () => {
	const indexes = await db.$queryRaw<{ indexname: string; indexdef: string }[]>`
		SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'MesocyclePause'`;
	const unique = indexes.find((index) => index.indexname === INDEX);
	expect(unique?.indexdef).toContain('UNIQUE');
	expect(unique?.indexdef).toContain('"resumedAt" IS NULL');

	await db.mesocyclePause.create({ data: { id: 'p1', mesocycleId: 'm1', pausedAt: new Date() } });
	await expect(
		db.mesocyclePause.create({ data: { id: 'p2', mesocycleId: 'm1', pausedAt: new Date() } })
	).rejects.toMatchObject({
		code: 'P2002'
	});
	await db.mesocyclePause.create({
		data: {
			id: 'p3',
			mesocycleId: 'm1',
			pausedAt: new Date(Date.now() - 86400000),
			resumedAt: new Date(Date.now() - 43200000)
		}
	});
	// Once the open one is resumed, another can be opened
	await db.mesocyclePause.update({ where: { id: 'p1' }, data: { resumedAt: new Date() } });
	await db.mesocyclePause.create({ data: { id: 'p4', mesocycleId: 'm1', pausedAt: new Date() } });
	expect(await db.mesocyclePause.count({ where: { mesocycleId: 'm1', resumedAt: null } })).toBe(1);
});

test('deleting the block deletes its pauses, and a workout can be stored as not counting', async () => {
	await db.workout.update({ where: { id: 'w2' }, data: { countsForProgression: false } });
	expect((await db.workout.findUniqueOrThrow({ where: { id: 'w2' } })).countsForProgression).toBe(false);
	await db.mesocycle.delete({ where: { id: 'm1' } });
	expect(await db.mesocyclePause.count()).toBe(0);
});
