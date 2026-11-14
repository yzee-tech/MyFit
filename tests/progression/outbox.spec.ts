import { test, expect } from '@playwright/test';
import {
	OUTBOX_BACKUP_KEY,
	OUTBOX_KEY,
	classifyFailure,
	readOutbox,
	retryWaitMs,
	runOutbox,
	waitedTooLong,
	workoutSummaryText,
	writeOutbox,
	type OutboxEntry,
	type OutboxRequest,
	type SendResult
} from '../../src/lib/utils/outbox';
import { clearStorageForUpdate } from '../../src/lib/utils/clearForUpdate';

/**
 * The waiting list for workouts saved with no signal: what a failed send means, what is kept and what never
 * is thrown away, the order and timing of sends, and the text Copy details gives
 */

class FakeStorage {
	items = new Map<string, string>();
	failWrites = false;
	getItem = (key: string) => this.items.get(key) ?? null;
	setItem = (key: string, value: string) => {
		if (this.failWrites) throw new Error('QuotaExceededError');
		this.items.set(key, value);
	};
	removeItem = (key: string) => {
		this.items.delete(key);
	};
}

function request(
	clientId: string,
	startedAt: string,
	extra: Partial<OutboxRequest['workoutData']> = {}
): OutboxRequest {
	return {
		clientId,
		workoutData: {
			startedAt,
			endedAt: '2026-11-13T02:04:00.000Z',
			userBodyweight: 80,
			routineName: 'Pull A',
			...extra
		},
		workoutExercises: [{ name: 'Barbell rows' }],
		workoutExercisesSets: [[{ reps: 12, load: 42.5, RIR: 2, skipped: false }]],
		workoutExercisesMiniSets: [[[]]]
	};
}

function entry(clientId: string, startedAt: string, extra: Partial<OutboxEntry> = {}): OutboxEntry {
	return {
		clientId,
		userId: 'me',
		queuedAt: startedAt,
		request: request(clientId, startedAt),
		label: 'Pull A',
		state: 'waiting',
		attempts: 0,
		lastAttemptAt: null,
		lastError: null,
		...extra
	};
}

const trpcError = (code: string, httpStatus: number, message = '') => ({
	shape: { message, data: { code, httpStatus } }
});
const answers = (map: Record<string, SendResult>) => async (e: OutboxEntry) => map[e.clientId] ?? { ok: true as const };

test('what a failed send means: no answer, a server problem or a timeout is tried again; 401 is a lapsed sign-in; the rest is a refusal', () => {
	// The browser got no answer at all (offline, a dropped connection, our own timeout)
	expect(classifyFailure(new TypeError('Failed to fetch')).kind).toBe('waiting');
	expect(classifyFailure(new Error('No answer from the server')).kind).toBe('waiting');
	expect(classifyFailure(undefined).kind).toBe('waiting');
	// The server answered
	expect(classifyFailure(trpcError('INTERNAL_SERVER_ERROR', 500)).kind).toBe('waiting');
	expect(classifyFailure(trpcError('TIMEOUT', 504)).kind).toBe('waiting');
	expect(classifyFailure(trpcError('TOO_MANY_REQUESTS', 429)).kind).toBe('waiting');
	expect(classifyFailure({ shape: { data: { httpStatus: 502 } } }).kind).toBe('waiting');
	// Signed out: not a crash, and not a refusal of the workout
	expect(classifyFailure(trpcError('UNAUTHORIZED', 401, 'Not logged in'))).toMatchObject({ kind: 'signIn' });
	expect(classifyFailure({ shape: { data: { httpStatus: 401 } } }).kind).toBe('signIn');
	// Refused: told in the server's words, except a schema refusal, which after an app update means this
	expect(classifyFailure(trpcError('NOT_FOUND', 404, 'Block not found'))).toEqual({
		kind: 'refused',
		reason: 'Block not found'
	});
	expect(classifyFailure(trpcError('CONFLICT', 409, 'This workout can’t be saved')).kind).toBe('refused');
	expect(classifyFailure(trpcError('BAD_REQUEST', 400, '[{"code":"unrecognized_keys"}]'))).toEqual({
		kind: 'refused',
		reason: 'This workout needs a newer version of the app'
	});
});

