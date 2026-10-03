<script lang="ts">
	import { page } from '$app/stores';
	import { availableWeightsFor, weightsAround } from '$lib/utils/weightSets';
	import { formatWeight, fromKg, isLevelUnit, roundWeight, unitLabel } from '$lib/utils/weightUnits';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Popover from '$lib/components/ui/popover';
	import { Separator } from '$lib/components/ui/separator';
	import { arraySum, floorToNearestMultiple } from '$lib/utils';
	import {
		cleanupInProgressMiniSets,
		solveBergerFormula,
		type WorkoutExerciseInProgress
	} from '$lib/utils/workoutUtils';
	import CheckIcon from 'virtual:icons/lucide/check';
	import ArrowDownIcon from 'virtual:icons/lucide/chevron-down';
	import RemoveIcon from 'virtual:icons/lucide/minus';
	import AddIcon from 'virtual:icons/lucide/plus';
	import TargetIcon from 'virtual:icons/lucide/target';
	import UndoIcon from 'virtual:icons/lucide/undo';
	import XIcon from 'virtual:icons/lucide/x';
	import { workoutRunes } from '../../workoutRunes.svelte';
	import { SvelteSet } from 'svelte/reactivity';

	type PropsType = {
		exercise: WorkoutExerciseInProgress;
		originalSetLoads: (number | undefined)[];
		/** Reps only: no load to enter (it's 0) */
		repsOnly?: boolean;
	};
	type WorkoutExerciseSet = WorkoutExerciseInProgress['sets'][number];
	let { exercise = $bindable(), originalSetLoads = $bindable(), repsOnly = false }: PropsType = $props();

	// Sets someone tried to tick with a box still empty. The notes and outlines are worked out from these
	// sets as they are now, so they follow a set when others are added or removed, and go once it's filled
	type Missing = 'reps' | 'load' | 'RIR';
	const triedToTick = new SvelteSet<WorkoutExerciseSet>();

	// Loads here are in the exercise's unit; bodyweight is stored in kg
	function inExerciseUnit(kg: number | null | undefined) {
		return typeof kg === 'number' ? fromKg(kg, exercise.weightUnit ?? 'KG') : undefined;
	}

	// Myo-rep sets share set 1's load; every other set type has a load per set
	let isSameLoadExercise = $derived(['Myorep', 'MyorepMatch'].includes(exercise.setType));
	// A machine's level, not a weight: no bodyweight, and no rep adjusting by weight
	let isLevels = $derived(isLevelUnit(exercise.weightUnit));

	let missingBySet = $derived(
		exercise.sets.map((set, idx) =>
			triedToTick.has(set) && !set.completed && !set.skipped ? missingFields(set, idx) : []
		)
	);
	let missingNotes = $derived(
		missingBySet.flatMap((fields, idx) => (fields.length > 0 ? [`Set ${idx + 1}: enter ${fields.join(' and ')}`] : []))
	);
	const isMissing = (idx: number, field: Missing) => missingBySet[idx]?.includes(field) ?? false;

	/** The boxes a set still needs before it can be ticked */
	function missingFields(set: WorkoutExerciseSet, idx: number): Missing[] {
		const fields: Missing[] = [];
		if (typeof set.reps !== 'number') fields.push('reps');
		const loadSet = isSameLoadExercise ? exercise.sets[0] : set;
		if (!repsOnly && typeof loadSet?.load !== 'number' && (idx === 0 || !isSameLoadExercise)) fields.push('load');
		if (typeof set.RIR !== 'number') fields.push('RIR');
		return fields;
	}

	/** Ticks or unticks a set, in any order */
	function toggleSet(set: WorkoutExerciseSet, idx: number) {
		if (set.skipped) {
			set.skipped = false;
			workoutRunes.workoutExercises = workoutRunes.workoutExercises;
			return;
		}
		if (!set.completed) {
			if (repsOnly) set.load = 0;
			if (isSameLoadExercise && idx > 0) set.load = exercise.sets[0].load;
			if (missingFields(set, idx).length > 0) {
				triedToTick.add(set);
				return;
			}
			triedToTick.delete(set);
			// Set 1's weight is a starting point for sets without one yet
			if (idx === 0) fillEmptyLoads();
		}
		set.completed = !set.completed;
		workoutRunes.workoutExercises = workoutRunes.workoutExercises;
	}

	/** Copies set 1's load into later sets: all of them for myo-rep sets, otherwise only empty boxes */
	function fillEmptyLoads() {
		const firstLoad = exercise.sets[0]?.load;
		if (typeof firstLoad !== 'number') return;
		exercise.sets.forEach((set, idx) => {
			if (idx === 0 || set.completed) return;
			if (isSameLoadExercise || typeof set.load !== 'number') set.load = firstLoad;
		});
	}

	/** A new set at the end, a copy of the last one's numbers, not ticked */
	function addSet() {
		const last = exercise.sets.at(-1);
		exercise.sets.push({
			reps: last?.reps,
			load: last?.load,
			RIR: last?.RIR,
			completed: false,
			skipped: false,
			miniSets: []
		});
		originalSetLoads.push(undefined);
		workoutRunes.workoutExercises = workoutRunes.workoutExercises;
	}

	function removeSet(idx: number) {
		if (exercise.sets.length <= 1) return;
		triedToTick.delete(exercise.sets[idx]);
		exercise.sets.splice(idx, 1);
		originalSetLoads.splice(idx, 1);
		workoutRunes.workoutExercises = workoutRunes.workoutExercises;
	}

	function shouldMiniSetBeDisabled(setIndex: number, miniSetIndex: number) {
		const parentSet = exercise.sets[setIndex];
		if (miniSetIndex === 0) return !parentSet.completed;
		return !parentSet.miniSets[miniSetIndex - 1].completed;
	}

	function addMiniSet(setIndex: number) {
		let load: undefined | number;
		if (exercise.setType === 'MyorepMatch') load = exercise.sets[0].load;
		if (exercise.setType === 'MyorepMatchDown') load = exercise.sets[setIndex].load;
		exercise.sets[setIndex].miniSets.push({
			completed: false,
			reps: undefined,
			load,
			RIR: undefined
		});
	}

	function completeMiniSet(e: SubmitEvent, set: WorkoutExerciseSet, miniSetIndex: number) {
		e.preventDefault();
		const miniSet = set.miniSets[miniSetIndex];
		if (exercise.setType === 'MyorepMatchDown') miniSet.load = set.load;
		if (exercise.setType === 'MyorepMatch') miniSet.load = exercise.sets[0].load;
		// Its numbers first, like a set
		if (!miniSet.completed && [miniSet.reps, miniSet.load, miniSet.RIR].some((value) => typeof value !== 'number'))
			return;
		miniSet.completed = !miniSet.completed;
		workoutRunes.workoutExercises = workoutRunes.workoutExercises;
	}

	function calculateNextLoad(setIdx: number) {
		const firstSet = exercise.sets[0];
		if (typeof firstSet.load !== 'number') return 0;
		if (!exercise.changeType || setIdx === 0) return 0;
		if (exercise.changeAmount === null || exercise.changeAmount === undefined) return 0;

		if (exercise.setType === 'Down') setIdx = -setIdx;
		if (exercise.changeType === 'AbsoluteLoad') {
			return firstSet.load + setIdx * exercise.changeAmount;
		}
		return firstSet.load * (1 + setIdx * (exercise.changeAmount / 100));
	}

	/** For bodyweight exercises: what a set counts as, e.g. -20 at 100 kg = 80 kg, 80% of bodyweight */
	function countedLoad(load: number | undefined) {
		const bodyweightKg = workoutRunes.workoutData?.userBodyweight;
		if (isLevels || typeof exercise.bodyweightFraction !== 'number' || typeof load !== 'number' || !bodyweightKg)
			return null;
		const bodyweight = fromKg(bodyweightKg, exercise.weightUnit ?? 'KG');
		const total = roundWeight(exercise.bodyweightFraction * bodyweight + load);
		return { total, percentage: Math.round((total / bodyweight) * 100) };
	}

	function getNextLoad(setIdx: number) {
		if (!['Down'].includes(exercise.setType)) return;
		if (typeof exercise.sets[0].load !== 'number') return;
		// Down to the weight the gym has, else the weight step
		const nextLoad = calculateNextLoad(setIdx);
		const weights = availableWeightsFor(exercise, $page.data.weightSets ?? []);
		if (weights) return (weightsAround(weights, nextLoad).below ?? weights[0]).toString();
		return floorToNearestMultiple(nextLoad, exercise.minimumWeightChange ?? 5).toString();
	}

	function getRemainingMyorepMatchReps(setIdx: number) {
		const firstSet = exercise.sets[0];
		const set = exercise.sets[setIdx];
		if (firstSet.reps === undefined) return;
		if (set.reps === undefined) return firstSet.reps;
		return firstSet.reps - set.reps - arraySum(set.miniSets.map((miniSet) => miniSet.reps ?? 0));
	}

	function getMiniSetLoad(setIdx: number, miniSetIdx: number) {
		if (exercise.setType !== 'Drop') return;
		if (exercise.changeAmount === null || exercise.changeAmount === undefined) return;
		let set = exercise.sets[setIdx];

		if (typeof set.load === 'number') {
			if (exercise.changeType === 'AbsoluteLoad') return set.load - (miniSetIdx + 1) * exercise.changeAmount;
			return set.load * (1 - (miniSetIdx + 1) * (exercise.changeAmount / 100));
		}
	}

	function adjustLoads(setIdx: number) {
		let extraOverloadAchieved = 0;
		const exerciseSet = exercise.sets[setIdx];
		const newLoad = exerciseSet.load;
		const oldLoad = originalSetLoads[setIdx];
		if (newLoad === undefined || oldLoad === undefined) return;

		if (!isSameLoadExercise) {
			if (exerciseSet.reps === undefined || exerciseSet.RIR === undefined) return;
			const newReps = Math.round(
				solveBergerFormula({
					variableToSolve: 'NewReps',
					knownValues: {
						oldSet: {
							reps: exerciseSet.reps,
							load: oldLoad,
							RIR: exerciseSet.RIR,
							miniSets: cleanupInProgressMiniSets(exerciseSet.miniSets)
						},
						newSet: { load: newLoad, RIR: exerciseSet.RIR, miniSets: cleanupInProgressMiniSets(exerciseSet.miniSets) },
						oldUserBodyweight: inExerciseUnit(workoutRunes.previousWorkoutData?.userBodyweight),
						newUserBodyweight: inExerciseUnit(workoutRunes.workoutData?.userBodyweight) as number,
						bodyweightFraction: exercise.bodyweightFraction ?? null,
						overloadPercentage: 0
					}
				})
			);
			exercise.sets[setIdx] = { ...exerciseSet, reps: newReps, load: newLoad };
			originalSetLoads[setIdx] = newLoad;
			return;
		}

		exercise.sets.forEach((set, setIdx) => {
			if (set.reps === undefined || set.RIR === undefined) return;

			const newReps = Math.round(
				solveBergerFormula({
					variableToSolve: 'NewReps',
					knownValues: {
						oldSet: { reps: set.reps, load: oldLoad, RIR: set.RIR, miniSets: cleanupInProgressMiniSets(set.miniSets) },
						newSet: { load: newLoad, RIR: set.RIR, miniSets: cleanupInProgressMiniSets(set.miniSets) },
						oldUserBodyweight: inExerciseUnit(workoutRunes.previousWorkoutData?.userBodyweight),
						newUserBodyweight: inExerciseUnit(workoutRunes.workoutData?.userBodyweight) as number,
						bodyweightFraction: exercise.bodyweightFraction ?? null,
						overloadPercentage: -extraOverloadAchieved
					}
				})
			);

			extraOverloadAchieved += solveBergerFormula({
				variableToSolve: 'OverloadPercentage',
				knownValues: {
					oldSet: { reps: set.reps, load: oldLoad, RIR: set.RIR, miniSets: cleanupInProgressMiniSets(set.miniSets) },
					newSet: { reps: newReps, load: newLoad, RIR: set.RIR, miniSets: cleanupInProgressMiniSets(set.miniSets) },
					oldUserBodyweight: inExerciseUnit(workoutRunes.previousWorkoutData?.userBodyweight),
					newUserBodyweight: inExerciseUnit(workoutRunes.workoutData?.userBodyweight) as number,
					bodyweightFraction: exercise.bodyweightFraction ?? null
				}
			});

			exercise.sets[setIdx] = { ...set, reps: newReps, load: newLoad };
			originalSetLoads[setIdx] = newLoad;
		});
	}
