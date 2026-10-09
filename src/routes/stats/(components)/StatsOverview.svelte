<script lang="ts">
	import { page } from '$app/stores';
	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import { trpc } from '$lib/trpc/client';
	import type { RouterOutputs } from '$lib/trpc/router';
	import { convertCamelCaseToNormal } from '$lib/utils';
	import { BODY_AREAS, STATS_PERIODS, type StatsPeriod } from '$lib/utils/stats';
	import { formatMinutes } from '$lib/utils/workoutLength';
	import { fromKg, unitLabel } from '$lib/utils/weightUnits';
	import {
		Chart,
		Filler,
		Legend,
		LineElement,
		PointElement,
		RadarController,
		RadialLinearScale,
		Tooltip
	} from 'chart.js';
	import ArrowDown from 'virtual:icons/lucide/arrow-down';
	import ArrowUp from 'virtual:icons/lucide/arrow-up';
	Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler, Legend, Tooltip);

	type Overview = RouterOutputs['stats']['overview'];

	let days: StatsPeriod = $state(30);
	let overview: Overview | undefined = $state();

	$effect(() => {
		const period = days;
		overview = undefined;
		trpc()
			.stats.overview.query(period)
			.then((result) => {
				// Still the period picked
				if (period === days) overview = result;
			});
	});

	let homeUnit = $derived($page.data.homeWeightUnit ?? 'KG');

	/** e.g. 26 300 kg → "26.3k kg" */
	function formatVolume(kg: number) {
		const value = Math.round(fromKg(kg, homeUnit));
		const shown = value >= 10000 ? `${Math.round(value / 100) / 10}k` : value.toLocaleString();
		return `${shown} ${unitLabel(homeUnit)}`;
	}

	type Card = {
		label: string;
		testId: string;
		current: number;
		previous: number;
		format: (value: number) => string;
		note?: string;
	};
	let cards: Card[] = $derived.by(() => {
		if (!overview) return [];
		const { current, previous } = overview;
		const average = current.workouts > 0 ? current.minutes / current.workouts : 0;
		return [
			{ label: 'Workouts', testId: 'workouts', current: current.workouts, previous: previous.workouts, format: String },
			{
				label: 'Duration',
				testId: 'duration',
				current: current.minutes,
				previous: previous.minutes,
				format: formatMinutes,
				note: current.workouts > 0 ? `avg ${formatMinutes(average)}` : undefined
			},
			{ label: 'Volume', testId: 'volume', current: current.volume, previous: previous.volume, format: formatVolume },
			{ label: 'Sets', testId: 'sets', current: current.sets, previous: previous.sets, format: String }
		];
	});

	/** Muscles worked, most sets first, with last period's sets */
	let muscles = $derived.by(() => {
		if (!overview) return [];
		const { current, previous } = overview;
		const names = new Set([...Object.keys(current.setsByMuscle), ...Object.keys(previous.setsByMuscle)]);
		return [...names]
			.map((name) => ({
				name: /^[A-Z][a-zA-Z]+$/.test(name) ? convertCamelCaseToNormal(name) : name,
				current: current.setsByMuscle[name] ?? 0,
				previous: previous.setsByMuscle[name] ?? 0
			}))
			.sort((a, b) => b.current - a.current || b.previous - a.previous);
	});

	let chart: Chart<'radar'> | undefined;
	let chartCanvas: HTMLCanvasElement | undefined = $state();
	$effect(() => {
		if (!chartCanvas || !overview) return;
		chart?.destroy();
		const style = getComputedStyle(document.body);
		const color = (name: string) => style.getPropertyValue(name).split(' ').join(', ');
		const primary = color('--primary');
		const muted = color('--muted-foreground');
		const border = color('--border');
		const { current, previous } = overview;
		chart = new Chart(chartCanvas, {
			type: 'radar',
			data: {
				labels: [...BODY_AREAS],
				datasets: [
					{
						label: 'Previous',
						data: BODY_AREAS.map((area) => previous.setsByArea[area]),
						borderColor: `hsl(${muted})`,
						backgroundColor: `hsla(${muted}, 0.15)`,
						borderWidth: 2,
						pointRadius: 0
					},
					{
						label: 'Current',
						data: BODY_AREAS.map((area) => current.setsByArea[area]),
						borderColor: `hsl(${primary})`,
						backgroundColor: `hsla(${primary}, 0.3)`,
						borderWidth: 2,
						pointRadius: 2
					}
				]
			},
			options: {
				scales: {
					r: {
						beginAtZero: true,
						ticks: { display: false, precision: 0 },
						grid: { color: `hsl(${border})` },
						angleLines: { color: `hsl(${border})` },
						pointLabels: { color: `hsl(${muted})`, font: { size: 13 } }
					}
				},
				plugins: {
					legend: {
						position: 'bottom',
						reverse: true,
						labels: { color: `hsl(${muted})`, usePointStyle: true, pointStyle: 'circle', boxHeight: 8 }
					}
				}
			}
		});
	});
