<script lang="ts">
	import { chartTheme } from '$lib/utils/chartTheme';
	import { page } from '$app/stores';
	import { fromKg, isLevelUnit, roundWeight } from '$lib/utils/weightUnits';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import * as Popover from '$lib/components/ui/popover';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import type { RouterOutputs } from '$lib/trpc/router';
	import { generateShadesAndTints } from '$lib/utils';
	import { bestSetEstimate } from '$lib/utils/oneRepMax';
	import { getExerciseVolume, getSetVolume, solveBergerFormula } from '$lib/utils/workoutUtils';
	import {
		CategoryScale,
		Chart,
		Filler,
		LinearScale,
		Legend,
		LineController,
		LineElement,
		PointElement,
		TimeScale,
		Title,
		Tooltip
	} from 'chart.js';
	import 'chartjs-adapter-date-fns';
	import LoaderCircle from 'virtual:icons/lucide/loader-circle';
	import MenuIcon from 'virtual:icons/lucide/menu';
	Chart.register(
		Legend,
		Tooltip,
		CategoryScale,
		LineController,
		LineElement,
		PointElement,
		Filler,
		TimeScale,
		Title,
		LinearScale
	);

	type WorkoutExercise = RouterOutputs['workouts']['getExerciseHistory'][number];
	type PropsType = { exercises: WorkoutExercise[] | undefined; selectedExercise: string };

	let { exercises: reverseExercises, selectedExercise }: PropsType = $props();
	let allExercises = $derived(reverseExercises?.toReversed() ?? []);

	// A machine's levels aren't weights: level sessions are charted on their own
	type LoadKind = 'weights' | 'levels';
	const kindOf = (ex: WorkoutExercise): LoadKind => (isLevelUnit(ex.weightUnit) ? 'levels' : 'weights');
	let hasBothKinds = $derived(new Set(allExercises.map(kindOf)).size > 1);
	let loadKind = $state<LoadKind>('weights');
	$effect(() => {
		const latest = allExercises.at(-1);
		loadKind = latest ? kindOf(latest) : 'weights';
	});
	let exercises = $derived(allExercises.filter((ex) => kindOf(ex) === loadKind));

	let chart: Chart;
	let chartCanvas: HTMLCanvasElement | undefined = $state();

	let maxSets = $derived(Math.max(...exercises.map((ex) => ex.sets.length)));
	// Reps only: reps are what goes up; its load only if it ever had one (e.g. holding a plate)
	let repsOnly = $derived(allExercises.at(-1)?.exercise?.repsOnly ?? false);
	let hasLoad = $derived(exercises.some((ex) => ex.sets.some((set) => set.load !== 0)));
	type ChartType =
		| 'estimated-1rm'
		| 'relative-overload'
		| 'absolute-load'
		| 'reps'
		| 'set-volume'
		| 'session-volume'
		| 'load-and-bodyweight';
	let chartType = $state<ChartType>('estimated-1rm');
	let isBodyweight = $derived(typeof exercises.at(0)?.bodyweightFraction === 'number');
	let shownChartType: ChartType = $derived.by(() => {
		if (repsOnly) return chartType === 'absolute-load' && hasLoad ? 'absolute-load' : 'reps';
		// For levels, the level itself (the overload formula, 1RM, volume and bodyweight are for weights)
		if (loadKind === 'levels' && chartType !== 'reps') return 'absolute-load';
		if (chartType === 'load-and-bodyweight' && !isBodyweight) return 'estimated-1rm';
		return chartType;
	});
	// The radio button follows what's shown
	$effect(() => {
		if (repsOnly && chartType !== 'reps' && !(chartType === 'absolute-load' && hasLoad)) chartType = 'reps';
	});
	// One line for the whole workout: "Show sets" doesn't apply
	const oneLineTypes: Partial<Record<ChartType, string>> = {
		'estimated-1rm': 'Estimated 1RM',
		'session-volume': 'Session volume'
	};
	let oneLineType = $derived(oneLineTypes[shownChartType]);
	let homeUnit = $derived($page.data.homeWeightUnit ?? 'KG');
	let unitText = $derived(homeUnit === 'LB' ? 'lb' : 'kg');
	let selectedSets: string[] = $state([]);
	let shownValues: (number | null)[][] = $state([]);

	// "latest" is the most recent workout with an estimate; the change runs from the first one shown
	let estimateSummary = $derived.by(() => {
		if (shownChartType !== 'estimated-1rm') return null;
		const points = (shownValues[0] ?? []).filter((value): value is number => value !== null);
		const latest = points.at(-1);
		if (latest === undefined) return null;
		const change = points.length > 1 ? latest - points[0] : null;
		return {
			latest: `${latest.toFixed(2)} ${unitText}${isBodyweight ? ' incl. BW' : ''}`,
			change: change === null ? null : `${change < 0 ? '−' : '+'}${Math.abs(change).toFixed(2)}`
		};
	});

	$effect(() => {
		selectedSets = Array.from({ length: Math.min(maxSets, 2) }, (_, idx) => idx.toString());
	});

	$effect(() => {
		// Grid and text come from the theme (Chart.defaults): drawn again when it changes
		if (chartCanvas === undefined || !$chartTheme) return;
		if (chart) chart.destroy();

		const colors = generateShadesAndTints(maxSets);
		let dataValues: (number | null)[][];
		// The set each workout's estimate came from, for the tooltip
		let estimateSets: ({ load: number; reps: number; RIR: number } | null)[] = [];
		const inHomeUnit = (kg: number) => roundWeight(fromKg(kg, homeUnit));

		const nonSkippedExercises = exercises
			.map((ex) => ({ ...ex, sets: ex.sets.filter((set) => !set.skipped) }))
			.filter((ex) => ex.sets.length > 0);

		if (shownChartType === 'estimated-1rm') {
			const estimates = nonSkippedExercises.map((ex) => bestSetEstimate(ex, ex.workout.userBodyweight, false));
			estimateSets = estimates.map((estimate) => estimate?.set ?? null);
			dataValues = [estimates.map((estimate) => (estimate ? inHomeUnit(estimate.estimateKg) : null))];
		} else if (shownChartType === 'set-volume') {
			dataValues = Array.from({ length: maxSets }, (_, setIdx) =>
				nonSkippedExercises.map((ex) => {
					if (!selectedSets.includes(setIdx.toString())) return null;
					const set = ex.sets[setIdx];
					if (!set) return null;
					return inHomeUnit(getSetVolume(set, ex.workout.userBodyweight, ex.bodyweightFraction));
				})
			);
		} else if (shownChartType === 'session-volume') {
			dataValues = [nonSkippedExercises.map((ex) => inHomeUnit(getExerciseVolume(ex, ex.workout.userBodyweight)))];
		} else if (shownChartType === 'relative-overload') {
			dataValues = Array.from({ length: maxSets }, (_, setIdx) =>
				nonSkippedExercises.map((ex, idx) => {
					if (idx === 0) return 0;
					const oldestSet = nonSkippedExercises.find((ex) => ex.sets[setIdx] && !ex.sets[setIdx].skipped)?.sets[setIdx];
					if (!oldestSet) return null;
					if (!selectedSets.includes(setIdx.toString())) return null;
					if (!ex.sets[setIdx]) return null;

					const oldest = nonSkippedExercises.find((ex) => ex.sets[setIdx])!;
					const overload = solveBergerFormula({
						variableToSolve: 'OverloadPercentage',
						knownValues: {
							bodyweightFraction: ex.bodyweightFraction,
							newSet: ex.sets[setIdx],
							oldSet: oldestSet,
							oldUserBodyweight: oldest.workout.userBodyweight,
							newUserBodyweight: ex.workout.userBodyweight
						}
					});
					// To 0.1%: the same numbers twice must chart as 0, not a rounding error like 4.5E-5
					return Math.round(overload * 10) / 10;
				})
			);
		} else if (shownChartType === 'absolute-load') {
			dataValues = Array.from({ length: maxSets }, (_, setIdx) =>
				nonSkippedExercises.map((ex) => {
					if (!selectedSets.includes(setIdx.toString())) return null;
					if (!ex.sets[setIdx]) return null;
					if (loadKind === 'levels') return ex.sets[setIdx].load;
					return roundWeight(fromKg(ex.sets[setIdx].load, $page.data.homeWeightUnit));
				})
			);
		} else if (shownChartType === 'reps') {
			dataValues = Array.from({ length: maxSets }, (_, setIdx) =>
				nonSkippedExercises.map((ex) => {
					if (!selectedSets.includes(setIdx.toString())) return null;
					return ex.sets[setIdx]?.reps ?? null;
				})
			);
		} else {
			dataValues = Array.from({ length: maxSets }, (_, setIdx) =>
				nonSkippedExercises.map((ex) => {
					if (!selectedSets.includes(setIdx.toString())) return null;
					if (!ex.sets[setIdx]) return null;
					const totalKg = ex.sets[setIdx].load + ex.bodyweightFraction! * ex.workout.userBodyweight;
					return roundWeight(fromKg(totalKg, $page.data.homeWeightUnit));
				})
			);
		}

		const lineStyle = (idx: number) => ({
			borderColor: colors[idx],
			backgroundColor: colors[idx],
			tension: 0.2,
			borderWidth: 2
		});
		const oneLineLabel =
			oneLineType &&
			`${oneLineType} (${unitText}${shownChartType === 'estimated-1rm' && isBodyweight ? ', incl. BW' : ''})`;
		const datasets = oneLineLabel
			? [{ label: oneLineLabel, data: dataValues[0], spanGaps: true, ...lineStyle(0) }]
			: // Only the sets picked under "Show sets", each named in the legend
				dataValues
					.map((data, idx) => ({ label: `Set ${idx + 1}`, data, ...lineStyle(idx) }))
					.filter((_, idx) => selectedSets.includes(idx.toString()));
		shownValues = datasets.map((dataset) => dataset.data);

		chart = new Chart(chartCanvas, {
			type: 'line',
			data: {
				labels: nonSkippedExercises.map((ex) => new Date(ex.workout.startedAt)),
				datasets
			},
			options: {
				scales: {
					x: {
						type: 'time',
						time: {
							unit: 'day'
						}
					}
				},
				plugins: {
					tooltip: {
						callbacks: {
							// Which set the estimate is from, e.g. "80 kg × 8, RIR 2"
							afterLabel: (item) => {
								const set = estimateSets[item.dataIndex];
								if (!set) return '';
								return `${inHomeUnit(set.load)} ${unitText}${isBodyweight ? ' + BW' : ''} × ${set.reps}, RIR ${set.RIR}`;
							}
						}
					},
					legend: {
						display: true,
						position: 'bottom',
						labels: { boxWidth: 12, boxHeight: 2 }
					}
				}
			}
		});
	});
