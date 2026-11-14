/**
 * What "Update app" clears from the phone's storage, and what it keeps: a workout in progress, a routine being
 * edited, and every workout still waiting to be sent (those exist only on this phone) with its backups
 */
export const KEPT_ON_UPDATE = [
	'myfit_terms_accepted',
	'discord-dismiss',
	'domain-move-dismiss',
	'last-used-auth-provider',
	'workoutRunes',
	'workoutRunes:backup',
	'routineEditor'
];

/** Prefix of the waiting list and its backups (see $lib/utils/outbox.ts) */
const KEPT_PREFIX = 'workoutOutbox:';

type ClearableStorage = Pick<Storage, 'getItem' | 'setItem' | 'clear' | 'key' | 'length'>;

export function clearStorageForUpdate(storage: ClearableStorage) {
	const keys = [...KEPT_ON_UPDATE];
	for (let i = 0; i < storage.length; i++) {
		const key = storage.key(i);
		if (key?.startsWith(KEPT_PREFIX)) keys.push(key);
	}
	const kept = new Map<string, string>();
	for (const key of keys) {
		const value = storage.getItem(key);
		if (value !== null) kept.set(key, value);
	}
	storage.clear();
	for (const [key, value] of kept) storage.setItem(key, value);
}
