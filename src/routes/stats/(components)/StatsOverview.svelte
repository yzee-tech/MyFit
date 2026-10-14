<script lang="ts">
	import { page } from '$app/stores';
	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import { trpc } from '$lib/trpc/client';
	import type { RouterOutputs } from '$lib/trpc/router';
	import { convertCamelCaseToNormal } from '$lib/utils';
	import {
		BODY_AREAS,
		progressBars,
		progressBarSize,
		STATS_PERIODS,
		type ProgressMeasure,
		type StatsPeriod
	} from '$lib/utils/stats';
	import { formatMinutes } from '$lib/utils/workoutLength';
	import { fromKg, unitLabel } from '$lib/utils/weightUnits';
	import {
		BarController,
		BarElement,
		CategoryScale,
		Chart,
		Filler,
		LinearScale,
		Legend,
		LineElement,
		PointElement,
		RadarController,
		RadialLinearScale,
		Tooltip
	} from 'chart.js';
	import ArrowDown from 'virtual:icons/lucide/arrow-down';
	import ArrowUp from 'virtual:icons/lucide/arrow-up';
	Chart.register(
		RadarController,
		RadialLinearScale,
		PointElement,
		LineElement,
		Filler,
		Legend,
		Tooltip,
		BarController,
		BarElement,
		CategoryScale,
		LinearScale
	);

	type Overview = RouterOutputs['stats']['overview'];

	let period = $state<StatsPeriod>(30);
	let overview: Overview | undefined = $state();
	// The person's own 1 January, for the year so far
	const yearStart = () => new Date(new Date().getFullYear(), 0, 1);

	$effect(() => {
		const picked = period;
		overview = undefined;
		trpc()
			.stats.overview.query(picked === 'ytd' ? { period: picked, yearStart: yearStart() } : { period: picked })
			.then((result) => {
				// Still the period picked
				if (picked === period) overview = result;
			});
	});

	const periodButtons: Record<StatsPeriod, { label: string; name: string }> = {
		7: { label: '7d', name: 'Last 7 days' },
		30: { label: '30d', name: 'Last 30 days' },
		90: { label: '90d', name: 'Last 90 days' },
		ytd: { label: 'YTD', name: 'Year to date' },
		all: { label: 'All', name: 'All time' }
	};
	/** e.g. "the last 30 days", "this year", "all time" */
	let periodWords = $derived(
		period === 'ytd' ? 'this year' : period === 'all' ? 'all time' : `the last ${period} days`
	);
	/** What it's compared with, e.g. "The 30 days before" */
	let beforeWords = $derived(period === 'ytd' ? 'The same dates last year' : `The ${period} days before`);

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
		previous: number | null;
		format: (value: number) => string;
		note?: string;
	};
	let cards: Card[] = $derived.by(() => {
		if (!overview) return [];
		const { current, previous } = overview;
		const average = current.workouts > 0 ? current.minutes / current.workouts : 0;
		return [
			{
				label: 'Workouts',
				testId: 'workouts',
				current: current.workouts,
				previous: previous?.workouts ?? null,
				format: String
			},
			{
				label: 'Duration',
				testId: 'duration',
				current: current.minutes,
				previous: previous?.minutes ?? null,
				format: formatMinutes,
				note: current.workouts > 0 ? `avg ${formatMinutes(average)}` : undefined
			},
			{
				label: 'Volume',
				testId: 'volume',
				current: current.volume,
				previous: previous?.volume ?? null,
				format: formatVolume
			},
			{ label: 'Sets', testId: 'sets', current: current.sets, previous: previous?.sets ?? null, format: String }
		];
	});

	/** Muscles worked, most sets first, with last period's sets */
	let muscles = $derived.by(() => {
		if (!overview) return [];
		const { current, previous } = overview;
		const names = new Set([...Object.keys(current.setsByMuscle), ...Object.keys(previous?.setsByMuscle ?? {})]);
		return [...names]
			.map((name) => ({
				name: /^[A-Z][a-zA-Z]+$/.test(name) ? convertCamelCaseToNormal(name) : name,
				current: current.setsByMuscle[name] ?? 0,
				previous: previous?.setsByMuscle[name] ?? 0
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
					// All time has nothing to compare with
					...(previous
						? [
								{
									label: 'Previous',
									data: BODY_AREAS.map((area) => previous.setsByArea[area]),
									borderColor: `hsl(${muted})`,
									backgroundColor: `hsla(${muted}, 0.15)`,
									borderWidth: 2,
									pointRadius: 0
								}
							]
						: []),
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

	// The progress chart: one bar per day, week or month of the period, for the measure picked
	const measures: { value: ProgressMeasure; label: string }[] = [
		{ value: 'minutes', label: 'Duration' },
		{ value: 'volume', label: 'Volume' },
		{ value: 'reps', label: 'Reps' }
	];
	let measure: ProgressMeasure = $state('minutes');
	let bars = $derived(
		overview ? progressBars(overview.progress, period, new Date(), period === 'ytd' ? yearStart() : undefined) : []
	);
	let progressTotal = $derived(bars.reduce((sum, bar) => sum + bar[measure], 0));

	function formatMeasure(value: number) {
		if (measure === 'minutes') return formatMinutes(value);
		if (measure === 'volume') return formatVolume(value);
		return `${value.toLocaleString()} reps`;
	}
	/** A bar's height in what the axis shows: hours, the home unit, or reps */
	function barValue(value: number) {
		if (measure === 'minutes') return Math.round((value / 60) * 10) / 10;
		if (measure === 'volume') return Math.round(fromKg(value, homeUnit));
		return value;
	}
	function barLabel(start: Date) {
		if (progressBarSize(period) === 'month')
			return start.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
		return start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
	}

	let progressChart: Chart<'bar'> | undefined;
	let progressCanvas: HTMLCanvasElement | undefined = $state();
	$effect(() => {
		if (!progressCanvas || !overview) return;
		progressChart?.destroy();
		const style = getComputedStyle(document.body);
		const color = (name: string) => style.getPropertyValue(name).split(' ').join(', ');
		const axisUnit = measure === 'minutes' ? 'h' : measure === 'volume' ? unitLabel(homeUnit) : '';
		const shownBars = bars;
		progressChart = new Chart(progressCanvas, {
			type: 'bar',
			data: {
				labels: shownBars.map((bar) => barLabel(bar.start)),
				datasets: [
					{
						label: measures.find((m) => m.value === measure)!.label,
						data: shownBars.map((bar) => barValue(bar[measure])),
						backgroundColor: `hsl(${color('--primary')})`,
						borderRadius: 3
					}
				]
			},
			options: {
				animation: false,
				scales: {
					x: {
						grid: { display: false },
						ticks: { color: `hsl(${color('--muted-foreground')})`, maxRotation: 0, autoSkipPadding: 12 }
					},
					y: {
						beginAtZero: true,
						grid: { color: `hsl(${color('--border')})` },
						ticks: {
							color: `hsl(${color('--muted-foreground')})`,
							precision: 0,
							callback: (value) => `${Number(value).toLocaleString()}${axisUnit ? ` ${axisUnit}` : ''}`
						}
					}
				},
				plugins: {
					legend: { display: false },
					tooltip: { callbacks: { label: (item) => formatMeasure(shownBars[item.dataIndex][measure]) } }
				}
			}
		});
	});
</script>

<div class="flex flex-col gap-3 pb-4">
	<ToggleGroup.Root
		class="grid grid-cols-5 gap-1"
		aria-label="Period"
		onValueChange={(value) => {
			const picked = STATS_PERIODS.find((option) => String(option) === value);
			if (picked !== undefined) period = picked;
		}}
		type="single"
		value={String(period)}
		variant="outline"
	>
		{#each STATS_PERIODS as option}
			<ToggleGroup.Item class="px-1" aria-label={periodButtons[option].name} value={String(option)}>
				{periodButtons[option].label}
			</ToggleGroup.Item>
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
		<Card.Root class="p-4" data-testid="stats-progress">
			<div class="mb-2">
				<span class="text-2xl font-bold" data-testid="stats-progress-total">{formatMeasure(progressTotal)}</span>
				<span class="text-sm text-muted-foreground">in {periodWords}</span>
			</div>
			<canvas bind:this={progressCanvas} data-testid="stats-progress-chart" data-bars={bars.length}></canvas>
			<div class="mt-3 flex gap-2" role="radiogroup" aria-label="Measure">
				{#each measures as option (option.value)}
					<button
						class="rounded-full px-3 py-1 text-sm {measure === option.value
							? 'bg-primary text-primary-foreground'
							: 'bg-secondary text-secondary-foreground'}"
						aria-checked={measure === option.value}
						onclick={() => (measure = option.value)}
						role="radio"
						type="button"
					>
						{option.label}
					</button>
				{/each}
			</div>
		</Card.Root>

		<Card.Root class="p-4">
			<p class="mb-1 text-center text-sm text-muted-foreground">
				{#if overview.previous}
					Sets per area: {periodWords} and {beforeWords.toLowerCase()}
				{:else}
					Sets per area: {periodWords}
				{/if}
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
					{#if card.previous !== null}
						<div
							class="mt-1 flex items-center gap-1 text-sm text-muted-foreground"
							data-testid="stats-{card.testId}-previous"
							title={beforeWords}
						>
							{#if card.current > card.previous}
								<ArrowUp class="h-3.5 w-3.5" />
							{:else if card.current < card.previous}
								<ArrowDown class="h-3.5 w-3.5" />
							{/if}
							{card.format(card.previous)} before
						</div>
					{/if}
				</Card.Root>
			{/each}
		</div>

		<Card.Root class="p-4">
			<div class="mb-2 flex justify-between text-sm text-muted-foreground">
				<span>Sets per muscle</span>
				{#if overview.previous}
					<span>now · before</span>
				{/if}
			</div>
			{#if muscles.length === 0}
				<div class="text-sm text-muted-foreground">No workouts yet in {periodWords}</div>
			{:else}
				<ul class="flex flex-col gap-1" data-testid="stats-muscles">
					{#each muscles as muscle (muscle.name)}
						<li class="flex justify-between gap-2">
							<span>{muscle.name}</span>
							<span class="tabular-nums">
								<span class="font-semibold">{muscle.current}</span>
								{#if overview.previous}
									<span class="text-muted-foreground"> · {muscle.previous}</span>
								{/if}
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		</Card.Root>
	{/if}
</div>
