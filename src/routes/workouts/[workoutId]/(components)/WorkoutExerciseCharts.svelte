<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import type { FullWorkoutWithMesoData } from '../+page.server';
	import SetsPerMuscleChart from '$lib/components/charts/SetsPerMuscleChart.svelte';

	type PropsType = { workout: FullWorkoutWithMesoData };
	let { workout }: PropsType = $props();
</script>

<Card.Root class="p-4">
	<SetsPerMuscleChart
		exercises={workout.workoutExercises.map((exercise) => ({
			...exercise,
			sets: exercise.sets.filter((set) => !set.skipped).length
		}))}
		label="Sets done"
	/>
</Card.Root>
