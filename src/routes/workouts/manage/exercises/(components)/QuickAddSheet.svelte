<script lang="ts">
	import SearchInput from '$lib/components/SearchInput.svelte';
	import { invalidate } from '$app/navigation';
	import ExerciseForm, { type ExerciseFormDetails } from '$lib/components/exercises/ExerciseForm.svelte';
	import type { RoutineExerciseTemplate } from '$lib/components/mesocycleAndExerciseSplit/commonTypes';
	import ResponsiveDialog from '$lib/components/ResponsiveDialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Popover from '$lib/components/ui/popover';
	import * as Sheet from '$lib/components/ui/sheet';
	import { trpc } from '$lib/trpc/client';
	import type { RouterOutputs } from '$lib/trpc/router';
	import { convertCamelCaseToNormal } from '$lib/utils';
	import type { MuscleGroup } from '$lib/utils/prismaEnums';
	import { setTypeLabel } from '$lib/utils/setTypes';
	import { TRPCClientError } from '@trpc/client';
	import { toast } from 'svelte-sonner';
	import CheckIcon from 'virtual:icons/lucide/check';
	import FilterIcon from 'virtual:icons/lucide/filter';
	import AddIcon from 'virtual:icons/lucide/plus';
	import XIcon from 'virtual:icons/lucide/x';
	import { workoutRunes } from '../../workoutRunes.svelte';

	type PickerExercise = RouterOutputs['exercises']['forPicker'][number];

	let open = $state(false);
	let exercises: PickerExercise[] = $state([]);
	let loaded = $state(false);
	let search = $state('');
	let selectedMuscleGroups: MuscleGroup[] = $state([]);
	let filterOpen = $state(false);
	let newExerciseOpen = $state(false);
	// In the order they were ticked: that's the order they're added in
	let ticked: string[] = $state([]);

	// Replace (a past workout's exercise): one pick, which replaces it at once
	let replacingIdx = $derived(workoutRunes.replacingExerciseIdx);
	let replacingName = $derived(
		replacingIdx === null ? null : (workoutRunes.workoutExercises?.[replacingIdx]?.name ?? null)
	);
	// Opened once per Replace; closed (picked or dismissed), the Replace is over
	let openedFor: number | null = null;
	$effect(() => {
		const idx = replacingIdx;
		if (idx === null || idx === openedFor) return;
		openedFor = idx;
		openSheet();
	});
	$effect(() => {
		if (open || replacingIdx === null) return;
		openedFor = null;
		workoutRunes.replacingExerciseIdx = null;
	});

	function replaceWith(exercise: PickerExercise) {
		if (replacingIdx === null) return;
		const result = workoutRunes.replaceExercise(replacingIdx, exercise);
		if (result === 'taken') {
			toast.error(`${exercise.name} is in this workout already`);
			return;
		}
		if (result === 'measureDiffers') {
			toast.error(`${exercise.name} is measured differently`, {
				description: 'Pick an exercise measured the same way as the one logged (reps, time, or distance and time)'
			});
			return;
		}
		if (result === 'loadsCleared') {
			toast.warning(`Replaced with ${exercise.name}`, {
				description: "Levels and weights don't match: enter the loads and tick the sets again"
			});
		} else {
			toast.success(`Replaced with ${exercise.name}`);
		}
		open = false;
	}

	/** Opens it with nothing ticked; your exercises are fetched each time, so new ones show up */
	export async function openSheet() {
		ticked = [];
		search = '';
		selectedMuscleGroups = [];
		open = true;
		await loadExercises();
	}

	async function loadExercises() {
		exercises = await trpc().exercises.forPicker.query();
		loaded = true;
	}

	let inWorkout = $derived(new Set((workoutRunes.workoutExercises ?? []).map((exercise) => exercise.name)));
	const muscleGroupOf = (exercise: PickerExercise) =>
		exercise.customMuscleGroup ?? convertCamelCaseToNormal(exercise.targetMuscleGroup);
	let muscleGroups = $derived([...new Set(exercises.map((exercise) => exercise.targetMuscleGroup))]);
	let groups = $derived(
		Object.entries(
			Object.groupBy(
				exercises
					.filter(
						(exercise) => selectedMuscleGroups.length === 0 || selectedMuscleGroups.includes(exercise.targetMuscleGroup)
					)
					.filter((exercise) => exercise.name.toLowerCase().includes(search.trim().toLowerCase())),
				muscleGroupOf
			)
		).sort(([a], [b]) => a.localeCompare(b))
	);

	/** What it starts with: the last time's set type and reps, else its routine's, else Independent 8–15 */
	function startsWith(exercise: PickerExercise) {
		const { setType, repRangeStart, repRangeEnd } = exercise.routineSettings;
		const settings = `${setTypeLabel(setType)} · ${repRangeStart}–${repRangeEnd} reps`;
		const from = { workout: 'Last time', routine: 'Routine', none: 'New' }[exercise.settingsFrom ?? 'none'];
		return `${from}: ${settings}`;
	}

	function toggle(exercise: PickerExercise) {
		if (replacingIdx !== null) return replaceWith(exercise);
		ticked = ticked.includes(exercise.id) ? ticked.filter((id) => id !== exercise.id) : [...ticked, exercise.id];
	}

	function toggleMuscleGroup(muscleGroup: MuscleGroup) {
		selectedMuscleGroups = selectedMuscleGroups.includes(muscleGroup)
			? selectedMuscleGroups.filter((group) => group !== muscleGroup)
			: [...selectedMuscleGroups, muscleGroup];
	}

	/** Each ticked one with 1 set and the settings it starts with; weights come from the workout */
	function addTicked() {
		for (const id of ticked) {
			const exercise = exercises.find((exercise) => exercise.id === id);
			if (!exercise) continue;
			// The exercise's own note shows in the workout, as from the drawer
			const template: RoutineExerciseTemplate & { exerciseNote: string | null } = {
				name: exercise.name,
				targetMuscleGroup: exercise.targetMuscleGroup,
				customMuscleGroup: exercise.customMuscleGroup,
				bodyweightFraction: exercise.bodyweightFraction,
				exerciseNote: exercise.note,
				...exercise.routineSettings,
				sets: 1,
				overloadPercentage: null,
				forceRIRMatching: null,
				lastSetToFailure: null,
				minimumWeightChange: null
			};
			workoutRunes.addExercise(template, { measure: exercise.measure, distanceUnit: exercise.distanceUnit });
		}
		ticked = [];
		open = false;
	}

	async function createExercise(details: ExerciseFormDetails) {
		try {
			const created = await trpc().exercises.create.mutate(details);
			// A machine's levels, for the workout screen
			await invalidate('settings:userSettings');
			await loadExercises();
			newExerciseOpen = false;
			toast.success('Exercise created');
			if (replacingIdx !== null) {
				const exercise = exercises.find(({ id }) => id === created.id);
				if (exercise) replaceWith(exercise);
				return;
			}
			if (!ticked.includes(created.id)) ticked = [...ticked, created.id];
		} catch (error) {
			toast.error(error instanceof TRPCClientError ? error.message : 'Failed to create exercise');
		}
	}
