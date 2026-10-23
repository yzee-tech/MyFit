<script lang="ts">
	import { defaultWeightStep, fromKg, roundWeight, snapToStep, toKg, unitLabel } from '$lib/utils/weightUnits';
	import { bestRecentEstimate, canWarmUp, estimatedOneRepMax, warmUpPlan } from '$lib/utils/oneRepMax';
	import { trpc } from '$lib/trpc/client';
	import { availableWeightsFor, weightsAround } from '$lib/utils/weightSets';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Popover from '$lib/components/ui/popover';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Table from '$lib/components/ui/table';
	import { untrack } from 'svelte';
	import CalculatorIcon from 'virtual:icons/lucide/calculator';
	import { workoutRunes } from '../../workoutRunes.svelte';

	type WarmUpSet = { reps: number; load: number; percentage: number };

	let exercise = $derived(workoutRunes.exerciseWarmUpDialogExercise);
	let unit = $derived(exercise?.weightUnit ?? 'KG');
	let shown = $derived(exercise !== undefined && canWarmUp(exercise, exercise.name in workoutRunes.repsOnly));
	let oneRepMax = $state<number>();
	/** Where the one rep max came from, e.g. "Best of your last 3 times: Oct 20, 80 kg × 8, RIR 2" */
	let oneRepMaxSource = $state<string>();
	let totalWarmUpSets = $state(3);

	let oneRepMaxCalculatorOpen = $state(false);
	let weight = $state<number>();
	let reps = $state<number>();
	let RIR = $state<number>();

	let warmUpSets = $state<WarmUpSet[]>();

	// Each opening's history request: an answer for an exercise opened before is ignored
	let openedCount = 0;

	// Each time it opens, even for the same exercise again
	$effect(() => {
		const opened = workoutRunes.exerciseWarmUpDialogOpen ? workoutRunes.exerciseWarmUpDialogExercise : undefined;
		if (opened) {
			untrack(() => {
				const request = ++openedCount;
				// Until the history is in (or without it: none yet, or offline), from set 1 of today
				weight = opened.sets[0]?.load ?? 0;
				reps = opened.sets[0]?.reps ?? 0;
				RIR = opened.sets[0]?.RIR ?? 0;
				warmUpSets = undefined;
				oneRepMax = undefined;
				oneRepMaxSource = undefined;
				calculateOneRepMax();
				if (!canWarmUp(opened, opened.name in workoutRunes.repsOnly)) return;
				prefillFromHistory(opened.name, opened.weightUnit ?? 'KG', request);
			});
		}
	});

	async function prefillFromHistory(exerciseName: string, shownUnit: typeof unit, request: number) {
		let pastExercises;
		try {
			pastExercises = await trpc().workouts.getExerciseHistory.query({ exerciseName, pageSize: 3 });
		} catch {
			return;
		}
		if (request !== openedCount) return;
		const best = bestRecentEstimate(pastExercises);
		if (!best) return;
		// History is in kg; shown in the exercise's unit
		const { set, pastExercise } = best;
		const date = new Date(pastExercise.workout.startedAt).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric'
		});
		const times = pastExercises.length === 1 ? 'your last time' : `your last ${pastExercises.length} times`;
		oneRepMax = roundWeight(fromKg(best.estimateKg, shownUnit));
		oneRepMaxSource = `Best of ${times}: ${date}, ${roundWeight(fromKg(set.load, shownUnit))} ${unitLabel(shownUnit)} × ${set.reps}, RIR ${set.RIR}`;
	}

	function calculateOneRepMax() {
		if (weight === undefined || reps === undefined) return;
		// The same in either unit: the load is the only weight in it
		const estimate = estimatedOneRepMax(toKg(weight, unit), reps, RIR ?? 0);
		if (estimate !== null) oneRepMax = roundWeight(fromKg(estimate, unit));
	}

	function submitOneRepMax(e: SubmitEvent) {
		e.preventDefault();
		calculateOneRepMax();
		oneRepMaxSource = undefined;
		oneRepMaxCalculatorOpen = false;
	}

	// Round warm-up weights to the nearest weight the gym has, else the unit's usual step (2.5 kg / 5 lb)
	let warmUpStep = $derived(defaultWeightStep(workoutRunes.exerciseWarmUpDialogExercise?.weightUnit ?? 'KG'));
	let warmUpWeights = $derived(
		workoutRunes.exerciseWarmUpDialogExercise
			? availableWeightsFor(workoutRunes.exerciseWarmUpDialogExercise, $page.data.weightSets ?? [])
			: null
	);
	function roundWarmUpWeight(value: number) {
		if (!warmUpWeights) return snapToStep(value, warmUpStep);
		const { below, above } = weightsAround(warmUpWeights, value);
		if (below === null || above === null) return (below ?? above)!;
		return value - below <= above - value ? below : above;
	}

	function generateWarmUp(e: SubmitEvent) {
		e.preventDefault();
		if (oneRepMax === undefined || totalWarmUpSets === undefined) return;
		const max = oneRepMax;
		warmUpSets = warmUpPlan(totalWarmUpSets).map(({ reps, fraction, percentage }) => ({
			reps,
			load: roundWarmUpWeight(max * fraction),
			percentage
		}));
	}
