<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import ResponsiveDialog from '$lib/components/ResponsiveDialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import { formatWorkoutClock, formatWorkoutLength, workoutMinutes } from '$lib/utils/workoutLength';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import ChevronUpIcon from 'virtual:icons/lucide/chevron-up';
	import TrashIcon from 'virtual:icons/lucide/trash-2';
	import { workoutRunes } from '../../../routes/workouts/manage/workoutRunes.svelte';

	/** After this long, a workout most likely wasn't finished: ask to finish or discard it */
	const NUDGE_AFTER_MINUTES = 2 * 60;

	// The workout's own pages show it already; the New workout page (back from it) still gets the panel
	let onWorkoutPages = $derived(
		['/workouts/manage/exercises', '/workouts/manage/overview'].some((path) => $page.url.pathname.startsWith(path))
	);
	let signedIn = $derived(Boolean($page.data.session?.user));

	// A new workout started and not saved yet. It lives on this device only. Editing a past workout
	// gets no panel: leaving the edit asks to save or discard instead
	let inProgress = $derived(
		workoutRunes.workoutData !== null &&
			workoutRunes.workoutExercises !== null &&
			workoutRunes.editingWorkoutId === null
	);
	let routineLabel = $derived(
		workoutRunes.workoutData?.routineName ??
			workoutRunes.workoutData?.workoutOfMesocycle?.splitDayName ??
			'Blank workout'
	);
	// The exercise being done: the first with a set neither ticked nor skipped
	let currentExercise = $derived(
		workoutRunes.workoutExercises?.find((ex) => ex.sets.some((set) => !set.completed && !set.skipped))?.name
	);

	let now = $state(new Date());
	onMount(() => {
		// An edit of a past workout left without saving (the tab was closed): it ends here
		if (workoutRunes.editingWorkoutId !== null && !$page.url.pathname.startsWith('/workouts/manage')) {
			if (workoutRunes.hasUnsavedEdits()) toast.info('Unsaved changes to a past workout were discarded');
			workoutRunes.resetStores();
		}
		const timer = setInterval(() => (now = new Date()), 1000);
		return () => clearInterval(timer);
	});
	let startedAt = $derived(workoutRunes.workoutData?.startedAt ?? null);
	let clock = $derived(startedAt === null ? '' : formatWorkoutClock(startedAt, now));
	let nudge = $derived(startedAt !== null && workoutMinutes(startedAt, now) >= NUDGE_AFTER_MINUTES);
	let detail = $derived(
		nudge && startedAt !== null
			? `Started ${formatWorkoutLength(startedAt, now)} ago. Finish or discard?`
			: (currentExercise ?? routineLabel)
	);

	let discardOpen = $state(false);

	function resume() {
		goto('/workouts/manage/exercises?keepCurrent');
	}

	function discard() {
		workoutRunes.resetStores();
		discardOpen = false;
		toast.success('Workout discarded');
	}
</script>

{#if inProgress && signedIn && !onWorkoutPages}
	<div class="mx-auto w-full max-w-2xl shrink-0 px-2 pb-2">
		<div
			class="flex items-center gap-2 rounded-2xl border bg-card p-2 shadow-lg {nudge ? 'border-destructive' : ''}"
			data-testid="workout-panel"
			role="status"
		>
			<Button
				class="h-12 w-12 shrink-0 rounded-full"
				aria-label="Back to the workout"
				onclick={resume}
				size="icon"
				variant="secondary"
			>
				<ChevronUpIcon class="h-6 w-6" />
			</Button>
			<button class="flex min-w-0 grow flex-col items-start text-left" onclick={resume} type="button">
				<span class="flex items-center gap-2 font-semibold">
					<span
						class="h-2.5 w-2.5 shrink-0 rounded-full {nudge ? 'bg-destructive' : 'bg-green-500'}"
						data-testid="workout-panel-dot"
						data-nudge={nudge}
					></span>
					Workout
					<span class="font-normal tabular-nums" data-testid="workout-panel-clock">{clock}</span>
				</span>
				<span
					class="w-full truncate text-sm {nudge ? 'text-destructive' : 'text-muted-foreground'}"
					data-testid="workout-panel-detail"
				>
					{detail}
				</span>
			</button>
			<Button
				class="h-12 w-12 shrink-0 rounded-full text-destructive hover:text-destructive"
				aria-label="Discard workout"
				onclick={() => (discardOpen = true)}
				size="icon"
				variant="secondary"
			>
				<TrashIcon class="h-5 w-5" />
			</Button>
		</div>
	</div>

	<ResponsiveDialog title="Discard this workout?" bind:open={discardOpen}>
		{#snippet description()}
			Everything you've entered for {routineLabel} will be cleared. This can't be undone.
		{/snippet}
		<Button onclick={discard} variant="destructive">Discard</Button>
	</ResponsiveDialog>
{/if}
