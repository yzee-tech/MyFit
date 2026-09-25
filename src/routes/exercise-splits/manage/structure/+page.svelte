<script lang="ts">
	import RoutineListEditor from '$lib/components/mesocycleAndExerciseSplit/RoutineListEditor.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import H3 from '$lib/components/ui/typography/H3.svelte';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { exerciseSplitRunes } from '../exerciseSplitRunes.svelte';

	async function submitStructure(e: SubmitEvent) {
		e.preventDefault();
		if (!exerciseSplitRunes.validateSplitStructure()) {
			toast.error('Routine names should be unique', {
				description: 'For example: Hotel gym – Upper, Hotel gym – Lower'
			});
			return;
		}
		exerciseSplitRunes.updateSplitExercisesStructure();
		await goto('./exercises');
	}
</script>

<H3>Routines</H3>
<form id="exercise-split-structure-form" class="flex grow flex-col gap-1.5" onsubmit={submitStructure}>
	<div class="mb-4 flex w-full flex-col gap-1.5">
		<Label for="exercise-split-name">Library name</Label>
		<Input id="exercise-split-name" placeholder="Type here" required bind:value={exerciseSplitRunes.splitName} />
	</div>
	<span class="text-sm font-medium">Routines</span>
	<p class="mb-1 text-sm text-muted-foreground">
		One routine per gym or workout, for example "American Club – Upper". You pick one each time you train.
	</p>
	<RoutineListEditor
		addRoutine={exerciseSplitRunes.addSplitDay}
		exerciseCounts={exerciseSplitRunes.splitExercises.map((exercises) => exercises?.length ?? 0)}
		removeRoutine={exerciseSplitRunes.removeSplitDay}
		routines={exerciseSplitRunes.splitDays}
	/>
	<Button class="mt-auto" type="submit">Next</Button>
</form>
