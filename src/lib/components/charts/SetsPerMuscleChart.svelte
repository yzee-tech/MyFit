<script lang="ts">
	import { chartTheme } from '$lib/utils/chartTheme';
	import { formatSetCount, muscleGroupLabel, muscleShares } from '$lib/utils/muscleShares';
	import { MuscleGroup } from '$lib/utils/prismaEnums';
	import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip } from 'chart.js';
	Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

	type PropsType = {
		/** Each exercise's muscles and its number of sets */
		exercises: {
			targetMuscleGroup: MuscleGroup;
			customMuscleGroup?: string | null;
			secondaryMuscleGroups?: MuscleGroup[] | null;
			sets: number;
		}[];
		/** e.g. "Sets done" or "Sets a week" */
		label: string;
	};
	let { exercises, label }: PropsType = $props();

	/**
	 * Muscles, most sets first: a full set for an exercise's muscle group, half for each muscle it also
	 * works (cardio isn't a muscle: its intervals are left out)
	 */
	let muscles = $derived.by(() => {
		const sets = new Map<string, number>();
		for (const exercise of exercises) {
			for (const [muscle, share] of Object.entries(muscleShares(exercise).muscles)) {
				// A custom group reads as it was typed
				const name = muscle in MuscleGroup ? muscleGroupLabel(muscle) : muscle;
				sets.set(name, (sets.get(name) ?? 0) + exercise.sets * share);
			}
		}
		return [...sets.entries()].filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]);
	});

	let chart: Chart<'bar'> | undefined;
	let chartCanvas: HTMLCanvasElement | undefined = $state();
	$effect(() => {
		// Drawn again in the theme's colours when it changes
		const palette = $chartTheme;
		if (!chartCanvas || !palette) return;
		chart?.destroy();
		chart = new Chart(chartCanvas, {
			type: 'bar',
			data: {
				labels: muscles.map(([name]) => name),
				datasets: [
					{
						label,
						data: muscles.map(([, count]) => count),
						backgroundColor: `hsl(${palette.primary})`,
						borderRadius: 4
					}
				]
			},
			options: {
				indexAxis: 'y',
				maintainAspectRatio: false,
				scales: {
					x: { beginAtZero: true, ticks: { color: `hsl(${palette.mutedForeground})` } },
					y: { ticks: { color: `hsl(${palette.foreground})` } }
				}
			}
		});
	});
</script>

{#if muscles.length === 0}
	<div class="muted-text-box">No sets yet</div>
{:else}
	<p class="mb-2 text-sm text-muted-foreground">{label} per muscle</p>
	<div style="height: {Math.max(muscles.length * 28 + 40, 120)}px">
		<canvas
			bind:this={chartCanvas}
			data-sets={muscles.map(([name, count]) => `${name} ${formatSetCount(count)}`).join(', ')}
			data-testid="sets-per-muscle-chart"
		></canvas>
	</div>
{/if}
