<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import { convertCamelCaseToNormal } from '$lib/utils';
	import { page } from '$app/stores';
	import { getNextWeightHint, switchExerciseUnit, type WorkoutExerciseInProgress } from '$lib/utils/workoutUtils';
	import { availableWeightsFor, type WeightSetLike } from '$lib/utils/weightSets';
	import { unitLabel } from '$lib/utils/weightUnits';
	import { dragHandle } from 'svelte-dnd-action';
	import GripVertical from 'virtual:icons/lucide/grip-vertical';
	import MenuIcon from 'virtual:icons/lucide/menu';
	import EditIcon from 'virtual:icons/lucide/pencil';
	import SkipIcon from 'virtual:icons/lucide/skip-forward';
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

	let originalSetLoads = $state(exercise.sets.map((set) => set.load));
	let isContextMenuOpen = $state(false);

	// Weights this gym has for the exercise; when the next one is a big jump, say how to get there
	let weightSets: WeightSetLike[] = $derived($page.data.weightSets ?? []);
	let nextWeightHint = $derived(
		readOnly
			? null
			: getNextWeightHint(exercise, availableWeightsFor(exercise, weightSets), workoutRunes.workoutData?.userBodyweight)
	);

	function toggleUnit() {
		const to = (exercise.weightUnit ?? 'KG') === 'KG' ? 'LB' : 'KG';
		exercise = switchExerciseUnit(
			$state.snapshot(exercise),
			to,
			workoutRunes.workoutData?.userBodyweight ?? 0,
			weightSets
		);
		originalSetLoads = exercise.sets.map((set) => set.load);
		workoutRunes.workoutExercises = workoutRunes.workoutExercises;
	}

	function skipSetsLeft() {
		exercise.sets.forEach((set) => {
			if (set.completed) return;
			set.skipped = true;
			set.miniSets.forEach((miniSet) => (miniSet.completed = false));
		});
		workoutRunes.workoutExercises = workoutRunes.workoutExercises;
	}
</script>

<div class="flex flex-col gap-0.5 rounded-md border bg-card/50 p-2 backdrop-blur-sm">
	<div class="flex items-center gap-0.5">
		<span class="mr-auto truncate">{exercise.name}</span>
		{#if !readOnly && !reordering}
			<button
				class="mr-1 rounded border px-1.5 text-xs font-medium text-muted-foreground"
				aria-label="{exercise.name} unit: {unitLabel(exercise.weightUnit ?? 'KG')}, switch"
				data-testid="{exercise.name}-unit-toggle"
				onclick={toggleUnit}
				type="button"
			>
				{unitLabel(exercise.weightUnit ?? 'KG')}
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
							<DropdownMenu.Item class="gap-2" onclick={() => workoutRunes.setEditingExercise(exercise)}>
								<EditIcon /> Edit
							</DropdownMenu.Item>
							<DropdownMenu.Item class="gap-2" onclick={() => workoutRunes.openExerciseWarmupDialog(exercise)}>
								<ChartIcon /> Warm up
							</DropdownMenu.Item>
							<DropdownMenu.Item class="gap-2" onclick={skipSetsLeft}>
								<SkipIcon /> Skip sets left
							</DropdownMenu.Item>
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
		<span class="mr-auto text-sm lowercase text-muted-foreground">
			{exercise.sets.length}
			{convertCamelCaseToNormal(exercise.setType)} sets of
			{exercise.repRangeStart} to {exercise.repRangeEnd} reps
		</span>
		{#if exercise.bodyweightFraction !== null}
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
		{#if comparing}
			<CompareComponent {exercise} />
		{:else}
			<SetsComponent bind:originalSetLoads bind:exercise />
		{/if}
	{/if}
</div>
