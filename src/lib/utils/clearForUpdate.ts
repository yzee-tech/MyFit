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
	'routineEditor',
	'routineEditor:backup'
];

/** Prefix of the waiting list and its backups (see $lib/utils/outbox.ts) */
const KEPT_PREFIX = 'workoutOutbox:';

type ClearableStorage = Pick<Storage, 'removeItem' | 'key' | 'length'>;

/**
 * Removes everything except the kept keys, one removal at a time. The kept keys are never rewritten, so a
 * failed write can no longer lose a workout in progress or the waiting list, and a failed removal throws so
 * the caller can abort the update instead of updating on top of half-cleaned storage
 */
export function clearStorageForUpdate(storage: ClearableStorage) {
	const keys: string[] = [];
	for (let i = 0; i < storage.length; i++) {
		const key = storage.key(i);
		if (key !== null) keys.push(key);
	}
	for (const key of keys) {
		if ((KEPT_ON_UPDATE as readonly string[]).includes(key) || key.startsWith(KEPT_PREFIX)) continue;
		storage.removeItem(key);
	}
}
