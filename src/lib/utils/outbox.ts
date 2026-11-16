/**
 * The waiting list for workouts saved with no usable connection: the rules, with no screens in them. A
 * workout waits on the phone (localStorage) as exactly the request the server takes, with its own id, and is
 * sent when the app is open and online. Sending it twice saves it once (the server checks the id).
 * The reactive store and the sender are in $lib/workoutOutbox.svelte.ts
 */
import type { WeightUnit } from './prismaEnums';
import { fromKg, isLevelUnit, unitLabel } from './weightUnits';
import { blankWorkoutName } from './workoutNames';

export const OUTBOX_KEY = 'workoutOutbox:v1';
/** Where a waiting list that can't be read is set aside, never overwritten (the time is added) */
export const OUTBOX_BACKUP_KEY = 'workoutOutbox:backup';

export type OutboxState = 'waiting' | 'signIn' | 'refused';

/** The request a workout is sent with: what workouts.create takes. Kept loose: it is stored, and sent after app updates */
export type OutboxRequest = {
	clientId: string;
	timeZone?: string;
	workoutData: {
		startedAt?: string | Date;
		endedAt?: string | Date;
		routineName?: string | null;
		userBodyweight: number;
		note?: string;
		countsForProgression?: boolean;
		workoutOfMesocycle?: { mesocycle: { id: string }; splitDayName?: string };
	};
	workoutExercises: { name: string; weightUnit?: WeightUnit | null }[];
	workoutExercisesSets: OutboxSet[][];
	workoutExercisesMiniSets: OutboxSet[][][];
	ifBlockGone?: 'saveOutsideBlock';
};

type OutboxSet = {
	reps?: number;
	load?: number;
	RIR?: number;
	skipped?: boolean;
	timeSeconds?: number | null;
	distanceMeters?: number | null;
};

export type OutboxEntry = {
	clientId: string;
	/** The account it belongs to: only that account's entries are sent or shown */
	userId: string;
	queuedAt: string;
	request: OutboxRequest;
	/** What it is called on screen: its routine, or a blank workout's time-of-day name */
	label: string;
	state: OutboxState;
	attempts: number;
	lastAttemptAt: string | null;
	lastError: string | null;
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const STATES: readonly string[] = ['waiting', 'signIn', 'refused'];

function isEntry(value: unknown): value is OutboxEntry {
	if (typeof value !== 'object' || value === null) return false;
	const entry = value as Record<string, unknown>;
	return (
		typeof entry.clientId === 'string' &&
		typeof entry.userId === 'string' &&
		typeof entry.queuedAt === 'string' &&
		typeof entry.label === 'string' &&
		typeof entry.state === 'string' &&
		STATES.includes(entry.state) &&
		typeof entry.attempts === 'number' &&
		typeof entry.request === 'object' &&
		entry.request !== null &&
		Array.isArray((entry.request as OutboxRequest).workoutExercises) &&
		typeof (entry.request as OutboxRequest).workoutData === 'object'
	);
}

/** The waiting list; if what's stored can't be read it is set aside under another key (unreadable: true), never thrown away */
export function readOutbox(storage: StorageLike, now = Date.now()): { entries: OutboxEntry[]; unreadable: boolean } {
	let raw: string | null = null;
	try {
		raw = storage.getItem(OUTBOX_KEY);
	} catch {
		return { entries: [], unreadable: false };
	}
	if (!raw) return { entries: [], unreadable: false };
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed) || !parsed.every(isEntry)) throw new Error();
		return { entries: parsed, unreadable: false };
	} catch {
		try {
			storage.setItem(`${OUTBOX_BACKUP_KEY}:${now}`, raw);
			storage.removeItem(OUTBOX_KEY);
		} catch {
			// Kept where it is: nothing is overwritten
		}
		return { entries: [], unreadable: true };
	}
}

/** Stores the waiting list; false if the phone wouldn't take it (private mode, full storage): then nothing may be cleared */
export function writeOutbox(storage: StorageLike, entries: OutboxEntry[]): boolean {
	try {
		if (entries.length === 0) storage.removeItem(OUTBOX_KEY);
		else storage.setItem(OUTBOX_KEY, JSON.stringify(entries));
		return true;
	} catch {
		return false;
	}
}

