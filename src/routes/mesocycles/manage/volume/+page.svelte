<script lang="ts">
	import H3 from '$lib/components/ui/typography/H3.svelte';
	import LoaderCircle from 'virtual:icons/lucide/loader-circle';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { mesocycleRunes } from '../mesocycleRunes.svelte';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import type { FullExerciseSplit } from '../../../exercise-splits/manage/exerciseSplitRunes.svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();
	let exerciseSplit: FullExerciseSplit | 'loading' = $state('loading');

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
		mesocycleRunes.finalizeSets();
		goto('./overview');
	}
</script>

<H3>Routines</H3>
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
		<p class="text-sm text-muted-foreground" data-testid="sets-from-library">
			Each exercise has the number of sets its routine gives it. Change them in the routine library, or during a
			workout.
		</p>
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