test('the waits between tries: 5 s, 15 s, then every minute', () => {
	expect([0, 1, 2, 3, 9].map(retryWaitMs)).toEqual([5000, 5000, 15000, 60000, 60000]);
});

test('an unreadable waiting list is set aside under another key, never overwritten or thrown away', () => {
	for (const broken of ['{"oops"', '{"not":"a list"}', '[{"clientId":"a"}]']) {
		const storage = new FakeStorage();
		storage.items.set(OUTBOX_KEY, broken);
		const read = readOutbox(storage, 1234);
		expect(read).toEqual({ entries: [], unreadable: true });
		expect(storage.items.get(`${OUTBOX_BACKUP_KEY}:1234`)).toBe(broken);
		expect(storage.items.has(OUTBOX_KEY)).toBe(false);
	}
	// A good list reads as it was written, and nothing stored reads as empty
	const storage = new FakeStorage();
	expect(readOutbox(storage)).toEqual({ entries: [], unreadable: false });
	const one = entry('a', '2026-11-13T01:12:00.000Z');
	expect(writeOutbox(storage, [one])).toBe(true);
	expect(readOutbox(storage)).toEqual({ entries: [one], unreadable: false });
	expect(writeOutbox(storage, [])).toBe(true);
	expect(storage.items.has(OUTBOX_KEY)).toBe(false);
});

test('a phone that won’t keep the list says so, and what was there stays', () => {
	const storage = new FakeStorage();
	const one = entry('a', '2026-11-13T01:12:00.000Z');
	expect(writeOutbox(storage, [one])).toBe(true);
	storage.failWrites = true;
	expect(writeOutbox(storage, [one, entry('b', '2026-11-13T05:00:00.000Z')])).toBe(false);
	expect(readOutbox(storage).entries.map((e) => e.clientId)).toEqual(['a']);
});

test('sends oldest first, one at a time; a sent one leaves the list', async () => {
	const storage = new FakeStorage();
	writeOutbox(storage, [entry('late', '2026-11-13T09:00:00.000Z'), entry('early', '2026-11-12T09:00:00.000Z')]);
	const order: string[] = [];
	const result = await runOutbox({
		storage,
		userId: 'me',
		trigger: 'manual',
		send: async (e) => {
			order.push(e.clientId);
			return { ok: true };
		}
	});
	expect(order).toEqual(['early', 'late']);
	expect(result).toMatchObject({ sent: 2, stoppedForSignIn: false, storageFailed: false });
	expect(readOutbox(storage).entries).toEqual([]);
});

test('no answer keeps it waiting for another try; a refusal is kept with its reason, never retried by itself, and doesn’t hold up the next', async () => {
	const storage = new FakeStorage();
	let clock = Date.parse('2026-11-13T10:00:00Z');
	writeOutbox(storage, [
		entry('offline', '2026-11-12T09:00:00.000Z'),
		entry('refused', '2026-11-12T10:00:00.000Z'),
		entry('fine', '2026-11-12T11:00:00.000Z')
	]);
	const send = answers({
		offline: { ok: false, error: new TypeError('Failed to fetch') },
		refused: { ok: false, error: trpcError('NOT_FOUND', 404, 'Block not found') }
	});
	const run = (trigger: 'timer' | 'manual') => runOutbox({ storage, userId: 'me', trigger, send, now: () => clock });
	const first = await run('manual');
	expect(first.sent).toBe(1);
	const [offline, refused] = readOutbox(storage).entries;
	expect(offline).toMatchObject({ clientId: 'offline', state: 'waiting', attempts: 1, lastError: null });
	expect(refused).toMatchObject({ clientId: 'refused', state: 'refused', lastError: 'Block not found' });

	// The timer waits out the first pause, never touches the refused one, and gives up nothing
	const calls: string[] = [];
	const watching = (e: OutboxEntry) => {
		calls.push(e.clientId);
		return send(e);
	};
	clock += 1000;
	await runOutbox({ storage, userId: 'me', trigger: 'timer', send: watching, now: () => clock });
	expect(calls).toEqual([]);
	clock += 5000;
	await runOutbox({ storage, userId: 'me', trigger: 'timer', send: watching, now: () => clock });
	expect(calls).toEqual(['offline']);
	expect(readOutbox(storage).entries.find((e) => e.clientId === 'offline')?.attempts).toBe(2);
});

