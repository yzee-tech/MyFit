<script lang="ts">
	import { page } from '$app/stores';
	import { signOut } from '@auth/sveltekit/client';
	import ResponsiveDialog from '$lib/components/ResponsiveDialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import { waitedTooLong } from '$lib/utils/outbox';
	import { workoutOutbox } from '$lib/workoutOutbox.svelte';
	import { onMount } from 'svelte';
	import SendIcon from 'virtual:icons/lucide/send';
	import { workoutRunes } from '../../../routes/workouts/manage/workoutRunes.svelte';

	/**
	 * Keeps the workouts waiting on this phone going out while the app is open (when it starts, when the
	 * connection is back, when the app comes back to the screen, and every minute), and says so at the bottom
	 * of every screen but the Workouts list, which shows each one
	 */
	let session = $derived($page.data.session as { user?: { id?: string }; userId?: string } | null | undefined);
	let userId = $derived(session?.user?.id ?? session?.userId ?? null);
	$effect(() => workoutOutbox.setUser(userId));

	let waiting = $derived(workoutOutbox.waiting);
	let refused = $derived(workoutOutbox.refused);
	let needsSignIn = $derived(waiting.some((entry) => entry.state === 'signIn'));
	let late = $derived(waiting.some((entry) => waitedTooLong(entry)));
	let onWorkoutsList = $derived($page.url.pathname === '/workouts');

	onMount(() => {
		// A workout that is already on the list but still in progress here (the app was closed in between): the list has it
		const clientId = workoutRunes.workoutData?.clientId;
		if (clientId && workoutOutbox.has(clientId)) workoutRunes.resetStores();
		void workoutOutbox.send('start');
		const online = () => void workoutOutbox.send('online');
		const visible = () => {
			if (document.visibilityState === 'visible') void workoutOutbox.send('visible');
		};
		// Another tab changed the list
		const changed = (event: StorageEvent) => {
			if (event.key === null || event.key.startsWith('workoutOutbox')) workoutOutbox.load();
		};
		const timer = setInterval(() => {
			if (workoutOutbox.waiting.length > 0) void workoutOutbox.send('timer');
		}, 60000);
		window.addEventListener('online', online);
		window.addEventListener('storage', changed);
		document.addEventListener('visibilitychange', visible);
		return () => {
			clearInterval(timer);
			window.removeEventListener('online', online);
			window.removeEventListener('storage', changed);
			document.removeEventListener('visibilitychange', visible);
		};
	});
</script>

<!-- Asked before signing out with workouts waiting: signing out clears everything stored on this phone -->
<ResponsiveDialog cancelLabel="Cancel" title="Sign out?" bind:open={workoutOutbox.signOutQuestionOpen}>
	{#snippet description()}
		{workoutOutbox.everythingWaiting === 1
			? "1 workout hasn't been sent yet. Signing out deletes it from this phone for good."
			: `${workoutOutbox.everythingWaiting} workouts haven't been sent yet. Signing out deletes them from this phone for good.`}
	{/snippet}
	<Button
		data-testid="sign-out-anyway"
		onclick={() => {
			signOut();
			localStorage.clear();
		}}
		variant="destructive"
	>
		Sign out anyway
	</Button>
</ResponsiveDialog>

{#if userId && !onWorkoutsList && (waiting.length > 0 || refused.length > 0)}
	<div class="mx-auto w-full max-w-2xl shrink-0 px-2 pb-2">
		<div
			class="flex items-center gap-2 rounded-2xl border bg-card p-2 shadow-lg {late || refused.length > 0
				? 'border-destructive'
				: ''}"
			data-testid="outbox-bar"
			role="status"
		>
			<SendIcon class="ml-2 h-5 w-5 shrink-0 text-muted-foreground" />
			<span class="min-w-0 grow text-sm" data-testid="outbox-bar-text">
				{#if waiting.length > 0}
					{waiting.length === 1 ? '1 workout waiting to send' : `${waiting.length} workouts waiting to send`}
					{#if needsSignIn}
						<span class="text-muted-foreground"> · sign in to send</span>
					{:else if late}
						<span class="text-destructive"> · waiting over a day</span>
					{/if}
				{:else}
					{refused.length === 1 ? '1 workout couldn’t be sent' : `${refused.length} workouts couldn’t be sent`}
				{/if}
			</span>
			{#if waiting.length > 0}
				<Button
					disabled={workoutOutbox.sending}
					data-testid="outbox-bar-send"
					onclick={() => workoutOutbox.send('manual')}
					size="sm"
					variant="secondary"
				>
					Send now
				</Button>
			{:else}
				<Button href="/workouts" size="sm" variant="secondary">See it</Button>
			{/if}
		</div>
	</div>
{/if}
