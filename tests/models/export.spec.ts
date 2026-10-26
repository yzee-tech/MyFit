import { randomUUID } from 'crypto';
import type { Browser, BrowserContext } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import { expect, test } from '../fixtures';
import { buildCsvExport, buildJsonExport, type ExportData } from '../../src/lib/server/export';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:4173';

/** A fresh user with a session cookie, so per-user rate limits never collide between tests */
async function createUserContext(
	browser: Browser,
	name = 'Export Tester'
): Promise<{ userId: string; context: BrowserContext }> {
	const userId = createId();
	const sessionToken = randomUUID();
	await prisma.session.create({
		data: {
			sessionToken,
			expires: new Date(Date.now() + 1000 * 60 * 60),
			user: { create: { id: userId, name, email: `test-user-${userId}@myfit.com`, emailVerified: null } }
		}
	});
	const context = await browser.newContext({
		storageState: {
			cookies: [],
			origins: [{ origin: BASE_URL, localStorage: [{ name: 'myfit_terms_accepted', value: 'true' }] }]
		}
	});
	await context.addCookies([{ name: 'authjs.session-token', value: sessionToken, domain: 'localhost', path: '/' }]);
	return { userId, context };
}

const EXPECTED_HEADER = [
	'workoutId',
	'workoutExerciseId',
	'setId',
	'workoutStartedAt',
	'workoutEndedAt',
	'routineName',
	'mesocycleName',
	'workoutNote',
	'routineNote',
	'exerciseNote',
	'exerciseName',
	'muscleGroup',
	'setType',
	'setIndex',
	'setNumber',
	'reps',
	'loadKg',
	'machineLevel',
	'displayUnit',
	'RIR',
	'skipped',
	'isDeload',
	'weightSetId',
	'bodyweightKg',
	'bodyweightFraction',
	'miniSets'
];

function parseCsv(text: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let cell = '';
	let inQuotes = false;
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (inQuotes) {
			if (ch === '"' && text[i + 1] === '"') {
				cell += '"';
				i++;
			} else if (ch === '"') inQuotes = false;
			else cell += ch;
		} else if (ch === '"') inQuotes = true;
		else if (ch === ',') {
			row.push(cell);
			cell = '';
		} else if (ch === '\n') {
			row.push(cell);
			rows.push(row);
			row = [];
			cell = '';
		} else if (ch !== '\r') cell += ch;
	}
	if (cell !== '' || row.length > 0) {
		row.push(cell);
		rows.push(row);
	}
	return rows;
}