</script>

<div class="flex flex-col gap-3 pb-4">
	<ToggleGroup.Root
		class="justify-center"
		aria-label="Period"
		onValueChange={(value) => {
			const period = Number(value);
			if (STATS_PERIODS.includes(period as StatsPeriod)) days = period as StatsPeriod;
		}}
		type="single"
		value={String(days)}
		variant="outline"
	>
		{#each STATS_PERIODS as period}
			<ToggleGroup.Item aria-label="Last {period} days" value={String(period)}>{period} days</ToggleGroup.Item>
		{/each}
	</ToggleGroup.Root>

	{#if !overview}
		<Skeleton class="h-72 w-full" />
		<div class="grid grid-cols-2 gap-2">
			{#each Array(4) as _}
				<Skeleton class="h-24 w-full" />
			{/each}
		</div>
	{:else}
		<Card.Root class="p-4">
			<p class="mb-1 text-center text-sm text-muted-foreground">
				Sets per area: the last {days} days and the {days} days before
			</p>
			<canvas bind:this={chartCanvas} data-testid="stats-radar"></canvas>
		</Card.Root>

		<div class="grid grid-cols-2 gap-2">
			{#each cards as card (card.label)}
				<Card.Root class="p-4" data-testid="stats-{card.testId}">
					<div class="text-sm text-muted-foreground">{card.label}</div>
					<div class="text-2xl font-bold" data-testid="stats-{card.testId}-current">{card.format(card.current)}</div>
					{#if card.note}
						<div class="text-xs text-muted-foreground" data-testid="stats-{card.testId}-note">{card.note}</div>
					{/if}
					<div
						class="mt-1 flex items-center gap-1 text-sm text-muted-foreground"
						data-testid="stats-{card.testId}-previous"
						title="The {days} days before"
					>
						{#if card.current > card.previous}
							<ArrowUp class="h-3.5 w-3.5" />
						{:else if card.current < card.previous}
							<ArrowDown class="h-3.5 w-3.5" />
						{/if}
						{card.format(card.previous)} before
					</div>
				</Card.Root>
			{/each}
		</div>

		<Card.Root class="p-4">
			<div class="mb-2 flex justify-between text-sm text-muted-foreground">
				<span>Sets per muscle</span>
				<span>now · before</span>
			</div>
			{#if muscles.length === 0}
				<div class="text-sm text-muted-foreground">No workouts in the last {days * 2} days</div>
			{:else}
				<ul class="flex flex-col gap-1" data-testid="stats-muscles">
					{#each muscles as muscle (muscle.name)}
						<li class="flex justify-between gap-2">
							<span>{muscle.name}</span>
							<span class="tabular-nums">
								<span class="font-semibold">{muscle.current}</span>
								<span class="text-muted-foreground"> · {muscle.previous}</span>
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		</Card.Root>
	{/if}
</div>