test('a lapsed sign-in stops the run and waits for the person; the timer leaves it alone, a nudge tries again', async () => {
	const storage = new FakeStorage();
	writeOutbox(storage, [entry('a', '2026-11-12T09:00:00.000Z'), entry('b', '2026-11-12T10:00:00.000Z')]);
	const signedOut = { ok: false as const, error: trpcError('UNAUTHORIZED', 401, 'Not logged in') };
	const calls: string[] = [];
	const send = async (e: OutboxEntry): Promise<SendResult> => {
		calls.push(e.clientId);
		return signedOut;
	};
	const first = await runOutbox({ storage, userId: 'me', trigger: 'start', send });
	expect(first.stoppedForSignIn).toBe(true);
	// Stopped at the first: the second would only fail the same way
	expect(calls).toEqual(['a']);
	expect(readOutbox(storage).entries.map((e) => [e.clientId, e.state])).toEqual([
		['a', 'signIn'],
		['b', 'waiting']
	]);
	calls.length = 0;
	await runOutbox({ storage, userId: 'me', trigger: 'timer', send, now: () => Date.now() + 10 * 60000 });
	expect(calls).toEqual(['b']);
	// Signed in again: the app opening, or Send now, sends it
	calls.length = 0;
	const ok = await runOutbox({ storage, userId: 'me', trigger: 'manual', send: async () => ({ ok: true }) });
	expect(ok.sent).toBe(2);
});

test('another account’s workouts are neither sent nor changed', async () => {
	const storage = new FakeStorage();
	writeOutbox(storage, [
		entry('mine', '2026-11-12T09:00:00.000Z'),
		entry('theirs', '2026-11-12T08:00:00.000Z', { userId: 'someone-else' })
	]);
	const sent: string[] = [];
	await runOutbox({
		storage,
		userId: 'me',
		trigger: 'manual',
		send: async (e) => {
			sent.push(e.clientId);
			return { ok: true };
		}
	});
	expect(sent).toEqual(['mine']);
	expect(readOutbox(storage).entries.map((e) => e.clientId)).toEqual(['theirs']);
});

test('a change another tab made while one was being sent is kept', async () => {
	const storage = new FakeStorage();
	writeOutbox(storage, [entry('a', '2026-11-12T09:00:00.000Z')]);
	await runOutbox({
		storage,
		userId: 'me',
		trigger: 'manual',
		send: async () => {
			// Meanwhile, another tab queued a second workout
			writeOutbox(storage, [...readOutbox(storage).entries, entry('b', '2026-11-12T12:00:00.000Z')]);
			return { ok: true };
		}
	});
	expect(readOutbox(storage).entries.map((e) => e.clientId)).toEqual(['b']);
});

test('a phone that stops taking writes mid-run is reported, and the list is left as it was stored', async () => {
	const storage = new FakeStorage();
	writeOutbox(storage, [entry('a', '2026-11-12T09:00:00.000Z')]);
	storage.failWrites = true;
	const result = await runOutbox({
		storage,
		userId: 'me',
		trigger: 'manual',
		send: async () => ({ ok: false, error: new TypeError('Failed to fetch') })
	});
	expect(result.storageFailed).toBe(true);
	// Still there as it was stored (the failed try isn't recorded, which only means it is tried again sooner)
	expect(readOutbox(storage).entries.map((e) => [e.clientId, e.attempts])).toEqual([['a', 0]]);
});

test('a workout that has waited a day is worth a nudge', () => {
	const one = entry('a', '2026-11-12T09:00:00.000Z', { queuedAt: '2026-11-12T09:00:00.000Z' });
	expect(waitedTooLong(one, Date.parse('2026-11-13T08:59:00Z'))).toBe(false);
	expect(waitedTooLong(one, Date.parse('2026-11-13T09:00:00Z'))).toBe(true);
});