/** Workouts, exercises, routines, a mesocycle and weight sets covering the tricky cases */
async function seedRichData(userId: string) {
	await prisma.userSettings.create({
		data: { userId, welcomeBackEnabled: false, motivationalQuotesEnabled: true }
	});
	await prisma.weightSet.createMany({
		data: [
			{ id: 'wsA000000000000000000001', name: 'Home dumbbells', unit: 'KG', weights: [5, 7.5, 10], userId },
			{
				id: 'wsB000000000000000000001',
				name: 'Assisted pull-up machine',
				unit: 'KG',
				weights: [10, 20, 30],
				isAssistance: true,
				userId
			}
		]
	});
	await prisma.exercise.createMany({
		data: [
			{
				id: 'exA000000000000000000001',
				name: 'Bench "Press", Mk. II',
				targetMuscleGroup: 'Chest',
				note: '=HYPERLINK("http://example.com")',
				userId
			},
			{
				id: 'exB000000000000000000001',
				name: 'Row',
				targetMuscleGroup: 'Custom',
				customMuscleGroup: 'Upper back',
				archived: true,
				userId
			}
		]
	});
	await prisma.exerciseSplit.create({
		data: {
			id: 'esA000000000000000000001',
			name: 'My routines',
			userId,
			exerciseSplitDays: {
				create: [
					{
						id: 'esdA00000000000000000001',
						name: 'Pull day',
						dayIndex: 0,
						exercises: {
							create: [
								{
									id: 'etA000000000000000000001',
									name: 'Pull-ups',
									exerciseIndex: 0,
									targetMuscleGroup: 'Lats',
									setType: 'Straight',
									repRangeStart: 5,
									repRangeEnd: 15,
									note: 'template note with, comma'
								}
							]
						}
					}
				]
			}
		}
	});
	await prisma.mesocycle.create({
		data: {
			id: 'mA0000000000000000000001',
			name: 'Block 1',
			userId,
			weeklyRIR: [3, 2, 1, -1],
			startOverloadPercentage: 2.5,
			lastSetToFailure: true,
			forceRIRMatching: false,
			startDate: new Date('2024-01-01T00:00:00Z'),
			mesocycleCyclicSetChanges: {
				create: [
					{
						id: 'mcA000000000000000000001',
						muscleGroup: 'Custom',
						customMuscleGroup: 'Upper back',
						regardlessOfProgress: false,
						setIncreaseAmount: 1,
						maxVolume: 10
					}
				]
			}
		}
	});
	await prisma.workout.create({
		data: {
			id: 'wA0000000000000000000001',
			userId,
			userBodyweight: 80.5,
			startedAt: new Date('2024-01-01T10:00:00Z'),
			endedAt: new Date('2024-01-01T11:00:00Z'),
			routineName: 'Pull day',
			note: '  =1+1 leading whitespace',
			workoutExercises: {
				create: [
					{
						id: 'weA000000000000000000001',
						exerciseIndex: 0,
						name: 'Pull-ups',
						targetMuscleGroup: 'Lats',
						bodyweightFraction: 1,
						setType: 'Straight',
						repRangeStart: 5,
						repRangeEnd: 15,
						note: 'routine note "quoted"',
						exerciseNote: 'line one\nline two',
						weightUnit: 'KG',
						weightSetId: 'wsA000000000000000000001',
						exerciseId: 'exA000000000000000000001',
						sets: {
							create: [
								{
									id: 'sA0000000000000000000001',
									setIndex: 0,
									reps: 10,
									load: -20,
									RIR: 2,
									skipped: false,
									miniSets: {
										create: [{ id: 'msA000000000000000000001', miniSetIndex: 0, reps: 5, load: -20, RIR: 1 }]
									}
								},
								{ id: 'sB0000000000000000000001', setIndex: 1, reps: 8, load: 60.5, RIR: 1, skipped: true }
							]
						}
					},
					{
						id: 'weB000000000000000000001',
						exerciseIndex: 1,
						name: 'Pec deck',
						targetMuscleGroup: 'Custom',
						customMuscleGroup: 'Upper chest',
						setType: 'Straight',
						repRangeStart: 10,
						repRangeEnd: 12,
						weightUnit: 'LEVEL',
						exerciseId: 'exB000000000000000000001',
						sets: {
							create: [{ id: 'sC0000000000000000000001', setIndex: 0, reps: 12, load: 5, RIR: 3, skipped: false }]
						}
					},
					{
						id: 'weC000000000000000000001',
						exerciseIndex: 2,
						name: 'Zero-set exercise',
						targetMuscleGroup: 'Abs',
						setType: 'Straight',
						repRangeStart: 10,
						repRangeEnd: 15,
						weightUnit: 'KG'
					}
				]
			}
		}
	});
	await prisma.workoutOfMesocycle.create({
		data: {
			id: 'womA00000000000000000001',
			workoutId: 'wA0000000000000000000001',
			mesocycleId: 'mA0000000000000000000001'
		}
	});
	await prisma.workout.create({
		data: {
			id: 'wB0000000000000000000001',
			userId,
			userBodyweight: 81,
			startedAt: new Date('2024-01-03T10:00:00Z'),
			endedAt: new Date('2024-01-03T10:30:00Z'),
			isDeload: true
		}
	});
}

