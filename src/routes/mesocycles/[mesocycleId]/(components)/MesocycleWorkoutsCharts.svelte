<script lang="ts">
	import * as Select from '$lib/components/ui/select';
	import * as Card from '$lib/components/ui/card';
	import type { Selected } from 'bits-ui';
	import WorkoutProgressionChart from '../../../dashboard/(components)/WorkoutProgressionChart.svelte';
	import type { RouterOutputs } from '$lib/trpc/router';

	let { mesocycle }: { mesocycle: NonNullable<RouterOutputs['mesocycles']['findById']> } = $props();

	// Routines that can be picked: not old hidden ones or the old rotation's rest days
	const routines = mesocycle.mesocycleExerciseSplitDays.filter((splitDay) => !splitDay.isRestDay && !splitDay.hidden);
	const firstNonRestDay = routines[0] ?? mesocycle.mesocycleExerciseSplitDays[0];
	let selectedExerciseSplitDayIndex: Selected<number> = $state({
		value: firstNonRestDay.dayIndex,
		label: firstNonRestDay.name
	});
</script>

<Card.Root class="p-4">
	<WorkoutProgressionChart
		pastWorkouts={mesocycle.workoutsOfMesocycle
			.filter((wm) => wm.splitDayIndex === selectedExerciseSplitDayIndex.value)
			.map((wm) => wm.workout)}
	/>

	<Select.Root bind:selected={selectedExerciseSplitDayIndex}>
		<Select.Label class="pl-0">Routine</Select.Label>
		<Select.Trigger class="w-full">
			<Select.Value />
		</Select.Trigger>
		<Select.Content>
			{#each routines as splitDay}
				<Select.Item value={splitDay.dayIndex}>{splitDay.name}</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>
</Card.Root>