/** The oldest workout first */
export function byStartedAt(a: OutboxEntry, b: OutboxEntry): number {
	return (
		new Date(a.request.workoutData.startedAt ?? a.queuedAt).getTime() -
		new Date(b.request.workoutData.startedAt ?? b.queuedAt).getTime()
	);
}

export type FailureKind = 'waiting' | 'signIn' | 'refused';

/**
 * What a failed send means, from what the browser got: no answer, a 5xx or a timeout means try again
 * later (the id makes that safe); 401 means signed out; any other answer is a refusal. A zod refusal
 * after an app update is told as such
 */
export function classifyFailure(error: unknown): { kind: FailureKind; reason: string } {
	const e = error as {
		shape?: { message?: string; data?: { code?: string; httpStatus?: number } } | null;
		data?: { code?: string; httpStatus?: number } | null;
		message?: string;
	} | null;
	const data = e?.shape?.data ?? e?.data ?? undefined;
	if (!e?.shape && !data) return { kind: 'waiting', reason: 'No answer from the server' };
	const status = data?.httpStatus;
	const code = data?.code;
	if (code === 'UNAUTHORIZED' || status === 401) return { kind: 'signIn', reason: 'Sign in to send it' };
	if (
		(status !== undefined && status >= 500) ||
		code === 'INTERNAL_SERVER_ERROR' ||
		code === 'TIMEOUT' ||
		code === 'TOO_MANY_REQUESTS' ||
		code === 'CLIENT_CLOSED_REQUEST' ||
		status === 408 ||
		status === 429
	) {
		return { kind: 'waiting', reason: 'The server had a problem' };
	}
	if (code === 'BAD_REQUEST') return { kind: 'refused', reason: 'This workout needs a newer version of the app' };
	return { kind: 'refused', reason: e?.shape?.message || e?.message || 'The server refused it' };
}

/** How long to wait before the next try, by the number of tries so far: 5 s, 15 s, then every minute */
export function retryWaitMs(attempts: number): number {
	if (attempts <= 1) return 5000;
	if (attempts === 2) return 15000;
	return 60000;
}

export type SendResult = { ok: true } | { ok: false; error: unknown };

export type RunTrigger = 'timer' | 'start' | 'online' | 'visible' | 'manual' | 'beforeStart';

/**
 * Sends what is waiting for one account, oldest first, one at a time, and stores the result of each step.
 * Returns the new list. A lapsed sign-in stops the run (the rest would fail the same); a refusal doesn't.
 * The timer leaves entries that wait on a sign-in alone and entries not yet due
 */
export async function runOutbox(options: {
	storage: StorageLike;
	userId: string;
	trigger: RunTrigger;
	send: (entry: OutboxEntry) => Promise<SendResult>;
	now?: () => number;
	/** Called with the waiting list after each step, so a screen can follow */
	onChange?: (entries: OutboxEntry[]) => void;
}): Promise<{ entries: OutboxEntry[]; sent: number; stoppedForSignIn: boolean; storageFailed: boolean }> {
	const now = options.now ?? Date.now;
	let { entries } = readOutbox(options.storage, now());
	let sent = 0;
	let stoppedForSignIn = false;
	let storageFailed = false;
	const mine = entries.filter((entry) => entry.userId === options.userId).sort(byStartedAt);
	for (const first of mine) {
		const entry = entries.find((candidate) => candidate.clientId === first.clientId);
		if (!entry || entry.state === 'refused') continue;
		const forced = options.trigger !== 'timer';
		if (entry.state === 'signIn' && !forced) continue;
		const due =
			entry.lastAttemptAt === null || now() - new Date(entry.lastAttemptAt).getTime() >= retryWaitMs(entry.attempts);
		if (!forced && !due) continue;

		const result = await options.send(entry);
		if (result.ok) {
			entries = entries.filter((candidate) => candidate.clientId !== entry.clientId);
			sent += 1;
		} else {
			const failure = classifyFailure(result.error);
			entries = entries.map((candidate) =>
				candidate.clientId === entry.clientId
					? {
							...candidate,
							state: failure.kind,
							attempts: candidate.attempts + 1,
							lastAttemptAt: new Date(now()).toISOString(),
							lastError: failure.kind === 'waiting' ? null : failure.reason
						}
					: candidate
			);
			if (failure.kind === 'signIn') stoppedForSignIn = true;
		}
		// Re-read before writing: another tab may have added or removed one meanwhile
		const stored = readOutbox(options.storage, now()).entries;
		const merged = mergeStep(stored, entries, entry.clientId, result.ok);
		if (!writeOutbox(options.storage, merged)) storageFailed = true;
		entries = merged;
		options.onChange?.(entries);
		if (stoppedForSignIn) break;
	}
	return { entries, sent, stoppedForSignIn, storageFailed };
}

