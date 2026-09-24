<script lang="ts">
	import RoutineListEditor from '$lib/components/mesocycleAndExerciseSplit/RoutineListEditor.svelte';
	import { Button } from '$lib/components/ui/button';
	import H3 from '$lib/components/ui/typography/H3.svelte';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { mesocycleExerciseSplitRunes } from '../mesocycleExerciseSplitRunes.svelte';

	async function submitStructure(e: SubmitEvent) {
		e.preventDefault();
		if (!mesocycleExerciseSplitRunes.validateSplitStructure()) {
			toast.error('Routine names should be unique', {
				description: 'For example: Hotel gym – Upper, Hotel gym – Lower'
			});
			return;
		}
		mesocycleExerciseSplitRunes.updateSplitExercisesStructure();
		await goto('./exercises');
	}
</script>

<H3>Routines</H3>
<form id="exercise-split-structure-form" class="flex grow flex-col gap-1.5" onsubmit={submitStructure}>
	<p class="mb-1 text-sm text-muted-foreground">
		Add a routine for a new gym at any time. Routines you've already trained in this mesocycle can be renamed but not
		deleted.
	</p>
	<RoutineListEditor
		addRoutine={mesocycleExerciseSplitRunes.addSplitDay}
		deleteBlockedReason={(idx) =>
			mesocycleExerciseSplitRunes.routineHasWorkouts(idx) ? 'Already trained in this mesocycle' : undefined}
		exerciseCounts={mesocycleExerciseSplitRunes.splitExercises.map((exercises) => exercises?.length ?? 0)}
		removeRoutine={mesocycleExerciseSplitRunes.removeSplitDay}
		routines={mesocycleExerciseSplitRunes.splitDays}
	/>
	<Button class="mt-auto" type="submit">Next</Button>
</form>
