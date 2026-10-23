<script lang="ts">
	import type { RouterOutputs } from '$lib/trpc/router';
	import { getWorkoutVolume } from '$lib/utils/workoutUtils';
	import { fromKg } from '$lib/utils/weightUnits';
	import { page } from '$app/stores';
	import { chartTheme } from '$lib/utils/chartTheme';
	import {
		CategoryScale,
		Chart,
		Filler,
		Legend,
		LinearScale,
		LineController,
		LineElement,
		PointElement,
		Title,
		Tooltip
	} from 'chart.js';
	Chart.register(Tooltip, CategoryScale, LineController, LineElement, PointElement, Filler, LinearScale, Title, Legend);

	type PropsType = { pastWorkouts: RouterOutputs['mesocycles']['getWorkouts'] };
	let { pastWorkouts }: PropsType = $props();

	let chart: Chart;
	let chartCanvas: HTMLCanvasElement | undefined = $state();

	$effect(() => {
		// Drawn again in the theme's colours when it changes
		const palette = $chartTheme;
		if (chartCanvas === undefined || !palette) return;
		if (chart) chart.destroy();

		chart = new Chart(chartCanvas, {
			type: 'line',
			data: {
				labels: pastWorkouts.map((workout) =>
					new Date(workout.startedAt).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })
				),
				datasets: [
					{
						data: pastWorkouts.map((workout) =>
							Math.round(fromKg(getWorkoutVolume(workout), $page.data.homeWeightUnit))
						),
						fill: {
							target: 'origin',
							above: `hsl(${palette.secondary})`
						},
						borderColor: `hsl(${palette.primary})`,
						borderWidth: 1,
						label: 'Work volume'
					}
				]
			}
		});
	});
</script>

<canvas bind:this={chartCanvas} height="160"></canvas>