</script>

<div class="grid grid-cols-[1fr_1fr_1fr_auto] gap-1">
	<span class="text-center text-sm font-medium">Reps</span>
	<span class="text-center text-sm font-medium">
		{#if repsOnly}
			<span class="sr-only">No load</span>
		{:else if isLevels}
			Level
		{:else if typeof exercise.bodyweightFraction === 'number'}
			+/− {unitLabel(exercise.weightUnit ?? 'KG')}
			<Popover.Root>
				<Popover.Trigger>
					<span class="text-xs font-semibold text-muted-foreground underline">(BW)</span>
				</Popover.Trigger>
				<Popover.Content>
					<p class="text-sm text-muted-foreground">
						Enter added weight as a positive number (e.g. 10 for a plate on a belt), and help as a negative number (e.g.
						-20 on an assisted machine). Plain bodyweight is 0.
						<br /><br />
						{Math.round(exercise.bodyweightFraction * 100)}% of your bodyweight ({formatWeight(
							exercise.bodyweightFraction * workoutRunes.workoutData!.userBodyweight!,
							exercise.weightUnit ?? 'KG'
						)}) is counted automatically.
					</p>
				</Popover.Content>
			</Popover.Root>
		{:else}
			Load
		{/if}
	</span>
	<span class="text-center text-sm font-medium">RIR</span>
	<span></span>
	{#each exercise.sets as set, idx}
		<form
			class="contents"
			novalidate
			onsubmit={(e) => {
				e.preventDefault();
				toggleSet(set, idx);
			}}
		>
			{#if exercise.setType === 'TopBackoff' && idx === 1}
				<div class="col-span-full flex items-center gap-2 text-muted-foreground">
					<Separator class="w-px grow" />
					<ArrowDownIcon />
					<span class="text-center text-sm"> Backoff sets</span>
					<ArrowDownIcon />
					<Separator class="w-px grow" />
				</div>
			{/if}
			{#if !set.skipped}
				<Input
					id="{exercise.name}-set-{idx + 1}-reps"
					class={isMissing(idx, 'reps') ? 'border-destructive' : ''}
					aria-invalid={isMissing(idx, 'reps')}
					disabled={set.completed}
					min={1}
					type="number"
					bind:value={set.reps}
				/>
				{#if repsOnly}
					<span
						class="grid place-items-center text-sm text-muted-foreground"
						data-testid="{exercise.name}-set-{idx + 1}-no-load">–</span
					>
				{:else if idx === 0 || !isSameLoadExercise}
					<Input
						id="{exercise.name}-set-{idx + 1}-load"
						class={isMissing(idx, 'load') ? 'border-destructive' : ''}
						aria-invalid={isMissing(idx, 'load')}
						disabled={set.completed}
						aria-label={isLevels ? `Set ${idx + 1} level` : undefined}
						min={isLevels ? 1 : exercise.bodyweightFraction ? undefined : 0.25}
						placeholder={getNextLoad(idx)}
						step={isLevels ? 1 : 0.25}
						type="number"
						bind:value={set.load}
					/>
				{:else}
					<span></span>
				{/if}
				<Input
					id="{exercise.name}-set-{idx + 1}-RIR"
					class={isMissing(idx, 'RIR') ? 'border-destructive' : ''}
					aria-invalid={isMissing(idx, 'RIR')}
					disabled={set.completed}
					type="number"
					bind:value={set.RIR}
				/>
			{:else}
				<div class="col-span-3 flex items-center gap-2">
					<Separator class="w-px grow" />
					<span class="text-sm text-muted-foreground">skipped</span>
					<Separator class="w-px grow" />
				</div>
			{/if}
			<div class="flex items-center justify-end gap-0.5">
				{#if !repsOnly && (idx === 0 || !isSameLoadExercise)}
					{@const hasLoadChanged =
						!isLevels && set.load !== originalSetLoads[idx] && originalSetLoads[idx] !== undefined}
					{#if hasLoadChanged && !set.completed}
						<Button
							class="h-7 w-7 p-1"
							aria-label="Adjust reps to the new load"
							data-testid="{exercise.name}-set-{idx + 1}-adjust-reps"
							onclick={() => adjustLoads(idx)}
							variant="outline"
						>
							<TargetIcon />
						</Button>
					{/if}
				{/if}
				<Button
					class="h-7 w-7 p-1 text-muted-foreground"
					aria-label="Remove set {idx + 1} of {exercise.name}"
					data-testid="{exercise.name}-set-{idx + 1}-remove"
					disabled={exercise.sets.length <= 1}
					onclick={() => removeSet(idx)}
					variant="ghost"
				>
					<XIcon />
				</Button>
				<Button
					class="h-9 w-9 border-2 p-1"
					aria-checked={set.completed}
					aria-label="Set {idx + 1} of {exercise.name} done"
					data-testid="{exercise.name}-set-{idx + 1}-action"
					role="checkbox"
					size="icon"
					type="submit"
					variant={set.completed ? 'default' : 'outline'}
				>
					{#if set.skipped}
						<UndoIcon />
					{:else if set.completed}
						<CheckIcon />
					{/if}
				</Button>
			</div>
		</form>
		{@const bodyweightLoad = countedLoad(isSameLoadExercise ? exercise.sets[0].load : set.load)}
		{#if bodyweightLoad && !set.skipped}
			<span
				class="col-span-full -mt-1 text-xs text-muted-foreground"
				data-testid="{exercise.name}-set-{idx + 1}-counted"
			>
				= {bodyweightLoad.total}
				{unitLabel(exercise.weightUnit ?? 'KG')} · {bodyweightLoad.percentage}% of bodyweight
			</span>
		{/if}
		{#if (idx > 0 && (exercise.setType === 'MyorepMatch' || exercise.setType === 'MyorepMatchDown')) || exercise.setType === 'Drop'}
			{#each set.miniSets as miniSet, miniIdx}
				{@const miniSetButtonDisabled = shouldMiniSetBeDisabled(idx, miniIdx)}
				{#if set.skipped}
					<div class="col-span-3 flex items-center gap-2">
						<Separator class="w-px grow" />
						<span class="text-sm text-muted-foreground">skipped</span>
						<Separator class="w-px grow" />
					</div>
					<Button class="place-self-end" disabled size="icon" variant="secondary">
						<CheckIcon />
					</Button>
				{:else}
					<form class="contents" novalidate onsubmit={(e) => completeMiniSet(e, set, miniIdx)}>
						<Input
							id="{exercise.name}-set-{idx + 1}-mini-set-{miniIdx + 1}-reps"
							disabled={miniSet.completed}
							min={1}
							required
							type="number"
							bind:value={miniSet.reps}
						/>
						{#if exercise.setType === 'MyorepMatch' || exercise.setType === 'MyorepMatchDown'}
							<span></span>
						{:else}
							{@const expectedLoad = getMiniSetLoad(idx, miniIdx)}
							<Input
								id="{exercise.name}-set-{idx + 1}-mini-set-{miniIdx + 1}-load"
								disabled={miniSet.completed}
								min={exercise.bodyweightFraction ? undefined : 0}
								placeholder={expectedLoad === undefined ? expectedLoad : expectedLoad.toString()}
								required
								step={0.25}
								type="number"
								bind:value={miniSet.load}
							/>
						{/if}
						<Input
							id="{exercise.name}-set-{idx + 1}-mini-set-{miniIdx + 1}-RIR"
							disabled={miniSet.completed}
							required
							type="number"
							bind:value={miniSet.RIR}
						/>
						<Button
							class="h-9 w-9 place-self-end border-2 p-1"
							aria-checked={miniSet.completed}
							aria-label="Set {idx + 1} mini-set {miniIdx + 1} of {exercise.name} done"
							data-testid="{exercise.name}-set-{idx + 1}-mini-set-{miniIdx + 1}-action"
							disabled={miniSetButtonDisabled}
							role="checkbox"
							size="icon"
							type="submit"
							variant={miniSet.completed ? 'default' : 'outline'}
						>
							{#if miniSet.completed}
								<CheckIcon />
							{/if}
						</Button>
					</form>
				{/if}
			{/each}
			<Button
				aria-label="add-mini-set-to-set-{idx + 1}-of-{exercise.name}"
				onclick={() => addMiniSet(idx)}
				variant="secondary"
			>
				<AddIcon />
			</Button>
			<Button
				aria-label="remove-mini-set-from-set-{idx + 1}-of-{exercise.name}"
				disabled={set.miniSets.length === 0}
				onclick={() => set.miniSets.pop()}
				variant="secondary"
			>
				<RemoveIcon />
			</Button>
			{#if exercise.setType === 'MyorepMatch' || exercise.setType === 'MyorepMatchDown'}
				{@const repsLeft = getRemainingMyorepMatchReps(idx)}
				<span class="grid place-items-center text-sm font-medium text-primary">
					{#if repsLeft && repsLeft > 0}
						{repsLeft} {repsLeft === 1 ? 'rep' : 'reps'} left
					{:else if typeof repsLeft === 'number'}
						matched
					{/if}
				</span>
			{:else}
				<span></span>
			{/if}
			<span></span>
		{/if}
	{/each}
	{#if missingNotes.length > 0}
		<div class="col-span-full text-sm text-destructive" data-testid="{exercise.name}-missing" role="alert">
			{#each missingNotes as note}
				<p>{note}</p>
			{/each}
		</div>
	{/if}
	<Button
		class="col-span-full mt-1 h-8 gap-1"
		aria-label="Add a set to {exercise.name}"
		data-testid="{exercise.name}-add-set"
		onclick={addSet}
		size="sm"
		variant="ghost"
	>
		<AddIcon class="h-4 w-4" /> Add set
	</Button>
</div>
