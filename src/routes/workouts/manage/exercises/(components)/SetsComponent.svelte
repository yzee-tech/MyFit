<script lang="ts">
	import { page } from '$app/stores';
	import { availableWeightsFor, weightsAround } from '$lib/utils/weightSets';
	import { convertWeight, formatWeight, fromKg, isLevelUnit, roundWeight, unitLabel } from '$lib/utils/weightUnits';
	import { formatHintLoad, formatPreviousSet, type LoadKind } from '$lib/utils/previousSet';
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
	import UndoIcon from 'virtual:icons/lucide/undo';
	import TrashIcon from 'virtual:icons/lucide/trash-2';
	import { toast } from 'svelte-sonner';
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
		// A new workout ends at its last ticked set
		if (set.completed) workoutRunes.markActivity();
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

	/** Removes a set that isn't done yet (a ticked set is done: untick it first), with a way back */
	function removeSet(idx: number) {
		const set = exercise.sets[idx];
		if (exercise.sets.length <= 1 || !set || set.completed) return;
		const originalLoad = originalSetLoads[idx];
		// Its note about missing numbers comes back with it
		const wasTried = triedToTick.delete(set);
		exercise.sets.splice(idx, 1);
		originalSetLoads.splice(idx, 1);
		workoutRunes.workoutExercises = workoutRunes.workoutExercises;
		toast(`Set ${idx + 1} removed`, {
			action: { label: 'Undo', onClick: () => restoreSet(set, idx, originalLoad, wasTried) }
		});
	}

	/** Puts a removed set back where it was, with its numbers */
	function restoreSet(set: WorkoutExerciseSet, idx: number, originalLoad: number | undefined, wasTried: boolean) {
		const at = Math.min(idx, exercise.sets.length);
		exercise.sets.splice(at, 0, set);
		originalSetLoads.splice(at, 0, originalLoad);
		if (wasTried) triedToTick.add(exercise.sets[at]);
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
		if (miniSet.completed) workoutRunes.markActivity();
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

	// Narrow boxes, numbers centred, without the browser's up/down arrows
	const boxClass =
		'h-9 px-1 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

	// Editing a past workout: its numbers are the record, so no "last time" and no reps hints
	let editing = $derived(workoutRunes.editingWorkoutId !== null);
	let loadKind: LoadKind = $derived(
		repsOnly
			? 'repsOnly'
			: isLevels
				? 'level'
				: typeof exercise.bodyweightFraction === 'number'
					? 'bodyweight'
					: 'weight'
	);
	// The last time this exercise was done, set by set (loads in today's unit)
	let previousSets = $derived.by(() => {
		const previous = workoutRunes.previousWorkoutData?.exercises.find((ex) => ex.name === exercise.name);
		if (!previous) return [];
		// In the unit the exercise is in now (it can be switched during the workout)
		const from = previous.weightUnit ?? 'KG';
		const to = exercise.weightUnit ?? 'KG';
		return [...previous.sets]
			.sort((a, b) => a.setIndex - b.setIndex)
			.map((set) => ({ ...set, load: convertWeight(set.load, from, to) }));
	});
	/** Whether a set has a load box (myo-rep sets: set 1 only) */
	const hasLoadBox = (idx: number) => !repsOnly && (idx === 0 || !isSameLoadExercise);

	/** Last time's numbers for a set, into its boxes */
	function copyPrevious(idx: number) {
		const previous = previousSets[idx];
		const set = exercise.sets[idx];
		if (!previous || previous.skipped || !set || set.completed || set.skipped) return;
		set.reps = previous.reps;
		if (hasLoadBox(idx)) {
			set.load = previous.load;
			// Last time's reps go with last time's weight: nothing to adjust
			originalSetLoads[idx] = previous.load;
		}
		workoutRunes.workoutExercises = workoutRunes.workoutExercises;
	}

	type RepsHint = { load: number; reps: Map<number, number> };

	/**
	 * After a set's weight changes from where it started (the suggestion, or the last time a hint was
	 * used): about how many reps at the new weight for the same effort. Myo-rep sets share set 1's
	 * weight, so set 1's hint covers every set not done yet
	 */
	function repsHint(idx: number): RepsHint | null {
		if (editing || repsOnly || isLevels || !hasLoadBox(idx)) return null;
		const set = exercise.sets[idx];
		const startLoad = originalSetLoads[idx];
		const newLoad = set?.load;
		if (!set || set.completed || set.skipped || typeof newLoad !== 'number' || startLoad === undefined) return null;
		if (newLoad === startLoad) return null;

		// Today's bodyweight on both sides: the starting weight is from today too
		const bodyweight = inExerciseUnit(workoutRunes.workoutData?.userBodyweight) as number;
		const known = (from: WorkoutExerciseSet) => ({
			oldSet: { reps: from.reps!, load: startLoad, RIR: from.RIR!, miniSets: cleanupInProgressMiniSets(from.miniSets) },
			oldUserBodyweight: bodyweight,
			newUserBodyweight: bodyweight,
			bodyweightFraction: exercise.bodyweightFraction ?? null
		});
		const hasNumbers = (from: WorkoutExerciseSet) => typeof from.reps === 'number' && typeof from.RIR === 'number';
		const reps = new Map<number, number>();

		const sets = isSameLoadExercise ? exercise.sets.map((from, i) => [from, i] as const) : [[set, idx] as const];
		let extraOverloadAchieved = 0;
		for (const [from, i] of sets) {
			// A set already done keeps its numbers
			if (from.completed || from.skipped || !hasNumbers(from)) continue;
			const newSet = { load: newLoad, RIR: from.RIR!, miniSets: cleanupInProgressMiniSets(from.miniSets) };
			const newReps = Math.round(
				solveBergerFormula({
					variableToSolve: 'NewReps',
					knownValues: { ...known(from), newSet, overloadPercentage: -extraOverloadAchieved }
				})
			);
			if (!Number.isFinite(newReps) || newReps < 1) return null;
			if (isSameLoadExercise) {
				extraOverloadAchieved += solveBergerFormula({
					variableToSolve: 'OverloadPercentage',
					knownValues: { ...known(from), newSet: { ...newSet, reps: newReps } }
				});
			}
			reps.set(i, newReps);
		}
		return reps.size > 0 ? { load: newLoad, reps } : null;
	}

	/** The hint's words, e.g. "At 70 kg, aim for about 7 reps" */
	function describeHint(hint: RepsHint) {
		const at = formatHintLoad(hint.load, unitLabel(exercise.weightUnit ?? 'KG'), loadKind);
		const values = [...hint.reps.values()];
		if (!isSameLoadExercise) return `At ${at}, aim for about ${values[0]} reps`;
		if (new Set(values).size === 1) return `At ${at}, aim for about ${values[0]} reps on each set`;
		return `At ${at}, aim for about ${values.slice(0, -1).join(', ')} and ${values.at(-1)} reps`;
	}

	/** Fills in the hint's reps; the new weight is then where the set starts */
	function useHint(idx: number) {
		const hint = repsHint(idx);
		if (!hint) return;
		for (const [i, reps] of hint.reps) {
			exercise.sets[i].reps = reps;
			originalSetLoads[i] = hint.load;
		}
		originalSetLoads[idx] = hint.load;
		workoutRunes.workoutExercises = workoutRunes.workoutExercises;
	}
</script>

<!-- Set | Previous | load | Reps | RIR | tick | remove. Narrow boxes leave room for last time's numbers -->
<div
	class="grid items-center gap-1 {editing
		? 'grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_2.25rem_1.5rem]'
		: 'grid-cols-[1.5rem_minmax(0,1fr)_3.25rem_2.75rem_2.25rem_2.25rem_1.5rem] md:grid-cols-[2rem_minmax(0,1fr)_5rem_4.5rem_4rem_2.25rem_2.25rem]'}"
	data-testid="{exercise.name}-sets"