test('Copy details: a readable text to retype, with skipped sets, cardio, mini-sets and a note', () => {
	const base = request('a', '2026-11-13T09:12:00');
	const text = workoutSummaryText(
		{
			label: 'Pull B',
			request: {
				...base,
				workoutData: {
					...base.workoutData,
					startedAt: '2026-11-13T09:12:00',
					endedAt: '2026-11-13T10:04:00',
					note: 'Hotel gym'
				},
				workoutExercises: [{ name: 'Barbell rows' }, { name: 'Face pulls' }, { name: 'Run' }],
				workoutExercisesSets: [
					[
						{ reps: 10, load: 40, RIR: 2, skipped: false },
						{ reps: 9, load: 40, RIR: 1, skipped: false },
						{ reps: 0, load: 0, RIR: 0, skipped: true }
					],
					[{ reps: 15, load: 15, RIR: 2, skipped: false }],
					[{ reps: 0, load: 0, RIR: 0, skipped: false, timeSeconds: 1565, distanceMeters: 5000 }]
				],
				workoutExercisesMiniSets: [[[], [{ reps: 4, load: 35, RIR: 0 }], []], [[]], [[]]]
			}
		},
		'en-US'
	);
	expect(text).toBe(
		[
			'Pull B, Fri, Nov 13, 2026, 09:12, 52 min, bodyweight 80 kg',
			'',
			'Barbell rows',
			'  1: 10 x 40 kg, RIR 2',
			'  2: 9 x 40 kg, RIR 1',
			'    mini-set 1: 4 x 35 kg, RIR 0',
			'  3: skipped',
			'',
			'Face pulls',
			'  1: 15 x 15 kg, RIR 2',
			'',
			'Run',
			'  1: 26:05, 5000 m',
			'',
			'Note: Hotel gym'
		].join('\n')
	);
});

test('Copy details shows each exercise in its own unit: kg, lb, or a machine’s level', () => {
	const base = request('a', '2026-11-13T09:12:00');
	const text = workoutSummaryText({
		label: 'Machines',
		request: {
			...base,
			workoutExercises: [
				{ name: 'Chest press', weightUnit: 'LEVEL' },
				{ name: 'Curls', weightUnit: 'LB' },
				{ name: 'Rows', weightUnit: 'KG' }
			],
			workoutExercisesSets: [
				[{ reps: 12, load: 8, RIR: 2, skipped: false }],
				[{ reps: 10, load: 13.6078, RIR: 1, skipped: false }],
				[{ reps: 8, load: 40, RIR: 0, skipped: false }]
			],
			workoutExercisesMiniSets: [[[{ reps: 5, load: 7, RIR: 0 }]], [[]], [[]]]
		}
	});
	expect(text).toContain('  1: 12 x level 8, RIR 2');
	expect(text).toContain('mini-set 1: 5 x level 7, RIR 0');
	expect(text).toContain('  1: 10 x 30 lb, RIR 1');
	expect(text).toContain('  1: 8 x 40 kg, RIR 0');
	expect(text).not.toMatch(/level 8 kg|8 kg/);
});

test('updating the app keeps the waiting workouts and their backups, and clears the rest', () => {
	const store = new FakeStorage();
	store.items.set('workoutOutbox:v1', '[{"clientId":"a"}]');
	store.items.set('workoutOutbox:backup:123', 'unreadable');
	store.items.set('workoutRunes', '{}');
	store.items.set('theme', 'dark');
	const asStorage = {
		get length() {
			return store.items.size;
		},
		key: (i: number) => [...store.items.keys()][i] ?? null,
		getItem: (key: string) => store.items.get(key) ?? null,
		setItem: (key: string, value: string) => void store.items.set(key, value),
		clear: () => store.items.clear()
	};
	clearStorageForUpdate(asStorage);
	expect([...store.items.keys()].sort()).toEqual(['workoutOutbox:backup:123', 'workoutOutbox:v1', 'workoutRunes']);
	expect(store.items.get('workoutOutbox:v1')).toBe('[{"clientId":"a"}]');
});