test('exports all data as JSON and CSV for a seeded account', async ({ browser }) => {
	const { userId, context } = await createUserContext(browser);
	await seedRichData(userId);

	// A second user whose data must never leak into the export
	const otherUserId = createId();
	await prisma.user.create({
		data: { id: otherUserId, email: `test-user-${otherUserId}@myfit.com`, emailVerified: null }
	});
	await prisma.exercise.create({
		data: {
			id: 'exX000000000000000000001',
			name: 'OTHER USER SECRET EXERCISE',
			targetMuscleGroup: 'Chest',
			userId: otherUserId
		}
	});
	await prisma.workout.create({
		data: {
			id: 'wX0000000000000000000001',
			userId: otherUserId,
			userBodyweight: 999,
			startedAt: new Date('2024-01-02T10:00:00Z'),
			endedAt: new Date('2024-01-02T11:00:00Z'),
			note: 'OTHER USER SECRET NOTE'
		}
	});

	const countsBefore = {
		workouts: await prisma.workout.count({ where: { userId } }),
		exercises: await prisma.exercise.count({ where: { userId } }),
		sets: await prisma.workoutExerciseSet.count({ where: { workoutExercise: { workout: { userId } } } })
	};

	// JSON
	const jsonResponse = await context.request.get(`${BASE_URL}/settings/export?format=json`);
	expect(jsonResponse.status()).toBe(200);
	expect(jsonResponse.headers()['content-type']).toContain('application/json');
	expect(jsonResponse.headers()['cache-control']).toBe('private, no-store');
	expect(jsonResponse.headers()['content-disposition']).toMatch(
		/attachment; filename="myfit-export-\d{4}-\d{2}-\d{2}\.json"/
	);
	const jsonText = await jsonResponse.text();
	const json = JSON.parse(jsonText);

	expect(json.formatVersion).toBe(1);
	expect(typeof json.exportedAt).toBe('string');
	expect(typeof json.appVersion).toBe('string');
	expect(json.profile).toEqual({ name: 'Export Tester', email: `test-user-${userId}@myfit.com` });
	expect(json.settings.welcomeBackEnabled).toBe(false);
	expect(json.weightSets).toHaveLength(2);
	expect(json.weightSets.map((w: { name: string }) => w.name)).toEqual(['Home dumbbells', 'Assisted pull-up machine']);
	// Archived exercises are included
	expect(json.exercises).toHaveLength(2);
	expect(json.exercises.find((e: { id: string }) => e.id === 'exB000000000000000000001').archived).toBe(true);
	expect(json.exerciseSplit.exerciseSplitDays[0].exercises[0].name).toBe('Pull-ups');
	expect(json.mesocycles[0].name).toBe('Block 1');
	expect(json.mesocycles[0].workoutsOfMesocycle[0].workoutId).toBe('wA0000000000000000000001');
	expect(json.mesocycles[0].mesocycleCyclicSetChanges).toHaveLength(1);

	expect(json.workouts).toHaveLength(2);
	const workout = json.workouts[0];
	// Raw rows, exactly as stored: formula-like text is NOT prefixed in JSON
	expect(workout.note).toBe('  =1+1 leading whitespace');
	expect(workout.workoutExercises).toHaveLength(3);
	const [pullUps, pecDeck, zeroSet] = workout.workoutExercises;
	expect(pullUps.sets).toHaveLength(2);
	expect(pullUps.sets[0].load).toBe(-20);
	expect(pullUps.sets[0].miniSets).toHaveLength(1);
	expect(pullUps.sets[1].skipped).toBe(true);
	expect(pecDeck.weightUnit).toBe('LEVEL');
	expect(zeroSet.sets).toHaveLength(0);
	// The empty workout appears in JSON
	expect(json.workouts[1].workoutExercises).toHaveLength(0);
	expect(json.workouts[1].isDeload).toBe(true);

	// No auth models, no other user's data
	expect(jsonText).not.toContain('sessionToken');
	expect(jsonText).not.toContain('access_token');
	expect(jsonText).not.toContain('refresh_token');
	expect(jsonText).not.toContain('OTHER USER');
	expect(jsonText).not.toContain(otherUserId);

	// CSV
	const csvResponse = await context.request.get(`${BASE_URL}/settings/export?format=csv`);
	expect(csvResponse.status()).toBe(200);
	expect(csvResponse.headers()['content-type']).toContain('text/csv');
	const csvText = await csvResponse.text();
	expect(csvText.charCodeAt(0)).toBe(0xfeff);
	const [header, ...rows] = parseCsv(csvText.slice(1));
	expect(header).toEqual(EXPECTED_HEADER);
	// One row per parent set, skipped included; zero-set exercises and the empty workout excluded
	expect(rows).toHaveLength(3);

	const bySetId = Object.fromEntries(EXPECTED_HEADER.map((h, i) => [h, i]));
	const row1 = rows[0];
	expect(row1[bySetId.setId]).toBe('sA0000000000000000000001');
	// setIndex counts from 0, setNumber from 1
	expect(row1[bySetId.setIndex]).toBe('0');
	expect(row1[bySetId.setNumber]).toBe('1');
	expect(row1[bySetId.workoutStartedAt]).toBe('2024-01-01T10:00:00.000Z');
	expect(row1[bySetId.routineName]).toBe('Pull day');
	expect(row1[bySetId.mesocycleName]).toBe('Block 1');
	// Formula-like text behind leading whitespace gets a single-quote prefix
	expect(row1[bySetId.workoutNote]).toBe("'  =1+1 leading whitespace");
	expect(row1[bySetId.routineNote]).toBe('routine note "quoted"');
	expect(row1[bySetId.exerciseNote]).toBe('line one\nline two');
	expect(row1[bySetId.exerciseName]).toBe('Pull-ups');
	expect(row1[bySetId.muscleGroup]).toBe('Lats');
	// A negative load means machine assistance and stays numeric (never quote-prefixed)
	expect(row1[bySetId.loadKg]).toBe('-20');
	expect(row1[bySetId.machineLevel]).toBe('');
	expect(row1[bySetId.displayUnit]).toBe('KG');
	expect(row1[bySetId.skipped]).toBe('false');
	expect(row1[bySetId.isDeload]).toBe('false');
	expect(row1[bySetId.weightSetId]).toBe('wsA000000000000000000001');
	expect(row1[bySetId.bodyweightKg]).toBe('80.5');
	expect(row1[bySetId.bodyweightFraction]).toBe('1');
	expect(JSON.parse(row1[bySetId.miniSets])).toEqual([{ reps: 5, loadKg: -20, RIR: 1 }]);

	const row2 = rows[1];
	expect(row2[bySetId.setId]).toBe('sB0000000000000000000001');
	expect(row2[bySetId.setIndex]).toBe('1');
	expect(row2[bySetId.setNumber]).toBe('2');
	expect(row2[bySetId.skipped]).toBe('true');
	expect(row2[bySetId.loadKg]).toBe('60.5');
	expect(row2[bySetId.miniSets]).toBe('');

	const row3 = rows[2];
	expect(row3[bySetId.setId]).toBe('sC0000000000000000000001');
	// loadKg and machineLevel are disjoint; LEVEL exercises report their level
	expect(row3[bySetId.loadKg]).toBe('');
	expect(row3[bySetId.machineLevel]).toBe('5');
	expect(row3[bySetId.displayUnit]).toBe('LEVEL');
	// The custom muscle name wins over the enum
	expect(row3[bySetId.muscleGroup]).toBe('Upper chest');

	expect(csvText).not.toContain('OTHER USER');

	// Exports are reads: nothing changed
	expect(await prisma.workout.count({ where: { userId } })).toBe(countsBefore.workouts);
	expect(await prisma.exercise.count({ where: { userId } })).toBe(countsBefore.exercises);
	expect(await prisma.workoutExerciseSet.count({ where: { workoutExercise: { workout: { userId } } } })).toBe(
		countsBefore.sets
	);

	await context.close();
});

