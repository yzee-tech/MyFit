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
	import { measureOfSets } from '$lib/utils/measure';
	import {
		distanceUnitLabel,
		formatDuration,
		fromMeters,
		paceDenominator,
		roundDistance
	} from '$lib/utils/distanceUnits';
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

	// A machine's levels aren't weights, and a run is neither: each kind of session is charted on its own.
	// A row is cardio by what it logged (its sets), never by the exercise's settings now
	type LoadKind = 'weights' | 'levels' | 'cardio';
	const kindOf = (ex: WorkoutExercise): LoadKind =>
		measureOfSets(ex.sets) !== 'Reps' ? 'cardio' : isLevelUnit(ex.weightUnit) ? 'levels' : 'weights';
	const kindLabels: Record<LoadKind, string> = { weights: 'Weights', levels: 'Levels', cardio: 'Cardio' };
	let kinds = $derived([...new Set(allExercises.map(kindOf))]);
	let hasBothKinds = $derived(kinds.length > 1);
	let loadKind = $state<LoadKind>('weights');
	$effect(() => {
		const latest = allExercises.at(-1);
		loadKind = latest ? kindOf(latest) : 'weights';
	});
	let exercises = $derived(allExercises.filter((ex) => kindOf(ex) === loadKind));
	// Cardio: total time, and with distances, total distance and pace, in the exercise's unit now
	let hasDistance = $derived(exercises.some((ex) => measureOfSets(ex.sets) === 'DistanceTime'));
	let distanceUnit = $derived(allExercises.at(-1)?.exercise?.distanceUnit ?? 'KM');

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
		| 'load-and-bodyweight'
		| 'total-time'
		| 'total-distance'
		| 'pace';
	const cardioTypes: ChartType[] = ['total-time', 'total-distance', 'pace'];
	let chartType = $state<ChartType>('estimated-1rm');
	let isBodyweight = $derived(typeof exercises.at(0)?.bodyweightFraction === 'number');
	let shownChartType: ChartType = $derived.by(() => {
		// Cardio has its own charts; the weight charts (1RM, volume, overload) don't apply
		if (loadKind === 'cardio') {
			if (!cardioTypes.includes(chartType)) return 'total-time';
			return chartType !== 'total-time' && !hasDistance ? 'total-time' : chartType;
		}
		if (cardioTypes.includes(chartType)) return 'estimated-1rm';
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
		'session-volume': 'Session volume',
		'total-time': 'Total time',
		'total-distance': 'Total distance',
		pace: 'Pace'
	};
	let oneLineType = $derived(oneLineTypes[shownChartType]);
	let homeUnit = $derived($page.data.homeWeightUnit ?? 'KG');
	let unitText = $derived(homeUnit === 'LB' ? 'lb' : 'kg');
	let selectedSets: string[] = $state([]);
	let shownValues: (number | null)[][] = $state([]);

	// "latest" is the most recent workout with an estimate; the change runs from the first one shown
	let estimateSummary = $derived.by(() => {
		if (shownChartType !== 'estimated-1rm' && !cardioTypes.includes(shownChartType)) return null;
		const points = (shownValues[0] ?? []).filter((value): value is number => value !== null);
		const latest = points.at(-1);
		if (latest === undefined) return null;
		const change = points.length > 1 ? latest - points[0] : null;
		const sign = change === null ? '' : change < 0 ? '−' : '+';
		// Times and paces are charted in minutes; said as m:ss
		if (shownChartType === 'total-time' || shownChartType === 'pace') {
			const per = shownChartType === 'pace' ? ` ${paceDenominator(distanceUnit).label}` : '';
			return {
				title: oneLineTypes[shownChartType]!,
				latest: `${formatDuration(latest * 60)}${per}`,
				change: change === null ? null : `${sign}${formatDuration(Math.abs(change) * 60)}`
			};
		}
		if (shownChartType === 'total-distance') {
			return {
				title: 'Total distance',
				latest: `${latest} ${distanceUnitLabel(distanceUnit)}`,
				change: change === null ? null : `${sign}${roundDistance(Math.abs(change))}`
			};
		}
		return {
			title: 'Estimated 1RM',
			latest: `${latest.toFixed(2)} ${unitText}${isBodyweight ? ' incl. BW' : ''}`,
			change: change === null ? null : `${sign}${Math.abs(change).toFixed(2)}`
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

		// Cardio: one point per workout, from the intervals done. Minutes, so the axis reads evenly
		const totalSeconds = (ex: (typeof nonSkippedExercises)[number]) =>
			ex.sets.reduce((total, set) => total + (set.timeSeconds ?? 0), 0);
		const totalMeters = (ex: (typeof nonSkippedExercises)[number]) =>
			ex.sets.reduce((total, set) => total + (set.distanceMeters ?? 0), 0);
		const minutes = (seconds: number) => Math.round((seconds / 60) * 100) / 100;

		if (shownChartType === 'total-time') {
			dataValues = [nonSkippedExercises.map((ex) => minutes(totalSeconds(ex)))];
		} else if (shownChartType === 'total-distance') {
			dataValues = [
				nonSkippedExercises.map((ex) => {
					const meters = totalMeters(ex);
					return meters > 0 ? roundDistance(fromMeters(meters, distanceUnit)) : null;
				})
			];
		} else if (shownChartType === 'pace') {
			dataValues = [
				nonSkippedExercises.map((ex) => {
					const [seconds, meters] = [totalSeconds(ex), totalMeters(ex)];
					if (seconds <= 0 || meters <= 0) return null;
					return minutes((seconds / meters) * paceDenominator(distanceUnit).meters);
				})
			];
		} else if (shownChartType === 'estimated-1rm') {
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
		const oneLineUnit =
			shownChartType === 'total-time'
				? 'min'
				: shownChartType === 'total-distance'
					? distanceUnitLabel(distanceUnit)
					: shownChartType === 'pace'
						? `min ${paceDenominator(distanceUnit).label}`
						: `${unitText}${shownChartType === 'estimated-1rm' && isBodyweight ? ', incl. BW' : ''}`;
		const oneLineLabel = oneLineType && `${oneLineType} (${oneLineUnit})`;
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
							// Which set the estimate is from, e.g. "80 kg × 8, RIR 2"; a time or pace as m:ss
							afterLabel: (item) => {
								if (shownChartType === 'total-time' || shownChartType === 'pace') {
									const value = item.parsed.y;
									return typeof value === 'number' ? formatDuration(value * 60) : '';
								}
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
					>{:else if loadKind === 'cardio'}<span
						class="ml-2 text-sm font-normal text-muted-foreground"
						data-testid="stats-cardio">cardio</span
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
								if (value === 'weights' || value === 'levels' || value === 'cardio') loadKind = value;
							}}
							type="single"
							value={loadKind}
						>
							{#each kinds as kind}
								<ToggleGroup.Item size="sm" value={kind}>{kindLabels[kind]}</ToggleGroup.Item>
							{/each}
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
						{#if loadKind === 'cardio'}
							{@render option('total-time', 'Total time')}
							{#if hasDistance}
								{@render option('total-distance', 'Total distance')}
								{@render option('pace', 'Pace')}
							{/if}
						{:else if repsOnly}
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
				{[estimateSummary.title, `latest ${estimateSummary.latest}`, estimateSummary.change]
					.filter(Boolean)
					.join(' · ')}
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
