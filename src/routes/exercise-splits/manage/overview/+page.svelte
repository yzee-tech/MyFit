<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Tabs from '$lib/components/ui/tabs';
	import H3 from '$lib/components/ui/typography/H3.svelte';
	import { toast } from 'svelte-sonner';
	import LoaderCircle from 'virtual:icons/lucide/loader-circle';
	import { exerciseSplitRunes } from '../exerciseSplitRunes.svelte';
	import ExerciseSplitMuscleGroupsCharts from '../../(components)/ExerciseSplitMuscleGroupsCharts.svelte';
	import ExerciseSplitExercisesCharts from '../../(components)/ExerciseSplitExercisesCharts.svelte';
	import { trpc } from '$lib/trpc/client';
	import { TRPCClientError } from '@trpc/client';
	import { onMount } from 'svelte';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import { mesocycleExerciseSplitRunes } from '../../../mesocycles/[mesocycleId]/edit-split/mesocycleExerciseSplitRunes.svelte';

	let savingExerciseSplit = $state(false);

	// Editing a library can also update the current block made from it
	let activeBlock: { id: string; name: string } | null = $state(null);
	let updateActiveBlock = $state(true);
	onMount(async () => {
		const id = exerciseSplitRunes.editingExerciseSplitId;
		if (id) activeBlock = await trpc().exerciseSplits.findActiveBlockForLibrary.query(id);
	});

	/** Routines as saved: without the editor's note of each routine's earlier name */
	function routinesToSave() {
		return exerciseSplitRunes.splitDays.map(({ previousName, ...splitDay }, idx) => ({ ...splitDay, dayIndex: idx }));
	}

	async function createOrEditExerciseSplit() {
		const id = exerciseSplitRunes.editingExerciseSplitId;
		savingExerciseSplit = true;
		if (id) await editExerciseSplit(id);
		else await createExerciseSplit();

		await invalidate('exerciseSplits:all');
		await goto('/exercise-splits');
		savingExerciseSplit = false;
		exerciseSplitRunes.resetStores();
	}

	async function createExerciseSplit() {
		try {
			const { message } = await trpc().exerciseSplits.create.mutate({
				splitName: exerciseSplitRunes.splitName,
				splitDays: routinesToSave(),
				splitExercises: exerciseSplitRunes.splitExercises.map((dayExercises) =>
					dayExercises.map((exercise, idx) => ({ ...exercise, exerciseIndex: idx }))
				)
			});
			toast.success(message);
		} catch (error) {
			if (error instanceof TRPCClientError) toast.error(error.message);
		}
	}

	async function editExerciseSplit(id: string) {
		try {
			const { message } = await trpc().exerciseSplits.editById.mutate({
				id,
				splitData: {
					splitName: exerciseSplitRunes.splitName,
					splitDays: routinesToSave(),
					splitExercises: exerciseSplitRunes.splitExercises.map((dayExercises) =>
						dayExercises.map((exercise, idx) => ({ ...exercise, exerciseIndex: idx }))
					)
				},
				updateBlock:
					activeBlock && updateActiveBlock
						? {
								mesocycleId: activeBlock.id,
								previousRoutineNames: exerciseSplitRunes.splitDays.map((splitDay) => splitDay.previousName ?? null)
							}
						: undefined
			});
			toast.success(message);
			// The block's routines changed: drop any unsaved copy of them held by its editor
			if (activeBlock && updateActiveBlock) mesocycleExerciseSplitRunes.resetStores();
		} catch (error) {
			if (error instanceof TRPCClientError) toast.error(error.message);
		}
	}
</script>

<H3>Overview</H3>
<Tabs.Root class="w-full" value="exercises">
	<Tabs.List class="grid grid-cols-2">
		<Tabs.Trigger value="exercises">Exercises</Tabs.Trigger>
		<Tabs.Trigger value="muscleGroups">Muscle groups</Tabs.Trigger>
	</Tabs.List>
	<Tabs.Content value="exercises">
		<Card.Root class="p-4">
			<ExerciseSplitExercisesCharts exercises={exerciseSplitRunes.splitExercises.flat()} />
		</Card.Root>
	</Tabs.Content>
	<Tabs.Content value="muscleGroups">
		<Card.Root class="p-4">
			<ExerciseSplitMuscleGroupsCharts splitExercises={exerciseSplitRunes.splitExercises} />
		</Card.Root>
	</Tabs.Content>
</Tabs.Root>

{#if activeBlock}
	<div class="mt-4 flex items-start gap-3 rounded-md border p-4">
		<Checkbox id="update-active-block" class="mt-0.5" bind:checked={updateActiveBlock} />
		<div class="grid gap-1">
			<Label for="update-active-block">Also update my current block “{activeBlock.name}”</Label>
			<p class="text-sm text-muted-foreground">
				Its routines get these exercises, and new routines are added. Workouts, sets and exercise overrides are kept.
				Routines you removed here stay in the block.
			</p>
		</div>
	</div>
{/if}

<div class="mt-auto grid grid-cols-2 gap-1">
	<Button href="./exercises" variant="secondary">Previous</Button>
	<Button disabled={savingExerciseSplit} onclick={createOrEditExerciseSplit}>
		{#if savingExerciseSplit}
			<LoaderCircle class="animate-spin" />
		{:else}
			Save
		{/if}
	</Button>
</div>