test('exports an empty account', async ({ browser }) => {
	const { context } = await createUserContext(browser);
	const jsonResponse = await context.request.get(`${BASE_URL}/settings/export?format=json`);
	expect(jsonResponse.status()).toBe(200);
	const json = await jsonResponse.json();
	expect(json.workouts).toEqual([]);
	expect(json.exercises).toEqual([]);
	expect(json.settings).toBeNull();
	expect(json.exerciseSplit).toBeNull();

	const csvResponse = await context.request.get(`${BASE_URL}/settings/export?format=csv`);
	expect(csvResponse.status()).toBe(200);
	const csvText = await csvResponse.text();
	expect(csvText).toBe('\uFEFF' + EXPECTED_HEADER.join(',') + '\r\n');
	await context.close();
});

test('rejects a bad format, redirects signed-out users, and ignores a supplied user id', async ({ browser }) => {
	const { userId, context } = await createUserContext(browser);
	await prisma.workout.create({
		data: {
			id: 'wC0000000000000000000001',
			userId,
			userBodyweight: 80,
			startedAt: new Date('2024-02-01T10:00:00Z'),
			endedAt: new Date('2024-02-01T11:00:00Z')
		}
	});

	const badFormat = await context.request.get(`${BASE_URL}/settings/export?format=xml`);
	expect(badFormat.status()).toBe(400);

	// An explicit empty storage state: the fixtures default every new context to the worker's session
	const signedOut = await browser.newContext({ storageState: { cookies: [], origins: [] } });
	const redirect = await signedOut.request.get(`${BASE_URL}/settings/export?format=json`, { maxRedirects: 0 });
	// The sign-in guard sends signed-out page loads to /login
	expect(redirect.status()).toBe(303);
	expect(decodeURIComponent(redirect.headers()['location'] ?? '')).toContain(
		'/login?redirectTo=/settings/export?format=json'
	);
	await signedOut.close();

	// A user id in the query string must not change whose data is exported
	const otherUserId = createId();
	const spoofed = await context.request.get(`${BASE_URL}/settings/export?format=json&userId=${otherUserId}`);
	expect(spoofed.status()).toBe(200);
	const spoofedText = await spoofed.text();
	expect(spoofedText).toContain('wC0000000000000000000001');
	expect(spoofedText).not.toContain(otherUserId);
	await context.close();
});

