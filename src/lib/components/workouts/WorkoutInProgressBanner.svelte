<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import ResponsiveDialog from '$lib/components/ResponsiveDialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import { formatWorkoutLength, workoutMinutes } from '$lib/utils/workoutLength';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { workoutRunes } from '../../../routes/workouts/manage/workoutRunes.svelte';

	/** After this long, a workout most likely wasn't finished: ask to finish or discard it */
	const NUDGE_AFTER_MINUTES = 2 * 60;

	// Shown on every page when signed in, except the workout's own pages
	let onWorkoutPages = $derived($page.url.pathname.startsWith('/workouts/manage'));
	let signedIn = $derived(Boolean($page.data.session?.user));

	// A workout started (or a past one being edited) and not saved yet. It lives on this device only
	let inProgress = $derived(workoutRunes.workoutData !== null && workoutRunes.workoutExercises !== null);
	let editing = $derived(workoutRunes.editingWorkoutId !== null);
	let label = $derived(
		editing
			? 'Editing a past workout'
			: (workoutRunes.workoutData?.routineName ??
					workoutRunes.workoutData?.workoutOfMesocycle?.splitDayName ??
					'Blank workout')
	);

	let now = $state(new Date());
	onMount(() => {
		const timer = setInterval(() => (now = new Date()), 30000);
		return () => clearInterval(timer);
	});
	let startedAt = $derived(workoutRunes.workoutData?.startedAt ?? null);
	let minutesSinceStart = $derived(startedAt === null || editing ? null : workoutMinutes(startedAt, now));
	let nudge = $derived(minutesSinceStart !== null && minutesSinceStart >= NUDGE_AFTER_MINUTES);
	let sinceStart = $derived(startedAt === null ? '' : formatWorkoutLength(startedAt, now));

	let discardOpen = $state(false);

	function discard() {
		workoutRunes.resetStores();
		discardOpen = false;
		toast.success('Workout discarded');
	}
</script>

{#if inProgress && signedIn && !onWorkoutPages}
	<div
		class="mb-2 flex shrink-0 items-center gap-2 rounded-lg border bg-card p-3 {nudge
			? 'border-destructive'
			: 'border-primary'}"
		data-testid="workout-in-progress"
		role="status"
	>
		<div class="mr-auto flex min-w-0 flex-col">
			{#if nudge}
				<span class="text-sm font-semibold" data-testid="workout-in-progress-nudge">
					{`${label} was started ${sinceStart} ago. Finish or discard it?`}
				</span>
			{:else}
				<span class="text-sm font-semibold">Workout in progress</span>
				<span class="truncate text-sm text-muted-foreground">
					{minutesSinceStart === null ? label : `${label} · started ${sinceStart} ago`}
				</span>
			{/if}
		</div>
		<Button onclick={() => (discardOpen = true)} size="sm" variant="ghost">Discard</Button>
		{#if nudge}
			<Button onclick={() => goto('/workouts/manage/exercises?keepCurrent&finish')} size="sm">Finish now</Button>
		{:else}
			<Button onclick={() => goto('/workouts/manage/exercises?keepCurrent')} size="sm">Continue</Button>
		{/if}
	</div>

	<ResponsiveDialog title="Discard this workout?" bind:open={discardOpen}>
		{#snippet description()}
			Everything entered for {label} is cleared. This can't be undone.
		{/snippet}
		<Button onclick={discard} variant="destructive">Yes, discard</Button>
	</ResponsiveDialog>
{/if}
