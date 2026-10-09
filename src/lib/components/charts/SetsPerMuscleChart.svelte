<script lang="ts">
	import { convertCamelCaseToNormal } from '$lib/utils';
	import type { MuscleGroup } from '$lib/utils/prismaEnums';
	import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip } from 'chart.js';
	Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

	type PropsType = {
		/** Each exercise's muscle and its number of sets */
		exercises: { targetMuscleGroup: MuscleGroup; customMuscleGroup?: string | null; sets: number }[];
		/** e.g. "Sets done" or "Sets a week" */
		label: string;
	};
	let { exercises, label }: PropsType = $props();

	/** Muscles, most sets first */
	let muscles = $derived.by(() => {
		const sets = new Map<string, number>();
		for (const exercise of exercises) {
			const name =
				exercise.targetMuscleGroup === 'Custom'
					? (exercise.customMuscleGroup ?? 'Custom')
					: convertCamelCaseToNormal(exercise.targetMuscleGroup);
			sets.set(name, (sets.get(name) ?? 0) + exercise.sets);
		}
		return [...sets.entries()].filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]);
	});

	let chart: Chart<'bar'> | undefined;
	let chartCanvas: HTMLCanvasElement | undefined = $state();
	$effect(() => {
		if (!chartCanvas) return;
		chart?.destroy();
		const style = getComputedStyle(document.body);
		const color = (name: string) => style.getPropertyValue(name).split(' ').join(', ');
		chart = new Chart(chartCanvas, {
			type: 'bar',
			data: {
				labels: muscles.map(([name]) => name),
				datasets: [
					{
						label,
						data: muscles.map(([, count]) => count),
						backgroundColor: `hsl(${color('--primary')})`,
						borderRadius: 4
					}
				]
			},
			options: {
				indexAxis: 'y',
				maintainAspectRatio: false,
				scales: {
					x: { beginAtZero: true, ticks: { precision: 0, color: `hsl(${color('--muted-foreground')})` } },
					y: { ticks: { color: `hsl(${color('--foreground')})` } }
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
		<canvas bind:this={chartCanvas} data-testid="sets-per-muscle-chart"></canvas>
	</div>
{/if}
