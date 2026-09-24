<script lang="ts">
	import H3 from '$lib/components/ui/typography/H3.svelte';
	import LoaderCircle from 'virtual:icons/lucide/loader-circle';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { mesocycleRunes } from '../mesocycleRunes.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { FullExerciseSplit } from '../../../exercise-splits/manage/exerciseSplitRunes.svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();
	let exerciseSplit: FullExerciseSplit | 'loading' = $state('loading');
	let setsPerExercise = $state(3);

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
		mesocycleRunes.setSetsOfAllExercises(setsPerExercise);
		goto('./overview');
	}
</script>

<H3>Sets</H3>
{#if exerciseSplit !== 'loading' || data.editing}
	<form class="flex grow flex-col gap-1.5" onsubmit={submitVolume}>
		<Label for="sets-per-exercise">Sets per exercise</Label>
		<Input id="sets-per-exercise" type="number" min={1} max={20} required bind:value={setsPerExercise} />
		<p class="text-sm text-muted-foreground">
			Every exercise in the block starts with this many sets. You can change the sets of any exercise later by editing
			the block's routines, or during a workout.
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
