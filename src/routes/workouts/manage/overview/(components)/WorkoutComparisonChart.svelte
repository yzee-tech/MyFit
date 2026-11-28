<script lang="ts">
	import { chartTheme } from '$lib/utils/chartTheme';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import {
		convertExerciseLoads,
		getExerciseVolume,
		getSetVolume,
		type SetDetails,
		type WorkoutExerciseInProgress
	} from '$lib/utils/workoutUtils';
	import { isLevelUnit } from '$lib/utils/weightUnits';
	import { BarController, BarElement, CategoryScale, Chart, Legend, LinearScale, Tooltip } from 'chart.js';
	import { previousBodyweightOf, type PreviousWorkoutData } from '../../workoutRunes.svelte';
	import type { Selected } from 'bits-ui';
	Chart.register(Tooltip, Legend, BarController, BarElement, CategoryScale, LinearScale);

	type PropsType = {
		previousWorkoutData: NonNullable<PreviousWorkoutData>;
		currentWorkoutData: {
			exercises: WorkoutExerciseInProgress[];
			userBodyweight: number;
		};
	};

	let { previousWorkoutData, currentWorkoutData }: PropsType = $props();
	let chartCanvas: HTMLCanvasElement;
	// No legend: the picker under the chart names it
	const chartOptions = { plugins: { legend: { display: false } } };
	let chart: Chart<'bar', number[], string>;
	// What the bars show (Previous, Today), also as the canvas's data-values
	let chartValues: number[] = $state([]);

	const chartTypes = ['Work volume', 'Sets'] as const;
	let selectedChartType: Selected<(typeof chartTypes)[number]> = $state({
		value: 'Work volume',
		label: 'Work volume'
	});

	$effect(() => {
		// Grid and text come from the theme (Chart.defaults): drawn again when it changes
		if (!$chartTheme) return;
		if (chart) chart.destroy();
		if (selectedChartType.value === 'Work volume') {
			// Compare in kg: exercises can be shown in different units
			const previousWorkoutVolume = previousWorkoutData.exercises.reduce((volume, exercise) => {
				return (
					volume +
					getExerciseVolume(
						convertExerciseLoads(exercise, 'toKg'),
						previousBodyweightOf(previousWorkoutData, exercise.name) ?? previousWorkoutData.userBodyweight
					)
				);
			}, 0);
			const currentExercisesInKg = currentWorkoutData.exercises.map((exercise) =>
				convertExerciseLoads(exercise, 'toKg')
			);
			const currentWorkoutVolume = currentExercisesInKg.reduce((exerciseVolume, exercise) => {
				// A machine's levels aren't weights, so they don't count towards volume
				if (isLevelUnit(exercise.weightUnit)) return exerciseVolume;
				return (
					exerciseVolume +
					exercise.sets.reduce((setVolume, set) => {
						// A skipped set is no work, as in the previous workout's volume; so is one without its numbers
						if (set.skipped || set.reps === undefined || set.load === undefined || set.RIR === undefined) {
							return setVolume;
						}
						// Only the mini-sets ticked: they are what gets saved (an unticked one has no reps yet, which
						// would make the whole volume a NaN and empty the bar)
						const miniSets = set.miniSets.filter(
							(miniSet) =>
								miniSet.completed &&
								miniSet.reps !== undefined &&
								miniSet.load !== undefined &&
								miniSet.RIR !== undefined
						) as SetDetails['miniSets'];
						return (
							setVolume +
							getSetVolume(
								{ reps: set.reps, load: set.load, RIR: set.RIR, miniSets },
								currentWorkoutData.userBodyweight,
								exercise.bodyweightFraction ?? null
							)
						);
					}, 0)
				);
			}, 0);
			chartValues = [previousWorkoutVolume, currentWorkoutVolume];
			chart = new Chart(chartCanvas, {
				type: 'bar',
				data: {
					labels: ['Previous', 'Today'],
					datasets: [
						{
							label: selectedChartType.value,
							data: [previousWorkoutVolume, currentWorkoutVolume]
						}
					]
				},
				options: chartOptions
			});
		} else {
			// Sets done: a skipped one isn't, as in the sets per muscle chart beside this one
			const previousWorkoutSets = previousWorkoutData.exercises.reduce((sets, exercise) => {
				return sets + exercise.sets.filter((set) => !set.skipped).length;
			}, 0);
			const currentWorkoutSets = currentWorkoutData.exercises.reduce((sets, exercise) => {
				return sets + exercise.sets.filter((set) => !set.skipped).length;
			}, 0);
			chartValues = [previousWorkoutSets, currentWorkoutSets];
			chart = new Chart(chartCanvas, {
				type: 'bar',
				data: {
					labels: ['Previous', 'Today'],
					datasets: [
						{
							label: selectedChartType.value,
							data: [previousWorkoutSets, currentWorkoutSets]
						}
					]
				},
				options: chartOptions
			});
		}
	});
</script>

<Card.Root class="space-y-2 p-4">
	<canvas bind:this={chartCanvas} id="chart-canvas" data-testid="comparison-chart" data-values={chartValues.join(',')}
	></canvas>
	<Select.Root bind:selected={selectedChartType}>
		<Select.Label class="p-0">Chart</Select.Label>
		<Select.Trigger class="mb-2 w-full">
			<Select.Value placeholder="Select chart" />
		</Select.Trigger>
		<Select.Content class="max-h-48 overflow-y-auto">
			{#each chartTypes as chartType}
				<Select.Item value={chartType}>{chartType}</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>
</Card.Root>
