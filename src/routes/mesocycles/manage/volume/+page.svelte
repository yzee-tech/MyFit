<script lang="ts">
	import H3 from '$lib/components/ui/typography/H3.svelte';
	import LoaderCircle from 'virtual:icons/lucide/loader-circle';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { mesocycleRunes } from '../mesocycleRunes.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import type { FullExerciseSplit } from '../../../exercise-splits/manage/exerciseSplitRunes.svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();
	let exerciseSplit: FullExerciseSplit | 'loading' = $state('loading');
	let setsPerExercise = $state(3);
	// Exercises whose library gives no set count; the others start with the library's
	let exercisesWithoutSets = $derived(
		mesocycleRunes.countExercisesWithoutSets(
			data.editing
				? mesocycleRunes.mesocycleExerciseTemplates.map((_, idx) => idx)
				: mesocycleRunes.getIncludedRoutineIndexes()
		)
	);

	onMount(async () => {
		if (data.editing) return;
		const serverExerciseSplit = await data.exerciseSplit;
		if (!serverExerciseSplit) {
			toast.error('Exercise split not found');
			return;
		} else if (mesocycleRunes.selectedExerciseSplit?.id !== serverExerciseSplit.id) {
			mesocycleRunes.selectedExerciseSplit = serverExerciseSplit;
		}
		exerciseSplit = serverExerciseSplit;
	});

	function submitVolume(e: SubmitEvent) {
		e.preventDefault();
		if (!data.editing && mesocycleRunes.getIncludedRoutineIndexes().length === 0) {
			toast.error('Include at least one routine');
			return;
		}
		mesocycleRunes.fillMissingSets(setsPerExercise);
		goto('./overview');
	}
</script>

<H3>Routines & sets</H3>
{#if exerciseSplit !== 'loading' || data.editing}
	<form class="flex grow flex-col gap-1.5" onsubmit={submitVolume}>
		{#if exerciseSplit !== 'loading'}
			<span class="text-sm font-medium">Routines in this mesocycle</span>
			<ul class="mb-3 flex flex-col gap-1">
				{#each exerciseSplit.exerciseSplitDays as routine, idx}
					{#if !routine.isRestDay}
						<li class="flex items-center gap-3 rounded-lg border bg-card px-4 py-2">
							<Checkbox
								id="include-routine-{idx}"
								aria-label="Include {routine.name}"
								checked={!mesocycleRunes.excludedRoutineIndexes.includes(idx)}
								onCheckedChange={(checked) => mesocycleRunes.setRoutineIncluded(idx, checked === true)}
							/>
							<Label class="grow" for="include-routine-{idx}">{routine.name}</Label>
							<span class="text-xs text-muted-foreground">{routine.exercises.length} exercises</span>
						</li>
					{/if}
				{/each}
			</ul>
		{/if}
		{#if exercisesWithoutSets > 0}
			<Label for="sets-per-exercise">Sets per exercise</Label>
			<Input id="sets-per-exercise" type="number" min={1} max={20} required bind:value={setsPerExercise} />
			<p class="text-sm text-muted-foreground">
				For the {exercisesWithoutSets === 1 ? 'exercise' : `${exercisesWithoutSets} exercises`} without a set count in the
				routine library. The others start with the library's. You can change any exercise's sets later by editing the block's
				routines, or during a workout.
			</p>
		{:else}
			<p class="text-sm text-muted-foreground" data-testid="sets-from-library">
				Each exercise starts with the sets from its routine library. You can change them later by editing the block's
				routines, or during a workout.
			</p>
		{/if}
		<div class="mt-auto grid grid-cols-2 gap-1">
			<Button href="./progression" variant="secondary">Previous</Button>
			<Button type="submit">Next</Button>
		</div>
	</form>
{:else}
	<div class="flex h-full w-full items-center justify-center text-muted-foreground">
		Fetching exercises
		<LoaderCircle class="ml-2 animate-spin" />
	</div>
{/if}