/** The stored list with just this one entry's step applied (removed if sent, else updated in place): other tabs' changes stay */
function mergeStep(stored: OutboxEntry[], updated: OutboxEntry[], clientId: string, removed: boolean): OutboxEntry[] {
	if (removed) return stored.filter((entry) => entry.clientId !== clientId);
	const next = updated.find((entry) => entry.clientId === clientId);
	if (!next) return stored;
	return stored.some((entry) => entry.clientId === clientId)
		? stored.map((entry) => (entry.clientId === clientId ? next : entry))
		: [...stored, next];
}

/** A workout's name as shown for a waiting entry */
export function outboxLabel(request: OutboxRequest): string {
	return (
		request.workoutData.routineName ??
		request.workoutData.workoutOfMesocycle?.splitDayName ??
		blankWorkoutName(request.workoutData.startedAt ?? new Date())
	);
}

/** Whether a waiting workout has waited long enough to be worth a nudge (24 hours) */
export function waitedTooLong(entry: OutboxEntry, now = Date.now()): boolean {
	return now - new Date(entry.queuedAt).getTime() >= 24 * 3600 * 1000;
}

function two(n: number) {
	return String(n).padStart(2, '0');
}

/**
 * A waiting workout as plain text to retype by hand: for a person, not an import. Loads are in the exercise's unit (kg, lb or a machine's level),
 * the date and time in the phone's language
 */
export function workoutSummaryText(entry: Pick<OutboxEntry, 'label' | 'request'>, locale?: string): string {
	const { request } = entry;
	const started = new Date(request.workoutData.startedAt ?? Date.now());
	const ended = new Date(request.workoutData.endedAt ?? started);
	const minutes = Math.max(0, Math.round((ended.getTime() - started.getTime()) / 60000));
	const day = started.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
	const lines = [
		`${entry.label}, ${day}, ${two(started.getHours())}:${two(started.getMinutes())}, ${minutes} min, bodyweight ${request.workoutData.userBodyweight} kg`
	];
	const setLine = (index: number, set: OutboxSet, indent: string, unit: WeightUnit | null | undefined) => {
		const label = `${indent}${index + 1}:`;
		if (set.skipped) return `${label} skipped`;
		const hasCardio = set.timeSeconds !== undefined && set.timeSeconds !== null;
		if (hasCardio) {
			const seconds = set.timeSeconds as number;
			const time = `${Math.floor(seconds / 60)}:${two(seconds % 60)}`;
			const distance =
				set.distanceMeters !== undefined && set.distanceMeters !== null ? `, ${set.distanceMeters} m` : '';
			const level = set.load ? `, level ${set.load}` : '';
			return `${label} ${time}${distance}${level}`;
		}
		const load = set.load ?? 0;
		// Loads are stored in kg and shown in the exercise's unit; a machine's level is a number, not a weight
		const shown = isLevelUnit(unit)
			? `level ${load}`
			: `${Math.round(fromKg(load, unit ?? 'KG') * 100) / 100} ${unitLabel(unit ?? 'KG')}`;
		return `${label} ${set.reps ?? 0} x ${shown}, RIR ${set.RIR ?? 0}`;
	};
	request.workoutExercises.forEach((exercise, exerciseIndex) => {
		lines.push('', exercise.name);
		(request.workoutExercisesSets[exerciseIndex] ?? []).forEach((set, setIndex) => {
			lines.push(setLine(setIndex, set, '  ', exercise.weightUnit));
			(request.workoutExercisesMiniSets[exerciseIndex]?.[setIndex] ?? []).forEach((mini, miniIndex) => {
				lines.push(setLine(miniIndex, mini, '    mini-set ', exercise.weightUnit));
			});
		});
	});
	if (request.workoutData.note) lines.push('', `Note: ${request.workoutData.note}`);
	return lines.join('\n');
}
