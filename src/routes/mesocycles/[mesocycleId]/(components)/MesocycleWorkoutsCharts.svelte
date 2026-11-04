<script lang="ts">
	import * as Select from '$lib/components/ui/select';
	import * as Card from '$lib/components/ui/card';
	import type { Selected } from 'bits-ui';
	import WorkoutProgressionChart from '../../../dashboard/(components)/WorkoutProgressionChart.svelte';
	import type { RouterOutputs } from '$lib/trpc/router';
	import { sortRoutineNames } from '$lib/utils/listOrder';

	let { mesocycle }: { mesocycle: NonNullable<RouterOutputs['mesocycles']['findById']> } = $props();

	// The routines this mesocycle's workouts were done from, by their names at the time
	const done = mesocycle.workoutsOfMesocycle.filter((wm) => wm.workout.routineName);
	// A running block follows the order of My routines; names that aren't there any more come after, A to Z
	// (a finished block has no My routines: A to Z)
	const routineNames = sortRoutineNames(
		[...new Set(done.map((wm) => wm.workout.routineName!))],
		mesocycle.routines?.map((routine) => routine.name) ?? null
	);
	let selectedRoutine: Selected<string> | undefined = $state(
		routineNames[0] === undefined ? undefined : { value: routineNames[0], label: routineNames[0] }
	);
</script>

<Card.Root class="p-4">
	{#if routineNames.length === 0}
		<div class="muted-text-box">No workouts yet</div>
	{:else}
		<WorkoutProgressionChart
			pastWorkouts={done.filter((wm) => wm.workout.routineName === selectedRoutine?.value).map((wm) => wm.workout)}
		/>

		<Select.Root bind:selected={selectedRoutine}>
			<Select.Label class="pl-0">Routine</Select.Label>
			<Select.Trigger class="w-full">
				<Select.Value />
			</Select.Trigger>
			<Select.Content>
				{#each routineNames as name}
					<Select.Item value={name}>{name}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	{/if}
</Card.Root>
