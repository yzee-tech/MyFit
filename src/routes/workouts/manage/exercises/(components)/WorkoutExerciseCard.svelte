<script lang="ts">
	import { setTypeLabel } from '$lib/utils/setTypes';
	import { Badge } from '$lib/components/ui/badge';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import { convertCamelCaseToNormal } from '$lib/utils';
	import { page } from '$app/stores';
	import {
		allSetsAtMaxReps,
		getNextWeightHint,
		switchExerciseUnit,
		type WorkoutExerciseInProgress,
		hintBaseAfterUnitSwitch,
		convertSuggestedLoads
	} from '$lib/utils/workoutUtils';
	import { availableWeightsFor, machineSetOf, type WeightSetLike } from '$lib/utils/weightSets';
	import { convertWeight, isLevelUnit, roundWeight, unitLabel } from '$lib/utils/weightUnits';
	import { canWarmUp } from '$lib/utils/oneRepMax';
	import { intervalsLabel, isCardioMeasure } from '$lib/utils/measure';
	import { distanceUnitLabel } from '$lib/utils/distanceUnits';
	import { dragHandle } from 'svelte-dnd-action';
	import GripVertical from 'virtual:icons/lucide/grip-vertical';
	import MenuIcon from 'virtual:icons/lucide/menu';
	import EditIcon from 'virtual:icons/lucide/pencil';
	import ReplaceIcon from 'virtual:icons/lucide/replace';
	import DeleteIcon from 'virtual:icons/lucide/trash';
	import HistoryIcon from 'virtual:icons/lucide/history';
	import ChartIcon from 'virtual:icons/lucide/chart-no-axes-column-increasing';
	import { workoutRunes } from '../../workoutRunes.svelte';
	import CompareComponent from './CompareComponent.svelte';
	import SetsComponent from './SetsComponent.svelte';

	type PropsType = {
		readOnly?: boolean;
		idx: number;
		reordering?: boolean;
		comparing?: boolean;
		exercise: WorkoutExerciseInProgress;
	};

	let { readOnly, idx, reordering = false, comparing = false, exercise = $bindable() }: PropsType = $props();

	let isContextMenuOpen = $state(false);

	// Reps only: suggestions add reps, never weight, up to an optional cap
	let isRepsOnly = $derived(exercise.name in workoutRunes.repsOnly);
	// Cardio: intervals of time (and distance), repeated from last time; no weight, so no unit to switch
	let measure = $derived(workoutRunes.measureOf(exercise.name));
	let isCardio = $derived(isCardioMeasure(measure.measure));
	let maxReps = $derived(workoutRunes.repsOnly[exercise.name] ?? null);
	// About the suggestion: decided once every set has reps, so typing different reps doesn't change it
	let suggestionAtMaxReps: boolean | undefined = $state();
	$effect(() => {
		if (suggestionAtMaxReps !== undefined || readOnly || !isRepsOnly || exercise.sets.length === 0) return;
		if (exercise.sets.every((set) => set.skipped || set.reps !== undefined))
			suggestionAtMaxReps = allSetsAtMaxReps(exercise, maxReps);
	});
	let atMaxReps = $derived(suggestionAtMaxReps === true);
	// A blank workout counts sets only: the set type and reps are in ⋯ → Edit (none until it's loaded)
	let blankWorkout = $derived(
		workoutRunes.workoutData !== null &&
			!workoutRunes.workoutData.workoutOfMesocycle &&
			!workoutRunes.workoutData.routineName
	);

	// Weights this gym has for the exercise; when the next one is a big jump, say how to get there
	let weightSets: WeightSetLike[] = $derived($page.data.weightSets ?? []);
	let machine = $derived(machineSetOf(exercise.name, weightSets));
	let nextWeightHint = $derived(
		readOnly || isCardio
			? null
			: getNextWeightHint(
					exercise,
					availableWeightsFor(exercise, weightSets),
					workoutRunes.workoutData?.userBodyweight,
					isRepsOnly
				)
	);

	let setsComponent: SetsComponent | undefined = $state();

	function toggleUnit() {
		const oldSets = [...exercise.sets];
		const hadHintBase = exercise.sets.map((set) => set.hintBase !== undefined);
		const snapshot = $state.snapshot(exercise);
		const from = exercise.weightUnit ?? 'KG';
		const to = from === 'KG' ? 'LB' : 'KG';
		const switchUnit = (source: WorkoutExerciseInProgress) =>
			switchExerciseUnit(source, to, workoutRunes.workoutData?.userBodyweight ?? 0, weightSets, isRepsOnly);
		// Keep the visible conversion unchanged, including empty boxes.
		exercise = switchUnit(snapshot);
		exercise.sets.forEach((set, i) => {
			if (hadHintBase[i])
				set.hintBase = hintBaseAfterUnitSwitch(snapshot, i, set, to, workoutRunes.workoutData?.userBodyweight ?? 0);
		});
		// What a typed-over box brings back when it is emptied: the same weight in the new unit, as exact as the
		// other weights are shown
		exercise.sets = convertSuggestedLoads($state.snapshot(exercise.sets), (load) =>
			roundWeight(convertWeight(load, from, to))
		);
		// The switch made new set objects: who follows set 1 stays the same
		setsComponent?.carryFollowOver(oldSets, exercise.sets);
		workoutRunes.workoutExercises = workoutRunes.workoutExercises;
	}

	// The open ⋯ menu closes once its button is scrolled out of the exercise list: left open, it would stick to
	// the top of the screen. A small scroll that keeps the button in view (e.g. to show the whole menu) doesn't
	let card: HTMLElement | undefined = $state();
	$effect(() => {
		if (!isContextMenuOpen || !card) return;
		const button = card.querySelector('[data-menu-trigger]');
		if (!button) return;
		// The boxes around it that scroll (the list can sit in more than one)
		const scrollers: HTMLElement[] = [];
		for (let el = card.parentElement; el; el = el.parentElement) {
			if (['auto', 'scroll'].includes(getComputedStyle(el).overflowY)) scrollers.push(el);
		}
		const closeOnceHidden = (e: Event) => {
			const shown = (e.currentTarget as HTMLElement).getBoundingClientRect();
			const { top, bottom } = button.getBoundingClientRect();
			if (top < shown.top || bottom > shown.bottom) isContextMenuOpen = false;
		};
		scrollers.forEach((el) => el.addEventListener('scroll', closeOnceHidden, { passive: true }));
		return () => scrollers.forEach((el) => el.removeEventListener('scroll', closeOnceHidden));
	});

	// A past workout: fix what was logged (the exercise itself, or sets); no planning for it
	let editingPast = $derived(workoutRunes.editingWorkoutId !== null);