test('rate limits a rapid repeat of the same format only', async ({ browser }) => {
	const { context } = await createUserContext(browser);
	const first = await context.request.get(`${BASE_URL}/settings/export?format=csv`);
	expect(first.status()).toBe(200);
	const second = await context.request.get(`${BASE_URL}/settings/export?format=csv`);
	expect(second.status()).toBe(429);
	expect(Number(second.headers()['retry-after'])).toBeGreaterThan(0);
	// The other format is unaffected
	const json = await context.request.get(`${BASE_URL}/settings/export?format=json`);
	expect(json.status()).toBe(200);
	await context.close();
});

async function createBigNoteWorkout(userId: string, id: string, noteBytes: number) {
	await prisma.workout.create({
		data: {
			id,
			userId,
			userBodyweight: 80,
			startedAt: new Date('2024-02-01T10:00:00Z'),
			endedAt: new Date('2024-02-01T11:00:00Z'),
			note: 'x'.repeat(noteBytes)
		}
	});
}

test('answers 413 for an export whose exact size is over the limit', async ({ browser }) => {
	const { userId, context } = await createUserContext(browser);
	// Passes the preflight estimate, but the serialized file is over 4 MB
	await createBigNoteWorkout(userId, 'wD0000000000000000000001', 4_100_000);
	const jsonResponse = await context.request.get(`${BASE_URL}/settings/export?format=json`);
	expect(jsonResponse.status()).toBe(413);
	// The CSV has one row per set and this workout has none, so it is tiny and still downloads
	const csvResponse = await context.request.get(`${BASE_URL}/settings/export?format=csv`);
	expect(csvResponse.status()).toBe(200);
	await context.close();
});

test('answers 413 from the preflight estimate for an absurdly large account', async ({ browser }) => {
	const { userId, context } = await createUserContext(browser);
	await createBigNoteWorkout(userId, 'wD0000000000000000000002', 11_000_000);
	const response = await context.request.get(`${BASE_URL}/settings/export?format=json`);
	expect(response.status()).toBe(413);
	await context.close();
});

test('exports an account that fits the limit even when the estimate is high', async ({ browser }) => {
	const { userId, context } = await createUserContext(browser);
	// The estimate is about 4x the note (4.4 MB), over the download limit; the real files are about 1.1 MB
	await createBigNoteWorkout(userId, 'wD0000000000000000000003', 1_100_000);
	const jsonResponse = await context.request.get(`${BASE_URL}/settings/export?format=json`);
	expect(jsonResponse.status()).toBe(200);
	const csvResponse = await context.request.get(`${BASE_URL}/settings/export?format=csv`);
	expect(csvResponse.status()).toBe(200);
	await context.close();
});

test('a refused export does not use up the rate limit slot', async ({ browser }) => {
	const { userId, context } = await createUserContext(browser);
	await createBigNoteWorkout(userId, 'wD0000000000000000000004', 4_100_000);
	expect((await context.request.get(`${BASE_URL}/settings/export?format=json`)).status()).toBe(413);
	// Not 429: the refused export was not counted
	expect((await context.request.get(`${BASE_URL}/settings/export?format=json`)).status()).toBe(413);
	await context.close();
});

