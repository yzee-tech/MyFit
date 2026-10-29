<script lang="ts">
	import { page } from '$app/stores';
	import { availableWeightsFor, weightsAround } from '$lib/utils/weightSets';
	import { convertWeight, formatWeight, fromKg, isLevelUnit, roundWeight, unitLabel } from '$lib/utils/weightUnits';
	import { formatHintLoad, formatPreviousSet, type LoadKind } from '$lib/utils/previousSet';
	import {
		distanceStep,
		distanceUnitLabel,
		formatDuration,
		formatPace,
		fromMeters,
		isValidDistanceMeters,
		isValidTimeSeconds,
		MAX_DISTANCE_METERS,
		parseDuration,
		roundDistance,
		toMeters
	} from '$lib/utils/distanceUnits';
	import { isCardioMeasure } from '$lib/utils/measure';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Popover from '$lib/components/ui/popover';
	import { Separator } from '$lib/components/ui/separator';
	import { arraySum, floorToNearestMultiple } from '$lib/utils';
	import {
		solveBergerFormula,
		type SetField,
		type WorkoutExerciseInProgress,
		hintBaseOf,
		type HintBase
	} from '$lib/utils/workoutUtils';
	import CheckIcon from 'virtual:icons/lucide/check';
	import ArrowDownIcon from 'virtual:icons/lucide/chevron-down';
	import RemoveIcon from 'virtual:icons/lucide/minus';
	import AddIcon from 'virtual:icons/lucide/plus';
	import UndoIcon from 'virtual:icons/lucide/undo';
	import TrashIcon from 'virtual:icons/lucide/trash-2';
	import { toast } from 'svelte-sonner';
	import { registerFollowCarrier, workoutRunes } from '../../workoutRunes.svelte';
	import { onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';

	type PropsType = {
		exercise: WorkoutExerciseInProgress;
		/** Reps only: no load to enter (it's 0) */
		repsOnly?: boolean;
	};
	type WorkoutExerciseSet = WorkoutExerciseInProgress['sets'][number];
	let { exercise = $bindable(), repsOnly = false }: PropsType = $props();

	// Sets someone tried to tick with a box still empty. The notes and outlines are worked out from these
	// sets as they are now, so they follow a set when others are added or removed, and go once it's filled
	type Missing = 'reps' | 'load' | 'level' | 'RIR' | 'time' | 'distance' | 'a distance under 1,000 km';
	const triedToTick = new SvelteSet<WorkoutExerciseSet>();

	// Cardio: each set is an interval with a time (and a distance), and a level on a machine with levels.
	// No reps, weight or RIR boxes: those are zero-filled when the set is ticked
	let measure = $derived(workoutRunes.measureOf(exercise.name));
	let isCardio = $derived(isCardioMeasure(measure.measure));
	let isDistance = $derived(measure.measure === 'DistanceTime');
	let distanceUnit = $derived(measure.distanceUnit ?? 'KM');

	// Loads here are in the exercise's unit; bodyweight is stored in kg
	function inExerciseUnit(kg: number | null | undefined) {
		return typeof kg === 'number' ? fromKg(kg, exercise.weightUnit ?? 'KG') : undefined;
	}

	// Myo-rep sets share set 1's load; every other set type has a load per set. Cardio intervals never
	// share one (a cardio exercise still in a routine as myo-reps or drop sets logs plain intervals)
	let isSameLoadExercise = $derived(!isCardio && ['Myorep', 'MyorepMatch'].includes(exercise.setType));
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
		if (isCardio) {
			if (isLevels && typeof set.load !== 'number') fields.push('level');
			// The same bounds the save checks, so nothing is refused after the workout
			if (isDistance) {
				if (!(typeof set.distance === 'number' && set.distance > 0)) fields.push('distance');
				else if (!isValidDistanceMeters(toMeters(set.distance, distanceUnit))) fields.push('a distance under 1,000 km');
			}
			if (!isValidTimeSeconds(set.timeSeconds)) fields.push('time');
			return fields;
		}
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
			// A cardio set has no reps, weight or RIR: zeros, so everything that reads them keeps working (a
			// machine's level stays in the load)
			if (isCardio) {
				set.reps = 0;
				set.RIR = 0;
				if (!isLevels) set.load = 0;
			}
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
			timeSeconds: last?.timeSeconds,
			distance: last?.distance,
			completed: false,
			skipped: false,
			miniSets: []
		});
		workoutRunes.workoutExercises = workoutRunes.workoutExercises;
	}

	// The set whose bin was tapped once: a second tap on it removes the set. Next to the tick, so one
	// tap only gets it ready. Any other tap or key, or a few seconds, and it's back to normal
	let armedSet: WorkoutExerciseSet | null = $state.raw(null);
	$effect(() => {
		if (!armedSet) return;
		const disarm = (e: Event) => {
			if (!(e.target instanceof Element && e.target.closest('[data-armed="true"]'))) armedSet = null;
		};
		const timer = setTimeout(() => (armedSet = null), 3000);
		// On the press, not the click: the click would come after the bin's own tap
		document.addEventListener('pointerdown', disarm, true);
		document.addEventListener('keydown', disarm, true);
		return () => {
			clearTimeout(timer);
			document.removeEventListener('pointerdown', disarm, true);
			document.removeEventListener('keydown', disarm, true);
		};
	});

	/**
	 * Removes a set that isn't done yet (a ticked set is done: untick it first), with a way back. The
	 * first tap only gets it ready; the second removes it, if it's still that set and still removable
	 */
	function removeSet(idx: number) {
		const set = exercise.sets[idx];
		if (exercise.sets.length <= 1 || !set || set.completed) {
			armedSet = null;
			return;
		}
		if (armedSet !== set) {
			armedSet = set;
			return;
		}
		armedSet = null;
		// Its note about missing numbers comes back with it
		const wasTried = triedToTick.delete(set);
		exercise.sets.splice(idx, 1);
		workoutRunes.workoutExercises = workoutRunes.workoutExercises;
		toast(`Set ${idx + 1} removed`, {
			action: { label: 'Undo', onClick: () => restoreSet(set, idx, wasTried) }
		});
	}

	/** Puts a removed set back where it was, with its numbers */
	function restoreSet(set: WorkoutExerciseSet, idx: number, wasTried: boolean) {
		const at = Math.min(idx, exercise.sets.length);
		exercise.sets.splice(at, 0, set);
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
		if (
			isLevels ||
			isCardio ||
			typeof exercise.bodyweightFraction !== 'number' ||
			typeof load !== 'number' ||
			!bodyweightKg
		)
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

	/**
	 * A box still holding the app's suggestion: lighter until it's typed in, copied in on purpose, or
	 * the set is ticked (ticking only changes the look: unticked, the marks are as they were)
	 */
	function isSuggested(set: WorkoutExerciseSet, field: SetField) {
		if (editing || set.completed || set.skipped || typeof set[field] !== 'number') return false;
		return !set.chosen?.includes(field);
	}

	/** The box is the person's now: typed in, or copied in on purpose */
	function markChosen(set: WorkoutExerciseSet, ...fields: SetField[]) {
		// A past workout's numbers are all real already
		if (editing) return;
		const chosen = new Set([...(set.chosen ?? []), ...fields]);
		if (chosen.size === set.chosen?.length) return;
		set.chosen = [...chosen];
		workoutRunes.workoutExercises = workoutRunes.workoutExercises;
	}
	// A suggestion shows as the box's placeholder, not its value: tapping the box then just places the
	// caret (selecting a number would bring up Android's cut/copy/paste bar). It's still the set's number,
	// used when the set is ticked
	const shownValue = (set: WorkoutExerciseSet, field: SetField) => (isSuggested(set, field) ? '' : set[field]);
	const suggestionHint = (set: WorkoutExerciseSet, field: SetField) =>
		isSuggested(set, field) ? String(set[field]) : undefined;

	/** Set 1's value as the edit starts: the value its copies hold */
	function noteSet1(set: WorkoutExerciseSet, field: SetField) {
		if (exercise.sets[0] === set) set1Before[field] = set[field];
	}

	// Set 1's numbers as typed are a starting point for the sets after it. A later box takes them when it's
	// empty or still holds the last copy (never a suggestion of its own, never one the person typed).
	// The copies are boxes the copy-down filled, and stay suggestions (lighter) until made the person's
	const copies = new WeakMap<WorkoutExerciseSet, Set<SetField>>();
	// Set 1's value before the current edit: the value the last copies hold
	const set1Before: Partial<Record<SetField, number>> = {};

	/**
	 * A unit switch replaces the exercise's set objects: the marks of who follows set 1 move to the new
	 * ones, and set 1's value before the next edit is the converted one the copies were switched along with
	 */
	export function carryFollowOver(
		oldSets: WorkoutExerciseSet[],
		newSets: WorkoutExerciseSet[],
		drop: 'none' | 'loads' | 'all' = 'none'
	) {
		const withoutLoads = (fields: Set<SetField>) => {
			const kept = new Set(fields);
			kept.delete('load');
			return kept;
		};
		// 'all': the edit made the copied numbers meaningless (a new measure), so nothing carries -
		// but set 1's remembered values are still refreshed from the new records below, or a stale
		// reference could compare equal later
		if (drop !== 'all') {
			newSets.forEach((set, i) => {
				const old = oldSets[i];
				if (!old) return;
				const copied = copies.get(old);
				if (copied) copies.set(set, drop === 'loads' ? withoutLoads(copied) : new Set(copied));
				const typedOver = typedOverCopy.get(old);
				if (typedOver)
					typedOverCopy.set(set, drop === 'loads' ? withoutLoads(typedOver) : new Set(typedOver));
			});
		}
		const first = newSets[0];
		if (!first) return;
		for (const field of Object.keys(set1Before) as SetField[]) {
			const value = first[field];
			if (typeof value === 'number') set1Before[field] = value;
			else delete set1Before[field];
		}
	}

	// A drawer Edit that keeps this exercise rebuilds its set records in workoutRunes: the marks of who
	// follows set 1 are carried to the new records through the registry (a rename or a swap recreates
	// this card instead, a fresh start)
	onMount(() => registerFollowCarrier(exercise.name, carryFollowOver));

	function copyDown(field: SetField) {
		const [first, ...later] = exercise.sets;
		// A past workout's sets are the record: each keeps its own numbers. Only sets meant to repeat set 1
		// (Straight, Independent) copy it: Down, Drop, top/back-off and myo-rep sets differ from it by design
		if (!first || editing || !['Straight', 'V2'].includes(exercise.setType)) return;
		const before = set1Before[field];
		const value = first[field];
		set1Before[field] = value;
		if (typeof value !== 'number') return;
		later.forEach((set, i) => {
			const idx = i + 1;
			if (set.completed || set.skipped || set.chosen?.includes(field)) return;
			// No load box: reps only
			if (field === 'load' && !hasLoadBox(idx)) return;
			const copied = copies.get(set) ?? new Set<SetField>();
			const followsSet1 = copied.has(field) && set[field] === before;
			if (set[field] !== undefined && !followsSet1) return;
			set[field] = value;
			copied.add(field);
			copies.set(set, copied);
		});
		workoutRunes.workoutExercises = workoutRunes.workoutExercises;
	}

	/** Typed in a box: it's the person's now; typed in set 1, the sets after it follow */
	function typed(set: WorkoutExerciseSet, idx: number, field: SetField) {
		markChosen(set, field);
		copies.get(set)?.delete(field);
		if (idx === 0) copyDown(field);
	}

	// Boxes typed over while they held a copy of set 1: emptied, they follow set 1 again
	const typedOverCopy = new WeakMap<WorkoutExerciseSet, Set<SetField>>();

	/** The time box's text: m:ss of the set's seconds; empty while it only holds a suggestion */
	const timeShown = (set: WorkoutExerciseSet) =>
		isSuggested(set, 'timeSeconds') || set.timeSeconds === undefined ? '' : formatDuration(set.timeSeconds);
	const timeHint = (set: WorkoutExerciseSet) =>
		isSuggested(set, 'timeSeconds') && set.timeSeconds !== undefined ? formatDuration(set.timeSeconds) : 'm:ss';

	/**
	 * A time typed as m:ss (or minutes), taken when the box is left, so the text isn't reformatted under
	 * the typing. Something that isn't a time goes back to what the box held
	 */
	function timeChanged(e: Event, set: WorkoutExerciseSet, idx: number) {
		const input = e.currentTarget as HTMLInputElement;
		if (input.value.trim() === '') {
			if (!isSuggested(set, 'timeSeconds')) emptied(set, idx, 'timeSeconds');
			return;
		}
		const seconds = parseDuration(input.value);
		if (seconds === null) {
			input.value = timeShown(set);
			return;
		}
		if (isSuggested(set, 'timeSeconds')) {
			set.suggested = { ...set.suggested, timeSeconds: set.timeSeconds };
			if (copies.get(set)?.has('timeSeconds'))
				typedOverCopy.set(set, (typedOverCopy.get(set) ?? new Set()).add('timeSeconds'));
		}
		set.timeSeconds = seconds;
		input.value = formatDuration(seconds);
		typed(set, idx, 'timeSeconds');
	}

	/** The pace of a distance set from its boxes; nothing until both are filled */
	function pace(set: WorkoutExerciseSet) {
		if (!isDistance || typeof set.distance !== 'number' || typeof set.timeSeconds !== 'number') return null;
		return formatPace(set.timeSeconds, toMeters(set.distance, distanceUnit), distanceUnit);
	}

	/** How many boxes a row has, for the "uncompleted" line to span: cardio has its time (and distance, and level) */
	let boxCount = $derived(isCardio ? (isLevels ? 1 : 0) + (isDistance ? 2 : 1) : 3);
	// Cardio rows lay out their own columns (Set | Previous | [Lvl] | [Distance] | Time | tick | remove)
	let cardioColumns = $derived(
		[
			'1.5rem',
			...(editing ? [] : ['minmax(4rem,1fr)']),
			...(isLevels ? ['minmax(2.75rem,0.7fr)'] : []),
			...(isDistance ? ['minmax(3.5rem,1fr)'] : []),
			'minmax(3.5rem,1fr)',
			'2.25rem',
			'2rem'
		].join(' ')
	);

	function changed(e: Event, set: WorkoutExerciseSet, idx: number, field: SetField) {
		const input = e.currentTarget as HTMLInputElement;
		if (input.value === '') {
			// Not a number yet (e.g. "-" on the way to a negative load): leave what's typed alone. Already
			// showing its suggestion: nothing to empty
			if (input.validity.badInput || isSuggested(set, field)) return;
			emptied(set, idx, field);
			return;
		}
		const value = input.valueAsNumber;
		if (Number.isNaN(value)) return;
		if (isSuggested(set, field)) {
			// Kept to come back if the box is emptied
			set.suggested = { ...set.suggested, [field]: set[field] };
			if (copies.get(set)?.has(field)) typedOverCopy.set(set, (typedOverCopy.get(set) ?? new Set()).add(field));
		}
		set[field] = value;
		typed(set, idx, field);
	}

	/**
	 * Emptied: back to set 1's current number if it was a copy of it (and following it again), else back
	 * to its suggestion; with neither it stays empty, to fill in before ticking
	 */
	function emptied(set: WorkoutExerciseSet, idx: number, field: SetField) {
		const set1Value = exercise.sets[0]?.[field];
		const wasCopy = idx > 0 && typedOverCopy.get(set)?.has(field) && typeof set1Value === 'number';
		// The reps box goes back to where the hint starts from, else to its suggestion; a past workout's numbers
		// are the record, so an emptied box there stays empty
		const restored = wasCopy
			? set1Value
			: editing
				? undefined
				: field === 'reps' && set.hintBase
					? set.hintBase.reps
					: set.suggested?.[field];
		if (typeof restored !== 'number') {
			set[field] = undefined;
			workoutRunes.workoutExercises = workoutRunes.workoutExercises;
			return;
		}
		set[field] = restored;
		set.chosen = set.chosen?.filter((chosenField) => chosenField !== field);
		typedOverCopy.get(set)?.delete(field);
		if (wasCopy) copies.set(set, (copies.get(set) ?? new Set<SetField>()).add(field));
		if (idx === 0) {
			// Set 1 back to its suggestion: the sets following it follow it back
			copyDown(field);
			set1Before[field] = restored;
		}
		workoutRunes.workoutExercises = workoutRunes.workoutExercises;
	}
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
		if (isCardio) {
			// Its intervals: the time, the distance in today's unit, and the level on a machine with levels
			const fields: SetField[] = [];
			if (typeof previous.timeSeconds === 'number') {
				set.timeSeconds = previous.timeSeconds;
				fields.push('timeSeconds');
			}
			if (isDistance && typeof previous.distanceMeters === 'number') {
				set.distance = roundDistance(fromMeters(previous.distanceMeters, distanceUnit));
				fields.push('distance');
			}
			if (isLevels) {
				set.load = previous.load;
				fields.push('load');
			}
			markChosen(set, ...fields);
			workoutRunes.workoutExercises = workoutRunes.workoutExercises;
			return;
		}
		set.reps = previous.reps;
		if (hasLoadBox(idx)) {
			set.load = previous.load;
		}
		// Last time's numbers go together: nothing to adjust until the weight changes. RIR is not copied, so
		// the baseline keeps the suggested RIR. Later myo-rep sets share set 1's weight
		if (!editing) {
			const load = hasLoadBox(idx) ? previous.load : exercise.sets[0]?.load;
			set.hintBase = hintBaseOf({ load, reps: previous.reps, RIR: set.hintBase?.RIR ?? set.RIR });
		}
		markChosen(set, ...(hasLoadBox(idx) ? (['reps', 'load'] as const) : (['reps'] as const)));
		workoutRunes.workoutExercises = workoutRunes.workoutExercises;
	}

	type RepsHint = { load: number; reps: Map<number, number> };

	/**
	 * After a set's weight changes from where it started (the suggestion, or the last time a hint was
	 * used): about how many reps at the new weight for the same effort. Myo-rep sets share set 1's
	 * weight, so set 1's hint covers every set not done yet
	 */
	function repsHint(idx: number): RepsHint | null {
		if (editing || repsOnly || isLevels || isCardio || !hasLoadBox(idx)) return null;
		const set = exercise.sets[idx];
		const base = set?.hintBase;
		const newLoad = set?.load;
		if (!set || !base || set.completed || set.skipped || typeof newLoad !== 'number') return null;
		if (newLoad === base.load) return null;

		// Today's bodyweight on both sides: the starting weight is from today too
		const bodyweight = inExerciseUnit(workoutRunes.workoutData?.userBodyweight) as number;
		// Only the starting numbers count, on both sides: what is typed in reps or RIR, and mini-sets in
		// progress, never move the hint
		const known = (from: HintBase) => ({
			oldSet: { reps: from.reps, load: from.load, RIR: from.RIR, miniSets: [] },
			oldUserBodyweight: bodyweight,
			newUserBodyweight: bodyweight,
			bodyweightFraction: exercise.bodyweightFraction ?? null
		});
		const reps = new Map<number, number>();

		const sets = isSameLoadExercise ? exercise.sets.map((from, i) => [from, i] as const) : [[set, idx] as const];
		let extraOverloadAchieved = 0;
		for (const [from, i] of sets) {
			// A set already done keeps its numbers; one without a starting point has no hint
			if (from.completed || from.skipped || !from.hintBase) continue;
			const newSet = { load: newLoad, RIR: from.hintBase.RIR, miniSets: [] };
			const newReps = Math.round(
				solveBergerFormula({
					variableToSolve: 'NewReps',
					knownValues: { ...known(from.hintBase), newSet, overloadPercentage: -extraOverloadAchieved }
				})
			);
			if (!Number.isFinite(newReps) || newReps < 1) return null;
			if (isSameLoadExercise) {
				extraOverloadAchieved += solveBergerFormula({
					variableToSolve: 'OverloadPercentage',
					knownValues: { ...known(from.hintBase), newSet: { ...newSet, reps: newReps } }
				});
			}
			reps.set(i, newReps);
		}
		return reps.size > 0 ? { load: newLoad, reps } : null;
	}

	const repsWord = (n: number) => (n === 1 ? 'rep' : 'reps');

	/** The hint's words, e.g. "At 70 kg, aim for about 7 reps" */
	function describeHint(hint: RepsHint) {
		const at = formatHintLoad(hint.load, unitLabel(exercise.weightUnit ?? 'KG'), loadKind);
		const values = [...hint.reps.values()];
		if (!isSameLoadExercise) return `At ${at}, aim for about ${values[0]} ${repsWord(values[0])}`;
		if (new Set(values).size === 1) return `At ${at}, aim for about ${values[0]} ${repsWord(values[0])} on each set`;
		return `At ${at}, aim for about ${values.slice(0, -1).join(', ')} and ${values.at(-1)} ${repsWord(values.at(-1)!)}`;
	}

	/** Fills in the hint's reps; the new weight is then where the set starts */
	function useHint(idx: number) {
		const hint = repsHint(idx);
		if (!hint) return;
		for (const [i, reps] of hint.reps) {
			exercise.sets[i].reps = reps;
			markChosen(exercise.sets[i], 'reps');
			// The new weight with these reps is where the set starts from now
			const from = exercise.sets[i].hintBase!;
			exercise.sets[i].hintBase = { load: hint.load, reps, RIR: from.RIR };
		}
		workoutRunes.workoutExercises = workoutRunes.workoutExercises;
	}
