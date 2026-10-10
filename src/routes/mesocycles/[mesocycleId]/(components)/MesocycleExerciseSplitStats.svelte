<script lang="ts">
	import SetsPerMuscleChart from '$lib/components/charts/SetsPerMuscleChart.svelte';
	import { Root as Card } from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import type { RouterOutputs } from '$lib/trpc/router';
	import { routineSetCount } from '$lib/utils/routineSets';
	import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip } from 'chart.js';
	Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

	type Block = NonNullable<RouterOutputs['mesocycles']['findById']>;
	let { mesocycle }: { mesocycle: Block } = $props();

	// The routines as planned now: My routines (a finished mesocycle has no Routines tab)
	let routines = $derived(mesocycle.routines ?? []);
	let exercises = $derived(
		routines.flatMap((routine) =>
			routine.exercises.map((exercise) => ({ ...exercise, sets: routineSetCount(exercise.sets) }))
		)
	);

	let chart: Chart<'bar'> | undefined;
	let chartCanvas: HTMLCanvasElement | undefined = $state();
	$effect(() => {
		if (!chartCanvas) return;
		chart?.destroy();
		const style = getComputedStyle(document.body);
		const primary = style.getPropertyValue('--primary').split(' ').join(', ');
		chart = new Chart(chartCanvas, {
			type: 'bar',
			data: {
				labels: routines.map((routine) => routine.name),
				datasets: [
					{
						label: 'Sets',
						data: routines.map((routine) =>
							routine.exercises.reduce((total, exercise) => total + routineSetCount(exercise.sets), 0)
						),
						backgroundColor: `hsl(${primary})`,
						borderRadius: 4
					}
				]
			},
			options: { scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
		});
	});
</script>

<Tabs.Root class="mb-auto w-full" value="muscles">
	<Tabs.List class="grid grid-cols-2">
		<Tabs.Trigger value="muscles">Per muscle</Tabs.Trigger>
		<Tabs.Trigger value="routines">Per routine</Tabs.Trigger>
	</Tabs.List>
	<Tabs.Content value="muscles">
		<Card class="p-4">
			<SetsPerMuscleChart {exercises} label="Sets planned (each routine once)" />
		</Card>
	</Tabs.Content>
	<Tabs.Content value="routines">
		<Card class="p-4">
			<p class="mb-2 text-sm text-muted-foreground">Sets planned per routine</p>
			<canvas bind:this={chartCanvas} data-testid="sets-per-routine-chart"></canvas>
		</Card>
	</Tabs.Content>
</Tabs.Root>