</script>

<!-- Opens on the list, not the search box: no keyboard popping up and pushing the list down -->
<Sheet.Root openFocus="#quick-add-list" bind:open>
	<Sheet.Content class="flex h-[85dvh] flex-col gap-0 rounded-t-xl px-4 pb-4 pt-5" side="bottom">
		<Sheet.Header class="text-left">
			<Sheet.Title>{replacingName ? `Replace ${replacingName}` : 'Add exercises'}</Sheet.Title>
		</Sheet.Header>
		<div class="mt-3 flex items-center gap-1">
			<SearchInput placeholder="Search your exercises" bind:value={search} />
			<Popover.Root bind:open={filterOpen}>
				<Popover.Trigger>
					<Button
						aria-label="Filter by muscle group"
						size="icon"
						type="button"
						variant={selectedMuscleGroups.length > 0 ? 'default' : 'outline'}
					>
						<FilterIcon class="h-4 w-4" />
					</Button>
				</Popover.Trigger>
				<Popover.Content class="w-80 p-4" align="end">
					<div class="flex flex-col gap-4">
						<h4 class="font-medium leading-none">Filter by muscle group</h4>
						<div class="grid grid-cols-2 gap-2">
							{#each muscleGroups as muscleGroup}
								<Button
									class="justify-start"
									onclick={() => toggleMuscleGroup(muscleGroup)}
									variant={selectedMuscleGroups.includes(muscleGroup) ? 'default' : 'outline'}
								>
									{convertCamelCaseToNormal(muscleGroup)}
								</Button>
							{/each}
						</div>
						<div class="flex justify-between">
							<Button
								class="gap-2"
								onclick={() => {
									selectedMuscleGroups = [];
									filterOpen = false;
								}}
								variant="destructive"
							>
								<XIcon /> Clear
							</Button>
							<Button class="gap-2" onclick={() => (filterOpen = false)}>Done <CheckIcon /></Button>
						</div>
					</div>
				</Popover.Content>
			</Popover.Root>
		</div>
		<div id="quick-add-list" class="mt-2 grow overflow-y-auto outline-none" data-testid="quick-add-list" tabindex="-1">
			{#each groups as [group, groupExercises] (group)}
				<div class="mb-0.5 mt-3 text-xs font-semibold text-muted-foreground">{group}</div>
				{#each groupExercises ?? [] as exercise (exercise.id)}
					{@const added = inWorkout.has(exercise.name)}
					{@const isTicked = added || ticked.includes(exercise.id)}
					<button
						class="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left disabled:opacity-50 {isTicked && !added
							? 'bg-primary/10'
							: ''}"
						aria-checked={replacingIdx === null ? isTicked : undefined}
						aria-label={exercise.name}
						disabled={added}
						onclick={() => toggle(exercise)}
						role={replacingIdx === null ? 'checkbox' : 'button'}
						type="button"
					>
						{#if replacingIdx === null}
							<span
								class="flex h-5 w-5 shrink-0 items-center justify-center rounded border {isTicked
									? 'border-primary bg-primary text-primary-foreground'
									: 'border-muted-foreground/50'}"
							>
								{#if isTicked}<CheckIcon class="h-3.5 w-3.5" />{/if}
							</span>
						{/if}
						<span class="flex min-w-0 flex-col">
							<span class="truncate">{exercise.name}</span>
							<span class="text-xs text-muted-foreground" data-testid="{exercise.name}-starts-with">
								{added ? 'In this workout' : replacingIdx !== null ? muscleGroupOf(exercise) : startsWith(exercise)}
							</span>
						</span>
					</button>
				{/each}
			{:else}
				<div class="p-3 text-center text-sm text-muted-foreground">
					{!loaded ? 'Loading…' : exercises.length === 0 ? 'No exercises yet' : 'No exercises match'}
				</div>
			{/each}
		</div>
		<div class="flex flex-col gap-2 border-t pt-2">
			<Button class="w-fit gap-1 px-0 text-primary" onclick={() => (newExerciseOpen = true)} variant="link">
				<AddIcon class="h-4 w-4" /> New exercise
			</Button>
			{#if replacingIdx === null}
				<span class="text-xs text-muted-foreground">Each starts with 1 set. Add more on the workout screen.</span>
				<Button disabled={ticked.length === 0} onclick={addTicked}>
					{ticked.length === 0
						? 'Add exercises'
						: `Add ${ticked.length} ${ticked.length === 1 ? 'exercise' : 'exercises'}`}
				</Button>
			{:else}
				<span class="text-xs text-muted-foreground">Its sets stay as you logged them.</span>
			{/if}
		</div>
	</Sheet.Content>
</Sheet.Root>

<ResponsiveDialog long title="New exercise" bind:open={newExerciseOpen}>
	{#snippet description()}
		{replacingIdx === null ? "It's added to your exercises, and ticked here." : "It's added to your exercises."}
	{/snippet}
	{#if newExerciseOpen}
		<ExerciseForm
			existingExercises={exercises}
			onPickExisting={(existing) => {
				newExerciseOpen = false;
				if (replacingIdx !== null) {
					const exercise = exercises.find(({ id }) => id === existing.id);
					return exercise && replaceWith(exercise);
				}
				// Already one of yours: tick it
				if (!ticked.includes(existing.id) && !inWorkout.has(existing.name)) ticked = [...ticked, existing.id];
				newExerciseOpen = false;
			}}
			onSubmit={createExercise}
			submitLabel="Create exercise"
		/>
	{/if}
</ResponsiveDialog>
