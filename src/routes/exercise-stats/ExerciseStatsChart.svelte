<script lang="ts">
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
	import { solveBergerFormula } from '$lib/utils/workoutUtils';
	import {
		CategoryScale,
		Chart,
		Filler,
		LinearScale,
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
	let chartType = $state<'relative-overload' | 'absolute-load' | 'load-and-bodyweight' | 'reps'>('relative-overload');
	// For levels, the level itself (the overload formula and bodyweight are for weights)
	let shownChartType = $derived(loadKind === 'levels' && chartType !== 'reps' ? ('absolute-load' as const) : chartType);
	let selectedSets: string[] = $state([]);

	$effect(() => {
		selectedSets = Array.from({ length: Math.min(maxSets, 2) }, (_, idx) => idx.toString());
	});

	$effect(() => {
		if (chartCanvas === undefined) return;
		if (chart) chart.destroy();

		const colors = generateShadesAndTints(maxSets);
		let dataValues: (number | null)[][];

		const nonSkippedExercises = exercises
			.map((ex) => ({ ...ex, sets: ex.sets.filter((set) => !set.skipped) }))
			.filter((ex) => ex.sets.length > 0);

		if (shownChartType === 'relative-overload') {
			dataValues = Array.from({ length: maxSets }, (_, setIdx) =>
				nonSkippedExercises.map((ex, idx) => {
					if (idx === 0) return 0;
					const oldestSet = nonSkippedExercises.find((ex) => ex.sets[setIdx] && !ex.sets[setIdx].skipped)?.sets[setIdx];
					if (!oldestSet) return null;
					if (!selectedSets.includes(setIdx.toString())) return null;
					if (!ex.sets[setIdx]) return null;

					return solveBergerFormula({
						variableToSolve: 'OverloadPercentage',
						knownValues: {
							bodyweightFraction: ex.bodyweightFraction,
							newSet: ex.sets[setIdx],
							oldSet: oldestSet,
							oldUserBodyweight: idx === 0 ? ex.workout.userBodyweight : exercises[idx - 1].workout.userBodyweight,
							newUserBodyweight: ex.workout.userBodyweight
						}
					});
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

		chart = new Chart(chartCanvas, {
			type: 'line',
			data: {
				labels: nonSkippedExercises.map((ex) => new Date(ex.workout.startedAt)),
				datasets: dataValues.map((data, idx) => ({
					label: `Set ${idx + 1}`,
					data,
					borderColor: colors[idx],
					tension: 0.2,
					borderWidth: 2
				}))
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
					legend: {
						display: false
					}
				}
			}
		});
	});
</script>

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
					<RadioGroup.Root class="py-2" bind:value={chartType}>
						{#if loadKind === 'levels'}
							<div class="flex items-center space-x-2">
								<RadioGroup.Item value="absolute-load" id="absolute-load" />
								<Label for="absolute-load">Level</Label>
							</div>
						{:else}
							<div class="flex items-center space-x-2">
								<RadioGroup.Item value="relative-overload" id="relative-overload" />
								<Label for="relative-overload">Relative overload</Label>
							</div>
							<div class="flex items-center space-x-2">
								<RadioGroup.Item value="absolute-load" id="absolute-load" />
								<Label for="absolute-load">Absolute load</Label>
							</div>
						{/if}
						<div class="flex items-center space-x-2">
							<RadioGroup.Item value="reps" id="reps" />
							<Label for="reps">Reps</Label>
						</div>
						{#if loadKind === 'weights' && typeof exercises.at(0)?.bodyweightFraction === 'number'}
							<div class="flex items-center space-x-2">
								<RadioGroup.Item value="load-and-bodyweight" id="load-and-bodyweight" />
								<Label for="load-and-bodyweight">Load + BW</Label>
							</div>
						{/if}
					</RadioGroup.Root>

					<Separator class="my-2" />

					<span class="font-semibold">Sets to graph</span>
					<ToggleGroup.Root class="justify-start py-1" type="multiple" bind:value={selectedSets}>
						{#each Array.from({ length: maxSets }) as _, idx}
							<ToggleGroup.Item size="sm" value={idx.toString()}>{idx + 1}</ToggleGroup.Item>
						{/each}
					</ToggleGroup.Root>
				</Popover.Content>
			</Popover.Root>
		</div>
	</Card.Header>
	<Card.Content>
		{#if allExercises.length === 0}
			<div class="flex items-center gap-2 px-2 text-sm text-muted-foreground">
				<LoaderCircle class="animate-spin" /> Fetching performances
			</div>
		{:else}
			<canvas bind:this={chartCanvas} height="240"></canvas>
		{/if}
	</Card.Content>
</Card.Root>