</script>

<div bind:this={card} class="flex flex-col gap-0.5 rounded-md border bg-card/50 p-2 backdrop-blur-sm">
	<div class="flex items-center gap-0.5">
		<span class="mr-auto truncate">{exercise.name}</span>
		{#if isLevelUnit(exercise.weightUnit)}
			<span
				class="mr-1 rounded bg-secondary px-1.5 text-xs font-medium text-muted-foreground"
				data-testid="{exercise.name}-levels"
				title="Levels"
			>
				LVL
			</span>
		{:else if isCardio}
			{#if measure.distanceUnit}
				<span
					class="mr-1 rounded bg-secondary px-1.5 text-xs font-medium text-muted-foreground"
					data-testid="{exercise.name}-distance-unit"
					title="Distances in this unit (set on the exercise)"
				>
					{distanceUnitLabel(measure.distanceUnit).toUpperCase()}
				</span>
			{/if}
		{:else if machine && !readOnly && !reordering}
			<!-- A machine shows its own unit: no switching -->
			<span
				class="mr-1 rounded bg-secondary px-1.5 text-xs font-medium text-muted-foreground"
				data-testid="{exercise.name}-machine-unit"
				title="The machine's unit"
			>
				{unitLabel(exercise.weightUnit ?? 'KG').toUpperCase()}
			</span>
		{:else if !readOnly && !reordering}
			<button
				class="mr-1 rounded border px-1.5 text-xs font-medium text-muted-foreground"
				aria-label="{exercise.name} unit: {unitLabel(exercise.weightUnit ?? 'KG')}, switch"
				data-testid="{exercise.name}-unit-toggle"
				onclick={toggleUnit}
				type="button"
			>
				<!-- Capitals, like the load column's header -->
				{unitLabel(exercise.weightUnit ?? 'KG').toUpperCase()}
			</button>
		{/if}
		{#if !readOnly}
			{#if reordering}
				<div role="button" tabindex="0" use:dragHandle>
					<GripVertical />
				</div>
			{:else}
				<DropdownMenu.Root onOpenChange={(v) => (isContextMenuOpen = v)} open={isContextMenuOpen}>
					<DropdownMenu.Trigger asChild let:builder>
						<button use:builder.action {...builder} class="px-0.5 py-0" data-testid="{exercise.name}-menu-button">
							<MenuIcon class="h-4 w-4" />
						</button>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end">
						<DropdownMenu.Group>
							{#if editingPast}
								<DropdownMenu.Item
									class="gap-2"
									onclick={() => {
										isContextMenuOpen = false;
										workoutRunes.replacingExerciseIdx = idx;
									}}
								>
									<ReplaceIcon /> Replace
								</DropdownMenu.Item>
							{:else}
								<DropdownMenu.Item
									class="gap-2"
									onclick={() => {
										isContextMenuOpen = false;
										workoutRunes.setEditingExercise(exercise);
									}}
								>
									<EditIcon /> Edit
								</DropdownMenu.Item>
								{#if canWarmUp(exercise, isRepsOnly, measure.measure)}
									<DropdownMenu.Item
										class="gap-2"
										onclick={() => {
											isContextMenuOpen = false;
											workoutRunes.openExerciseWarmupDialog(exercise);
										}}
									>
										<ChartIcon /> Warm up
									</DropdownMenu.Item>
								{/if}
							{/if}
							<DropdownMenu.Item class="gap-2" onclick={() => workoutRunes.openExerciseHistorySheet(exercise.name)}>
								<HistoryIcon /> History
							</DropdownMenu.Item>
							<DropdownMenu.Item
								class="gap-2 text-red-500"
								onclick={() => {
									workoutRunes.deleteExercise(idx);
									isContextMenuOpen = false;
								}}
							>
								<DeleteIcon /> Delete
							</DropdownMenu.Item>
						</DropdownMenu.Group>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			{/if}
		{/if}
	</div>
	<div class="flex items-center gap-0.5">
		<span class="mr-auto text-sm lowercase text-muted-foreground" data-testid="{exercise.name}-summary">
			{#if isCardio}
				{intervalsLabel(exercise.sets.length)}
			{:else if blankWorkout}
				{exercise.sets.length} {exercise.sets.length === 1 ? 'set' : 'sets'}
			{:else}
				{exercise.sets.length}
				{setTypeLabel(exercise.setType)} sets of
				{exercise.repRangeStart} to {exercise.repRangeEnd} reps
			{/if}
		</span>
		{#if isRepsOnly}
			<Badge class="whitespace-nowrap" variant="outline">Reps only</Badge>
		{/if}
		{#if exercise.bodyweightFraction !== null && !isLevelUnit(exercise.weightUnit) && !isCardio}
			<Badge variant="outline">BW</Badge>
		{/if}
		<Badge class="whitespace-nowrap" variant="secondary">
			{exercise.targetMuscleGroup === 'Custom'
				? exercise.customMuscleGroup
				: convertCamelCaseToNormal(exercise.targetMuscleGroup)}
		</Badge>
	</div>
	{#if exercise.exerciseNote}
		<div class="mt-1 flex items-center bg-secondary px-1 py-0.5 text-sm" data-testid="{exercise.name}-exercise-note">
			{exercise.exerciseNote}
		</div>
	{/if}
	{#if exercise.note}
		<div class="mt-1 flex items-center bg-secondary/60 px-1 py-0.5 text-sm" data-testid="{exercise.name}-routine-note">
			{exercise.note}
		</div>
	{/if}
	{#if atMaxReps && !reordering}
		<div class="mt-1 rounded bg-secondary/60 px-1 py-0.5 text-sm" data-testid="{exercise.name}-at-max-reps">
			All sets at your max of {maxReps} reps — try a harder version or add weight.
		</div>
	{/if}
	{#if nextWeightHint && !reordering}
		<div class="mt-1 rounded bg-secondary/60 px-1 py-0.5 text-sm" data-testid="{exercise.name}-next-weight">
			Next weight: {nextWeightHint.nextWeight}
			{unitLabel(exercise.weightUnit ?? 'KG')}. About {nextWeightHint.moreReps} more {nextWeightHint.moreReps === 1
				? 'rep'
				: 'reps'} at {nextWeightHint.currentWeight}
			{unitLabel(exercise.weightUnit ?? 'KG')} first.
		</div>
	{/if}
	{#if exercise.sets.length > 0 && !reordering}
		<Separator class="my-1" />
		<!-- Comparing is about the work done: a run has no volume to compare -->
		{#if comparing && !isCardio}
			<CompareComponent {exercise} />
		{:else}
			<SetsComponent bind:this={setsComponent} repsOnly={isRepsOnly} bind:exercise />
		{/if}
	{/if}
</div>
