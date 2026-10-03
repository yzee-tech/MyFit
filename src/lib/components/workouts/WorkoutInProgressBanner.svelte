<script lang="ts">
	import { goto } from '$app/navigation';
	import ResponsiveDialog from '$lib/components/ResponsiveDialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
	import { workoutRunes } from '../../../routes/workouts/manage/workoutRunes.svelte';

	// A workout started (or a past one being edited) and not saved yet
	let inProgress = $derived(workoutRunes.workoutData !== null && workoutRunes.workoutExercises !== null);
	let label = $derived(
		workoutRunes.editingWorkoutId !== null
			? 'Editing a past workout'
			: (workoutRunes.workoutData?.workoutOfMesocycle?.splitDayName ?? 'Blank workout')
	);
	let discardOpen = $state(false);

	function discard() {
		workoutRunes.resetStores();
		discardOpen = false;
		toast.success('Workout discarded');
	}
</script>

{#if inProgress}
	<div
		class="mb-2 flex items-center gap-2 rounded-lg border border-primary bg-card p-3"
		data-testid="workout-in-progress"
		role="status"
	>
		<div class="mr-auto flex min-w-0 flex-col">
			<span class="text-sm font-semibold">Workout in progress</span>
			<span class="truncate text-sm text-muted-foreground">{label}</span>
		</div>
		<Button onclick={() => (discardOpen = true)} size="sm" variant="ghost">Discard</Button>
		<Button onclick={() => goto('/workouts/manage/exercises?keepCurrent')} size="sm">Continue</Button>
	</div>

	<ResponsiveDialog title="Discard this workout?" bind:open={discardOpen}>
		{#snippet description()}
			Everything entered for {label} is cleared. This can't be undone.
		{/snippet}
		<Button onclick={discard} variant="destructive">Yes, discard</Button>
	</ResponsiveDialog>
{/if}