</script>

<!-- Set | Previous | load | Reps | RIR | tick | remove. The spare width is shared: Previous gets a part, the boxes the rest.
     The remove column is wider than its bin, which sits at its far side: a gap from the tick -->
<div
	class="grid items-center gap-1 {isCardio
		? ''
		: editing
			? 'grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_2.25rem_2rem]'
			: 'grid-cols-[1.5rem_minmax(3rem,0.9fr)_minmax(3.25rem,1fr)_minmax(2.75rem,0.85fr)_minmax(2.25rem,0.7fr)_2.25rem_2rem] md:grid-cols-[2rem_minmax(5rem,1fr)_6rem_5rem_4rem_2.25rem_2.25rem]'}"
	style:grid-template-columns={isCardio ? cardioColumns : undefined}
	data-testid="{exercise.name}-sets"
	data-measure={measure.measure}
>
	<!-- Headings sit on the bottom line, so a stacked "KG / (BW)" lines up with the others -->
	<span class="self-end text-center text-xs font-medium uppercase text-muted-foreground">Set</span>
	{#if !editing}
		<span class="self-end text-xs font-medium uppercase text-muted-foreground">Previous</span>
	{/if}
	{#if isCardio}
		{#if isLevels}
			<span
				class="self-end text-center text-xs font-medium uppercase text-muted-foreground"
				data-testid="{exercise.name}-load-header">LVL</span
			>
		{/if}
		{#if isDistance}
			<span
				class="self-end text-center text-xs font-medium uppercase text-muted-foreground"
				data-testid="{exercise.name}-distance-header">{distanceUnitLabel(distanceUnit)}</span
			>
		{/if}
		<span class="self-end text-center text-xs font-medium uppercase text-muted-foreground">Time</span>
	{:else}
		<span
			class="self-end text-center text-xs font-medium leading-tight text-muted-foreground min-[375px]:whitespace-nowrap"
			data-testid="{exercise.name}-load-header"
		>
			{#if repsOnly}
				<span class="sr-only">No load</span>
			{:else if isLevels}
				LVL
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
		<span class="self-end text-center text-xs font-medium uppercase text-muted-foreground">Reps</span>
		<span class="self-end text-center text-xs font-medium uppercase text-muted-foreground">RIR</span>
	{/if}
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
				class="text-center text-base font-semibold text-foreground"
				data-testid="{exercise.name}-set-{idx + 1}-number"
			>
				{idx + 1}
			</span>
			{#if !editing}
				{@const previous = formatPreviousSet(previousSets[idx], loadKind, measure)}
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
			{#if set.skipped}
				<div class="flex items-center gap-2" style:grid-column="span {boxCount}">
					<Separator class="w-px grow" />
					<span class="text-sm text-muted-foreground">uncompleted</span>
					<Separator class="w-px grow" />
				</div>
			{:else if isCardio}
				{#if isLevels}
					<Input
						id="{exercise.name}-set-{idx + 1}-load"
						class="{boxClass} {isMissing(idx, 'level') ? 'border-destructive' : ''}"
						aria-invalid={isMissing(idx, 'level')}
						aria-label="Set {idx + 1} level"
						data-suggested={isSuggested(set, 'load')}
						onfocus={() => noteSet1(set, 'load')}
						oninput={(e) => changed(e, set, idx, 'load')}
						disabled={set.completed}
						min={1}
						placeholder={suggestionHint(set, 'load')}
						step={1}
						type="number"
						value={shownValue(set, 'load')}
					/>
				{/if}
				{#if isDistance}
					<Input
						id="{exercise.name}-set-{idx + 1}-distance"
						class="{boxClass} {isMissing(idx, 'distance') ? 'border-destructive' : ''}"
						aria-invalid={isMissing(idx, 'distance')}
						aria-label="Set {idx + 1} distance in {distanceUnitLabel(distanceUnit)}"
						data-suggested={isSuggested(set, 'distance')}
						onfocus={() => noteSet1(set, 'distance')}
						oninput={(e) => changed(e, set, idx, 'distance')}
						disabled={set.completed}
						max={roundDistance(fromMeters(MAX_DISTANCE_METERS, distanceUnit))}
						min={distanceStep(distanceUnit)}
						placeholder={suggestionHint(set, 'distance')}
						step={distanceStep(distanceUnit)}
						type="number"
						value={shownValue(set, 'distance')}
					/>
				{/if}
				<Input
					id="{exercise.name}-set-{idx + 1}-time"
					class="{boxClass} {isMissing(idx, 'time') ? 'border-destructive' : ''}"
					aria-invalid={isMissing(idx, 'time')}
					aria-label="Set {idx + 1} time"
					data-suggested={isSuggested(set, 'timeSeconds')}
					onfocus={() => noteSet1(set, 'timeSeconds')}
					onchange={(e) => timeChanged(e, set, idx)}
					disabled={set.completed}
					inputmode="numeric"
					pattern="[0-9:.]*"
					placeholder={timeHint(set)}
					type="text"
					value={timeShown(set)}
				/>
			{:else}
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
						data-suggested={isSuggested(set, 'load')}
						onfocus={() => noteSet1(set, 'load')}
						oninput={(e) => changed(e, set, idx, 'load')}
						disabled={set.completed}
						aria-label={isLevels ? `Set ${idx + 1} level` : undefined}
						min={isLevels ? 1 : exercise.bodyweightFraction ? undefined : 0.25}
						placeholder={suggestionHint(set, 'load') ?? getNextLoad(idx)}
						step={isLevels ? 1 : 0.25}
						type="number"
						value={shownValue(set, 'load')}
					/>
				{:else}
					<span></span>
				{/if}
				<Input
					id="{exercise.name}-set-{idx + 1}-reps"
					class="{boxClass} {isMissing(idx, 'reps') ? 'border-destructive' : ''}"
					aria-invalid={isMissing(idx, 'reps')}
					data-suggested={isSuggested(set, 'reps')}
					onfocus={() => noteSet1(set, 'reps')}
					oninput={(e) => changed(e, set, idx, 'reps')}
					disabled={set.completed}
					min={1}
					placeholder={suggestionHint(set, 'reps')}
					type="number"
					value={shownValue(set, 'reps')}
				/>
				<Input
					id="{exercise.name}-set-{idx + 1}-RIR"
					class="{boxClass} {isMissing(idx, 'RIR') ? 'border-destructive' : ''}"
					aria-invalid={isMissing(idx, 'RIR')}
					data-suggested={isSuggested(set, 'RIR')}
					onfocus={() => noteSet1(set, 'RIR')}
					oninput={(e) => changed(e, set, idx, 'RIR')}
					disabled={set.completed}
					placeholder={suggestionHint(set, 'RIR')}
					type="number"
					value={shownValue(set, 'RIR')}
				/>
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
			<!-- Less often needed than the tick, so after it. A ticked set is done: its space stays, the button doesn't.
			     Red once tapped: tap again to remove -->
			<Button
				class="h-9 w-6 justify-self-end p-0.5 {armedSet === set ? '' : 'text-muted-foreground'} {set.completed
					? 'invisible'
					: ''}"
				aria-hidden={set.completed}
				aria-label={armedSet === set
					? `Tap again to remove set ${idx + 1} of ${exercise.name}`
					: `Remove set ${idx + 1} of ${exercise.name}`}
				data-armed={armedSet === set}
				data-testid="{exercise.name}-set-{idx + 1}-remove"
				disabled={exercise.sets.length <= 1 || set.completed}
				onclick={() => removeSet(idx)}
				tabindex={set.completed ? -1 : undefined}
				variant={armedSet === set ? 'destructive' : 'ghost'}
			>
				<TrashIcon class="h-4 w-4" />
			</Button>
		</form>
		{@const setPace = pace(set)}
		{#if setPace && !set.skipped}
			<span class="col-span-full -mt-1 text-xs text-muted-foreground" data-testid="{exercise.name}-set-{idx + 1}-pace">
				{setPace}
			</span>
		{/if}
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
		{#if !isCardio && ((idx > 0 && (exercise.setType === 'MyorepMatch' || exercise.setType === 'MyorepMatchDown')) || exercise.setType === 'Drop')}
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
						<span class="text-sm text-muted-foreground">uncompleted</span>
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
		aria-label="Add {isCardio ? 'an interval' : 'a set'} to {exercise.name}"
		data-testid="{exercise.name}-add-set"
		onclick={addSet}
		size="sm"
		variant="ghost"
	>
		<AddIcon class="h-4 w-4" /> Add {isCardio ? 'interval' : 'set'}
	</Button>
</div>
