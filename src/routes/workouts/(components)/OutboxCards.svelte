<script lang="ts">
	import ResponsiveDialog from '$lib/components/ResponsiveDialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import { formatWorkoutDate } from '$lib/utils/calendarDays';
	import type { OutboxEntry } from '$lib/utils/outbox';
	import { formatWorkoutLength } from '$lib/utils/workoutLength';
	import { workoutOutbox } from '$lib/workoutOutbox.svelte';
	import { toast } from 'svelte-sonner';

	/**
	 * The workouts still waiting on this phone, at the top of the Workouts list: "Not sent yet" with Send now,
	 * or "Couldn't be sent" with the reason and Retry, Discard and Copy details. Each shows its date, name,
	 * length and number of sets (not its volume: that is worked out on the server)
	 */
	let discarding: OutboxEntry | null = $state(null);
	let discardOpen = $state(false);
	// The text, when the phone wouldn't copy it: to select by hand
	let shownText: { clientId: string; text: string } | null = $state(null);

	const setCount = (entry: OutboxEntry) =>
		entry.request.workoutExercisesSets.reduce((total, sets) => total + sets.filter((set) => !set.skipped).length, 0);

	async function copy(entry: OutboxEntry) {
		const result = await workoutOutbox.copyDetails(entry.clientId);
		if (result.copied) {
			toast.success('Copied');
			shownText = null;
		} else {
			toast.error("Couldn't copy: the text is shown to select");
			shownText = { clientId: entry.clientId, text: result.text };
		}
	}

	function askDiscard(entry: OutboxEntry) {
		discarding = entry;
		discardOpen = true;
	}

	function discard() {
		if (discarding) workoutOutbox.discard(discarding.clientId);
		discarding = null;
		discardOpen = false;
		toast.success('Workout discarded');
	}
</script>

{#each workoutOutbox.entries as entry (entry.clientId)}
	{@const refused = entry.state === 'refused'}
	<div
		class="flex flex-col gap-0.5 rounded-md border bg-card p-2 {refused ? 'border-destructive' : 'border-primary'}"
		data-state={entry.state}
		data-testid="outbox-card"
	>
		<span class="flex items-baseline justify-between gap-2">
			<span class="whitespace-nowrap text-lg font-semibold">
				{formatWorkoutDate(entry.request.workoutData.startedAt ?? entry.queuedAt)}
			</span>
			<span class="flex min-w-0 items-center gap-1 text-muted-foreground">
				<span
					class="shrink-0 whitespace-nowrap rounded-full border px-1.5 text-xs {refused
						? 'border-destructive text-destructive'
						: 'border-primary text-primary'}"
					data-testid="outbox-card-tag"
				>
					{refused ? "Couldn't be sent" : entry.state === 'signIn' ? 'Sign in to send' : 'Not sent yet'}
				</span>
				<span class="truncate" data-testid="outbox-card-name">{entry.label}</span>
			</span>
		</span>
		<span class="flex gap-4 text-sm text-muted-foreground">
			<span>
				{formatWorkoutLength(
					entry.request.workoutData.startedAt ?? entry.queuedAt,
					entry.request.workoutData.endedAt ?? entry.queuedAt
				)}
			</span>
			<span data-testid="outbox-card-sets">
				<span class="font-medium text-foreground">{setCount(entry)}</span>
				{setCount(entry) === 1 ? 'set' : 'sets'}
			</span>
		</span>
		{#if refused && entry.lastError}
			<span class="text-sm" data-testid="outbox-card-reason">{entry.lastError}</span>
		{/if}
		<div class="mt-1 flex flex-wrap gap-2">
			{#if refused}
				<Button
					class="h-8"
					disabled={workoutOutbox.sending}
					onclick={() => workoutOutbox.retry(entry.clientId)}
					size="sm"
					variant="outline"
				>
					Retry
				</Button>
				<Button
					class="h-8 text-destructive hover:text-destructive"
					onclick={() => askDiscard(entry)}
					size="sm"
					variant="outline"
				>
					Discard
				</Button>
				<Button class="h-8" onclick={() => copy(entry)} size="sm" variant="outline">Copy details</Button>
			{:else}
				<Button class="h-8" disabled={workoutOutbox.sending} onclick={() => workoutOutbox.send('manual')} size="sm">
					Send now
				</Button>
			{/if}
		</div>
		{#if shownText?.clientId === entry.clientId}
			<textarea
				class="mt-1 h-40 w-full rounded-md border bg-background p-2 font-mono text-xs"
				data-testid="outbox-card-text"
				readonly
				value={shownText.text}
			></textarea>
		{/if}
	</div>
{/each}

<ResponsiveDialog cancelLabel="Cancel" title="Discard this workout?" bind:open={discardOpen}>
	{#snippet description()}
		{#if discarding}
			{formatWorkoutDate(discarding.request.workoutData.startedAt ?? discarding.queuedAt)}, {discarding.label}
			({formatWorkoutLength(
				discarding.request.workoutData.startedAt ?? discarding.queuedAt,
				discarding.request.workoutData.endedAt ?? discarding.queuedAt
			)}) was never saved to your account. Discarding deletes it from this phone for good.
		{/if}
	{/snippet}
	<Button data-testid="outbox-discard-confirm" onclick={discard} variant="destructive">Discard</Button>
</ResponsiveDialog>