</script>

{#snippet option(value: ChartType, label: string)}
	<div class="flex items-center space-x-2">
		<RadioGroup.Item {value} id={value} />
		<Label for={value}>{label}</Label>
	</div>
{/snippet}

<Card.Root>
	<Card.Header>
		<div class="flex justify-between gap-6">
			<Card.Title class="truncate">
				{selectedExercise}{#if loadKind === 'levels'}<span
						class="ml-2 text-sm font-normal text-muted-foreground"
						data-testid="stats-levels">levels</span
					>{/if}
			</Card.Title>
			<Popover.Root>
				<Popover.Trigger aria-label="Menu"><MenuIcon /></Popover.Trigger>
				<Popover.Content align="end">
					{#if hasBothKinds}
						<span class="font-semibold">Sessions</span>
						<ToggleGroup.Root
							class="justify-start py-1"
							onValueChange={(value) => {
								if (value === 'weights' || value === 'levels') loadKind = value;
							}}
							type="single"
							value={loadKind}
						>
							<ToggleGroup.Item size="sm" value="weights">Weights</ToggleGroup.Item>
							<ToggleGroup.Item size="sm" value="levels">Levels</ToggleGroup.Item>
						</ToggleGroup.Root>
						<Separator class="my-2" />
					{/if}
					<span class="font-semibold">Chart type</span>
					<!-- Shows the type charted, so a fallback (levels, reps only) is the one checked -->
					<RadioGroup.Root
						class="py-2"
						value={shownChartType}
						onValueChange={(value) => {
							if (value) chartType = value as ChartType;
						}}
					>
						{#if repsOnly}
							{#if hasLoad}
								{@render option('absolute-load', 'Load')}
							{/if}
							{@render option('reps', 'Reps')}
						{:else if loadKind === 'levels'}
							{@render option('absolute-load', 'Level')}
							{@render option('reps', 'Reps')}
						{:else}
							{@render option('estimated-1rm', 'Estimated 1RM')}
							{@render option('relative-overload', 'Relative overload')}
							{@render option('absolute-load', 'Absolute load')}
							{@render option('reps', 'Reps')}
							{@render option('set-volume', 'Set volume')}
							{@render option('session-volume', 'Session volume')}
							{#if isBodyweight}
								{@render option('load-and-bodyweight', 'Load + BW')}
							{/if}
						{/if}
					</RadioGroup.Root>

					<Separator class="my-2" />

					<span class="font-semibold" class:text-muted-foreground={oneLineType}>Show sets</span>
					<ToggleGroup.Root
						class="justify-start py-1"
						disabled={!!oneLineType}
						type="multiple"
						bind:value={selectedSets}
					>
						{#each Array.from({ length: maxSets }) as _, idx}
							<ToggleGroup.Item size="sm" value={idx.toString()}>{idx + 1}</ToggleGroup.Item>
						{/each}
					</ToggleGroup.Root>
					{#if oneLineType}
						<p class="max-w-56 text-xs text-muted-foreground" data-testid="show-sets-reason">
							Not used by {oneLineType}: one line for the whole workout
						</p>
					{/if}
				</Popover.Content>
			</Popover.Root>
		</div>
		{#if estimateSummary}
			<Card.Description data-testid="chart-summary">
				{['Estimated 1RM', `latest ${estimateSummary.latest}`, estimateSummary.change].filter(Boolean).join(' · ')}
			</Card.Description>
		{/if}
	</Card.Header>
	<Card.Content>
		{#if allExercises.length === 0}
			<div class="flex items-center gap-2 px-2 text-sm text-muted-foreground">
				<LoaderCircle class="animate-spin" /> Fetching performances
			</div>
		{:else}
			<canvas
				bind:this={chartCanvas}
				data-points={exercises.length}
				data-testid="exercise-chart"
				data-type={shownChartType}
				data-values={JSON.stringify(shownValues)}
				height="240"
			></canvas>
		{/if}
	</Card.Content>
</Card.Root>