</script>

<Sheet.Root bind:open={workoutRunes.exerciseWarmUpDialogOpen}>
	<Sheet.Content class="w-5/6">
		<Sheet.Header>
			<Sheet.Title>Warm up</Sheet.Title>
			<Sheet.Description>{exercise?.name}</Sheet.Description>
		</Sheet.Header>
		{#if exercise && shown}
			<form class="grid gap-2 py-4" onsubmit={generateWarmUp}>
				<div class="flex w-full max-w-sm flex-col gap-1.5">
					<Label for="one-rep-max">One rep max ({unitLabel(unit)})</Label>
					<Input
						required
						id="one-rep-max"
						type="number"
						step={0.01}
						placeholder="Type here"
						bind:value={oneRepMax}
						oninput={() => (oneRepMaxSource = undefined)}
					/>
					{#if oneRepMaxSource}
						<p class="text-xs text-muted-foreground" data-testid="one-rep-max-source">{oneRepMaxSource}</p>
					{/if}
				</div>
				<div class="flex w-full max-w-sm flex-col gap-1.5">
					<Label for="total-warm-up-sets">Total warm-up sets</Label>
					<Input
						required
						id="total-warm-up-sets"
						type="number"
						min={1}
						placeholder="Type here"
						bind:value={totalWarmUpSets}
					/>
				</div>
				<Popover.Root bind:open={oneRepMaxCalculatorOpen} onOpenChange={(v) => (oneRepMaxCalculatorOpen = v)}>
					<Popover.Trigger asChild let:builder>
						<Button variant="secondary" builders={[builder]} class="gap-2">
							1-RM calculator
							<CalculatorIcon />
						</Button>
					</Popover.Trigger>
					<Popover.Content>
						<form onsubmit={submitOneRepMax} class="grid grid-cols-3 gap-1">
							<div class="flex w-full max-w-sm flex-col gap-1.5">
								<Label for="weight">Weight</Label>
								<Input required id="weight" type="number" step={0.25} placeholder="Type here" bind:value={weight} />
							</div>
							<div class="flex w-full max-w-sm flex-col gap-1.5">
								<Label for="reps">Reps</Label>
								<Input required id="reps" type="number" min={1} placeholder="Type here" bind:value={reps} />
							</div>
							<div class="flex w-full max-w-sm flex-col gap-1.5">
								<Label for="rir">RIR</Label>
								<Input id="rir" type="number" min={0} placeholder="0" bind:value={RIR} />
							</div>
							<Button type="submit" class="col-span-full">Calculate</Button>
						</form>
					</Popover.Content>
				</Popover.Root>
				<Button type="submit">Generate warm up</Button>
			</form>
		{/if}
		{#if warmUpSets && shown}
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head></Table.Head>
						<Table.Head>Reps</Table.Head>
						<Table.Head>Load</Table.Head>
						<Table.Head>%RM</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each warmUpSets as warmUpSet, idx}
						<Table.Row>
							<Table.Cell class="font-medium">{idx + 1}</Table.Cell>
							<Table.Cell>{warmUpSet.reps}</Table.Cell>
							<Table.Cell>{warmUpSet.load.toFixed(1)}</Table.Cell>
							<Table.Cell>{warmUpSet.percentage}</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		{/if}
	</Sheet.Content>
</Sheet.Root>