test('orders mesocycles by start date, not by id', async ({ browser }) => {
	const { userId, context } = await createUserContext(browser);
	const base = {
		userId,
		weeklyRIR: [3, 2, 1],
		startOverloadPercentage: 2.5,
		lastSetToFailure: false,
		forceRIRMatching: false
	};
	// The earlier block has the larger id; a block without a start date comes last
	await prisma.mesocycle.create({
		data: { ...base, id: 'mB0000000000000000000001', name: 'Later', startDate: new Date('2024-06-01T00:00:00Z') }
	});
	await prisma.mesocycle.create({
		data: { ...base, id: 'mB0000000000000000000002', name: 'Earlier', startDate: new Date('2024-01-01T00:00:00Z') }
	});
	await prisma.mesocycle.create({
		data: { ...base, id: 'mB0000000000000000000000', name: 'Undated', startDate: null }
	});
	const response = await context.request.get(`${BASE_URL}/settings/export?format=json`);
	const json = await response.json();
	expect(json.mesocycles.map((m: { name: string }) => m.name)).toEqual(['Earlier', 'Later', 'Undated']);
	await context.close();
});

test('serializes unchanged data deterministically', async () => {
	const data = {
		profile: { name: 'T', email: 't@example.com' },
		settings: null,
		weightSets: [],
		exercises: [],
		exerciseSplit: null,
		mesocycles: [],
		workouts: [
			{
				id: 'w1',
				userId: 'u1',
				userBodyweight: 80,
				startedAt: new Date('2024-01-01T10:00:00Z'),
				endedAt: new Date('2024-01-01T11:00:00Z'),
				note: null,
				isDeload: false,
				routineName: null,
				workoutExercises: []
			}
		]
	} as unknown as ExportData;

	const firstJson = buildJsonExport(structuredClone(data), 'test-version');
	const secondJson = buildJsonExport(structuredClone(data), 'test-version');
	const normalize = (text: string) => text.replace(/"exportedAt":"[^"]+"/, '"exportedAt":"<normalized>"');
	expect(normalize(firstJson)).toBe(normalize(secondJson));
	expect(buildCsvExport(structuredClone(data))).toBe(buildCsvExport(structuredClone(data)));
});

test('settings page shows the Your data card and the buttons download', async ({ browser }) => {
	const { context } = await createUserContext(browser);
	const page = await context.newPage();
	await page.goto('/settings');
	await expect(page.getByText('Your data')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Download JSON' })).toBeVisible();

	const [download] = await Promise.all([
		page.waitForEvent('download'),
		page.getByRole('button', { name: 'Download CSV' }).click()
	]);
	expect(download.suggestedFilename()).toMatch(/^myfit-export-\d{4}-\d{2}-\d{2}\.csv$/);
	await context.close();
});

test('the Download button shows a spinner while it waits and a toast when the export is refused', async ({
	browser
}) => {
	const { context } = await createUserContext(browser);
	const page = await context.newPage();
	await page.goto('/settings');

	let release: () => void = () => {};
	const gate = new Promise<void>((resolve) => (release = resolve));
	await page.route('**/settings/export?format=json', async (route) => {
		await gate;
		await route.fulfill({ status: 429, contentType: 'text/plain', body: 'Too many exports; retry in 42 seconds.' });
	});
	await page.route('**/settings/export?format=csv', (route) =>
		route.fulfill({ status: 413, contentType: 'text/plain', body: 'Export exceeds the maximum download size of 4 MB.' })
	);

	const jsonButton = page.getByRole('button', { name: 'Download JSON' });
	await jsonButton.click();
	// Busy: both buttons are disabled until the response arrives
	await expect(jsonButton).toBeDisabled();
	await expect(page.getByRole('button', { name: 'Download CSV' })).toBeDisabled();
	release();
	await expect(page.getByText('Too many exports; retry in 42 seconds.')).toBeVisible();
	await expect(jsonButton).toBeEnabled();

	await page.getByRole('button', { name: 'Download CSV' }).click();
	await expect(page.getByText('Export exceeds the maximum download size of 4 MB.')).toBeVisible();
	await context.close();
});
