/**
 * The workouts waiting on this phone to be sent, and the sending. The rules are in $lib/utils/outbox.ts; this
 * keeps the list where screens can follow it, and sends it while the app is open (there is no sending
 * while the app is closed). Only the signed-in account's workouts are shown or sent
 */
import { browser } from '$app/environment';
import { invalidate } from '$app/navigation';
import { toast } from 'svelte-sonner';
import { trpc } from '$lib/trpc/client';
import type { RouterInputs } from '$lib/trpc/router';
import {
	byStartedAt,
	readOutbox,
	retryWaitMs,
	runOutbox,
	workoutSummaryText,
	writeOutbox,
	type OutboxEntry,
	type RunTrigger,
	type SendResult
} from '$lib/utils/outbox';

/** A send that gets no answer by then is treated as no connection (the id makes a late answer harmless) */
export const SEND_TIMEOUT_MS = 15000;

export function withTimeout<T>(promise: Promise<T>, ms = SEND_TIMEOUT_MS): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error('No answer from the server')), ms);
		promise.then(
			(value) => {
				clearTimeout(timer);
				resolve(value);
			},
			(error) => {
				clearTimeout(timer);
				reject(error);
			}
		);
	});
}

function createWorkoutOutbox() {
	let all: OutboxEntry[] = $state([]);
	let userId: string | null = $state(null);
	let sending = $state(false);
	let signOutQuestionOpen = $state(false);
	let unreadableNoticeShown = false;

	function load() {
		if (!browser) return;
		const read = readOutbox(localStorage);
		all = read.entries;
		if (read.unreadable && !unreadableNoticeShown) {
			unreadableNoticeShown = true;
			toast.error("The workouts waiting to be sent couldn't be opened. They were kept aside as a backup");
		}
	}

	/** This account's, oldest first */
	const mine = $derived(userId === null ? [] : all.filter((entry) => entry.userId === userId).sort(byStartedAt));

	async function send(trigger: RunTrigger): Promise<{ sent: number; stillWaiting: number }> {
		if (!browser || userId === null || sending) return { sent: 0, stillWaiting: mine.length };
		// The timer and the "back online" nudges skip a phone that knows it has no connection
		if (trigger !== 'manual' && trigger !== 'beforeStart' && navigator.onLine === false) {
			return { sent: 0, stillWaiting: mine.length };
		}
		const account = userId;
		sending = true;
		let sent = 0;
		const outsideBlock: string[] = [];
		try {
			const run = () =>
				runOutbox({
					storage: localStorage,
					userId: account,
					trigger,
					onChange: (entries) => (all = entries),
					send: async (entry): Promise<SendResult> => {
						try {
							const answer = await withTimeout(
								trpc().workouts.create.mutate({
									...entry.request,
									ifBlockGone: 'saveOutsideBlock'
								} as RouterInputs['workouts']['create'])
							);
							if (answer.savedOutsideBlock) outsideBlock.push(entry.label);
							return { ok: true };
						} catch (error) {
							return { ok: false, error };
						}
					}
				});
			// One tab sends at a time (another tab's turn simply finds nothing due)
			const result = navigator.locks
				? await navigator.locks.request('workoutOutbox', { ifAvailable: true }, async (lock) => (lock ? run() : null))
				: await run();
			sent = result?.sent ?? 0;
		} finally {
			sending = false;
			load();
		}
		if (sent > 0) {
			toast.success(sent === 1 ? 'Workout sent' : `${sent} workouts sent`);
			for (const label of outsideBlock) {
				toast.info(`${label} was saved outside its block: the block was deleted while it waited`);
			}
			await invalidate('workouts:all');
		}
		return { sent, stillWaiting: mine.filter((entry) => entry.state !== 'refused').length };
	}

	return {
		get entries() {
			return mine;
		},
		get sending() {
			return sending;
		},
		/** Waiting to be sent (not refused) */
		get waiting() {
			return mine.filter((entry) => entry.state !== 'refused');
		},
		get refused() {
			return mine.filter((entry) => entry.state === 'refused');
		},
		/** How many workouts wait on this phone, of any account: signing out clears them all */
		get everythingWaiting() {
			return all.length;
		},
		/** The question asked before signing out with workouts waiting */
		get signOutQuestionOpen() {
			return signOutQuestionOpen;
		},
		set signOutQuestionOpen(value: boolean) {
			signOutQuestionOpen = value;
		},
		setUser(id: string | null) {
			userId = id;
			load();
		},
		load,
		/** Puts a finished workout on the list; false if the phone wouldn't keep it: then it must stay where it is */
		add(entry: OutboxEntry): boolean {
			if (!browser) return false;
			const stored = readOutbox(localStorage).entries.filter((existing) => existing.clientId !== entry.clientId);
			const next = [...stored, entry];
			if (!writeOutbox(localStorage, next)) return false;
			all = next;
			// A first try after the first pause (5 s): a send whose answer was lost, with the connection fine, shouldn't
			// wait for the minute's timer. A phone with no connection skips it
			setTimeout(() => void send('timer'), retryWaitMs(1) + 100);
			return true;
		},
		send,
		/** Another try for a refused or waiting one, now */
		async retry(clientId: string) {
			const next = readOutbox(localStorage).entries.map((entry) =>
				entry.clientId === clientId
					? { ...entry, state: 'waiting' as const, attempts: 0, lastAttemptAt: null, lastError: null }
					: entry
			);
			if (writeOutbox(localStorage, next)) all = next;
			return send('manual');
		},
		discard(clientId: string) {
			const next = readOutbox(localStorage).entries.filter((entry) => entry.clientId !== clientId);
			if (writeOutbox(localStorage, next)) all = next;
		},
		/** The workout as text to retype; on a phone that won't copy, the text itself (to show) */
		async copyDetails(clientId: string): Promise<{ copied: boolean; text: string }> {
			const entry = readOutbox(localStorage).entries.find((candidate) => candidate.clientId === clientId);
			const text = entry ? workoutSummaryText(entry) : '';
			try {
				await navigator.clipboard.writeText(text);
				return { copied: true, text };
			} catch {
				return { copied: false, text };
			}
		},
		has(clientId: string) {
			return all.some((entry) => entry.clientId === clientId);
		}
	};
}

export const workoutOutbox = createWorkoutOutbox();