>
	<span class="text-center text-xs font-medium uppercase text-muted-foreground">Set</span>
	{#if !editing}
		<span class="text-xs font-medium uppercase text-muted-foreground">Previous</span>
	{/if}
	<span
		class="text-center text-xs font-medium leading-tight text-muted-foreground min-[375px]:whitespace-nowrap"
		data-testid="{exercise.name}-load-header"
	>
		{#if repsOnly}
			<span class="sr-only">No load</span>
		{:else if isLevels}
			LEVEL
		{:else if typeof exercise.bodyweightFraction === 'number'}
			<!-- Unit and (BW) side by side, or stacked on a very small phone -->
			<span class="flex flex-col items-center min-[375px]:flex-row min-[375px]:justify-center min-[375px]:gap-1">
				{unitLabel(exercise.weightUnit ?? 'KG').toUpperCase()}
				<Popover.Root>
					<Popover.Trigger>
						<span class="text-xs font-semibold text-muted-foreground underline">(BW)</span>
					</Popover.Trigger>
					<Popover.Content>
						<p class="text-sm text-muted-foreground">
							Enter added weight as a positive number (e.g. 10 for a plate on a belt), and help as a negative number
							(e.g. -20 on an assisted machine). Plain bodyweight is 0.
							<br /><br />
							{Math.round(exercise.bodyweightFraction * 100)}% of your bodyweight ({formatWeight(
								exercise.bodyweightFraction * workoutRunes.workoutData!.userBodyweight!,
								exercise.weightUnit ?? 'KG'
							)}) is counted automatically.
						</p>
					</Popover.Content>
				</Popover.Root>
			</span>
		{:else}
			{unitLabel(exercise.weightUnit ?? 'KG').toUpperCase()}
		{/if}
	</span>
	<span class="text-center text-xs font-medium uppercase text-muted-foreground">Reps</span>
	<span class="text-center text-xs font-medium uppercase text-muted-foreground">RIR</span>
	<span></span>
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
			<span
				class="text-center text-sm font-medium text-muted-foreground"
				data-testid="{exercise.name}-set-{idx + 1}-number"
			>
				{idx + 1}
			</span>
			{#if !editing}
				{@const previous = formatPreviousSet(previousSets[idx], loadKind)}
				{#if previous !== '–' && !set.completed && !set.skipped}
					<button
						class="truncate text-left text-xs text-muted-foreground underline-offset-2 hover:underline min-[375px]:text-sm"
						aria-label="Use last time's set {idx + 1} of {exercise.name}: {previous}"
						data-testid="{exercise.name}-set-{idx + 1}-previous"
						onclick={() => copyPrevious(idx)}
						type="button"
					>
						{previous}
					</button>
				{:else}
					<span
						class="truncate text-xs text-muted-foreground min-[375px]:text-sm"
						data-testid="{exercise.name}-set-{idx + 1}-previous"
					>
						{previous}
					</span>
				{/if}
			{/if}
			{#if !set.skipped}
				{#if repsOnly}
					<span
						class="grid place-items-center text-sm text-muted-foreground"
						data-testid="{exercise.name}-set-{idx + 1}-no-load">–</span
					>
				{:else if idx === 0 || !isSameLoadExercise}
					<Input
						id="{exercise.name}-set-{idx + 1}-load"
						class="{boxClass} {isMissing(idx, 'load') ? 'border-destructive' : ''}"
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
					id="{exercise.name}-set-{idx + 1}-reps"
					class="{boxClass} {isMissing(idx, 'reps') ? 'border-destructive' : ''}"
					aria-invalid={isMissing(idx, 'reps')}
					disabled={set.completed}
					min={1}
					type="number"
					bind:value={set.reps}
				/>
				<Input
					id="{exercise.name}-set-{idx + 1}-RIR"
					class="{boxClass} {isMissing(idx, 'RIR') ? 'border-destructive' : ''}"
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
			<!-- Less often needed than the tick, so after it. A ticked set is done: its space stays, the button doesn't -->
			<Button
				class="h-9 w-6 p-0.5 text-muted-foreground {set.completed ? 'invisible' : ''}"
				aria-hidden={set.completed}
				aria-label="Remove set {idx + 1} of {exercise.name}"
				data-testid="{exercise.name}-set-{idx + 1}-remove"
				disabled={exercise.sets.length <= 1 || set.completed}
				onclick={() => removeSet(idx)}
				tabindex={set.completed ? -1 : undefined}
				variant="ghost"
			>
				<TrashIcon class="h-4 w-4" />
			</Button>
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
		{@const hint = repsHint(idx)}
		{#if hint}
			<div
				class="col-span-full -mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"
				data-testid="{exercise.name}-set-{idx + 1}-reps-hint"
			>
				<span>{describeHint(hint)}</span>
				<span aria-hidden="true">·</span>
				<button
					class="font-medium text-primary underline-offset-2 hover:underline"
					aria-label="Use the suggested reps for set {idx + 1} of {exercise.name}"
					onclick={() => useHint(idx)}
					type="button"
				>
					Use{isSameLoadExercise ? '' : ` ${[...hint.reps.values()][0]}`}
				</button>
			</div>
		{/if}
		{#if (idx > 0 && (exercise.setType === 'MyorepMatch' || exercise.setType === 'MyorepMatchDown')) || exercise.setType === 'Drop'}
			{#each set.miniSets as miniSet, miniIdx}
				{@const miniSetButtonDisabled = shouldMiniSetBeDisabled(idx, miniIdx)}
				<!-- Under the set's load, reps and RIR: no set number or last time of its own -->
				<span></span>
				{#if !editing}
					<span></span>
				{/if}
				{#if set.skipped}
					<div class="col-span-3 flex items-center gap-2">
						<Separator class="w-px grow" />
						<span class="text-sm text-muted-foreground">skipped</span>
						<Separator class="w-px grow" />
					</div>
					<Button class="h-9 w-9" disabled size="icon" variant="secondary">
						<CheckIcon />
					</Button>
				{:else}
					<form class="contents" novalidate onsubmit={(e) => completeMiniSet(e, set, miniIdx)}>
						{#if exercise.setType === 'MyorepMatch' || exercise.setType === 'MyorepMatchDown'}
							<span></span>
						{:else}
							{@const expectedLoad = getMiniSetLoad(idx, miniIdx)}
							<Input
								id="{exercise.name}-set-{idx + 1}-mini-set-{miniIdx + 1}-load"
								class={boxClass}
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
							id="{exercise.name}-set-{idx + 1}-mini-set-{miniIdx + 1}-reps"
							class={boxClass}
							disabled={miniSet.completed}
							min={1}
							required
							type="number"
							bind:value={miniSet.reps}
						/>
						<Input
							id="{exercise.name}-set-{idx + 1}-mini-set-{miniIdx + 1}-RIR"
							class={boxClass}
							disabled={miniSet.completed}
							required
							type="number"
							bind:value={miniSet.RIR}
						/>
						<Button
							class="h-9 w-9 border-2 p-1"
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
				<span></span>
			{/each}
			<div class="col-span-full flex items-center gap-1">
				<Button
					class="h-8"
					aria-label="add-mini-set-to-set-{idx + 1}-of-{exercise.name}"
					onclick={() => addMiniSet(idx)}
					size="sm"
					variant="secondary"
				>
					<AddIcon />
				</Button>
				<Button
					class="h-8"
					aria-label="remove-mini-set-from-set-{idx + 1}-of-{exercise.name}"
					disabled={set.miniSets.length === 0}
					onclick={() => set.miniSets.pop()}
					size="sm"
					variant="secondary"
				>
					<RemoveIcon />
				</Button>
				{#if exercise.setType === 'MyorepMatch' || exercise.setType === 'MyorepMatchDown'}
					{@const repsLeft = getRemainingMyorepMatchReps(idx)}
					<span class="ml-1 text-sm font-medium text-primary">
						{#if repsLeft && repsLeft > 0}
							{repsLeft} {repsLeft === 1 ? 'rep' : 'reps'} left
						{:else if typeof repsLeft === 'number'}
							matched
						{/if}
					</span>
				{/if}
			</div>
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
