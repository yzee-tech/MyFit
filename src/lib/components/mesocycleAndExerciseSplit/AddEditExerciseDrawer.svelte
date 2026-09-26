<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Command from '$lib/components/ui/command';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Popover from '$lib/components/ui/popover';
	import * as Select from '$lib/components/ui/select';
	import * as Sheet from '$lib/components/ui/sheet';
	import { Switch } from '$lib/components/ui/switch';
	import { Textarea } from '$lib/components/ui/textarea';
	import { trpc } from '$lib/trpc/client';
	import type { RouterOutputs } from '$lib/trpc/router';
	import { TRPCClientError } from '@trpc/client';
	import ExerciseForm, { type ExerciseFormDetails } from '$lib/components/exercises/ExerciseForm.svelte';
	import ResponsiveDialog from '$lib/components/ResponsiveDialog.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import ChevronsUpDown from 'virtual:icons/lucide/chevrons-up-down';
	import { convertCamelCaseToNormal } from '$lib/utils';
	import { ChangeType, MuscleGroup, SetType } from '$lib/utils/prismaEnums';
	import type { Mesocycle } from '@prisma/client';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import type { WeightSetLike } from '$lib/utils/weightSets';
	import { unitLabel } from '$lib/utils/weightUnits';
	import { toast } from 'svelte-sonner';
	import CheckIcon from 'virtual:icons/lucide/check';
	import ChevronLeft from 'virtual:icons/lucide/chevron-left';
	import ChevronRight from 'virtual:icons/lucide/chevron-right';
	import FilterIcon from 'virtual:icons/lucide/filter';
	import AddIcon from 'virtual:icons/lucide/plus';
	import XIcon from 'virtual:icons/lucide/x';
	import type {
		MesocycleExerciseTemplateWithoutIdsOrIndex,
		SplitExerciseTemplateWithoutIdsOrIndex
	} from './commonTypes';

	type CommonProps<T> = {
		editingExercise: T | undefined;
		addExercise: (exercise: T) => boolean;
		setEditingExercise: (exercise: undefined) => void;
		editExercise: (exercise: T) => boolean;
	};

	type PropsType =
		| ({ context: 'exerciseSplit' } & CommonProps<SplitExerciseTemplateWithoutIdsOrIndex>)
		| ({
				context: 'mesocycle';
				mesocycle: Mesocycle;
		  } & CommonProps<MesocycleExerciseTemplateWithoutIdsOrIndex & { isUserExercise?: boolean }>)
		| ({
				context: 'workout';
				mesocycle?: Mesocycle;
		  } & CommonProps<MesocycleExerciseTemplateWithoutIdsOrIndex & { isUserExercise?: boolean }>);

	type NonUndefined<T> = T extends undefined ? never : T;
	type FullExerciseTemplate = NonUndefined<PropsType['editingExercise']>;

	let { ...props }: PropsType = $props();

	// The weights a gym has; none means standard steps (2.5 kg / 5 lb)
	let weightSets: WeightSetLike[] = $derived($page.data.weightSets ?? []);
	const weightSetLabel = (weightSet: WeightSetLike) => `${weightSet.name} (${unitLabel(weightSet.unit)})`;
	function weightSetOption(weightSetId: string | null | undefined) {
		const weightSet = weightSets.find((set) => set.id === weightSetId);
		return weightSet
			? { value: weightSet.id, label: weightSetLabel(weightSet) }
			: { value: '', label: 'Standard steps' };
	}
	// Your exercises: routines and workouts pick from them; their details change on the Exercises page
	type PickerExercise = RouterOutputs['exercises']['forPicker'][number];
	let pickerExercises: PickerExercise[] = $state([]);
	let pickerOpen = $state(false);
	let pickerSearch = $state('');
	let newExerciseOpen = $state(false);

	async function loadPickerExercises() {
		pickerExercises = await trpc().exercises.forPicker.query();
	}
	onMount(loadPickerExercises);

	const muscleGroupOf = (exercise: { targetMuscleGroup: MuscleGroup; customMuscleGroup?: string | null }) =>
		exercise.customMuscleGroup ?? convertCamelCaseToNormal(exercise.targetMuscleGroup);
	let pickedExercise = $derived(pickerExercises.find((exercise) => exercise.name === currentExercise.name));
	let pickerGroups = $derived(
		Object.entries(
			Object.groupBy(
				pickerExercises
					.filter(
						(exercise) => selectedMuscleGroups.length === 0 || selectedMuscleGroups.includes(exercise.targetMuscleGroup)
					)
					.filter((exercise) => exercise.name.toLowerCase().includes(pickerSearch.trim().toLowerCase())),
				muscleGroupOf
			)
		).sort(([a], [b]) => a.localeCompare(b))
	);
	let pickerMuscleGroups = $derived([...new Set(pickerExercises.map((exercise) => exercise.targetMuscleGroup))]);

	const extraMesocycleProps: Partial<MesocycleExerciseTemplateWithoutIdsOrIndex> = {
		sets: undefined,
		overloadPercentage: null,
		forceRIRMatching: null,
		lastSetToFailure: null,
		minimumWeightChange: null
	};

	const defaultExercise: Partial<FullExerciseTemplate> = {
		name: '',
		setType: 'Straight',
		bodyweightFraction: null,
		...(props.context !== 'exerciseSplit' && structuredClone(extraMesocycleProps))
	};

	let open = $state(false);
	let overridesSheetOpen = $state(false);
	let mode = $derived(props.editingExercise === undefined ? 'Add' : 'Edit');
	let currentExercise: Partial<FullExerciseTemplate> = $state(structuredClone(defaultExercise));
	let selectedMuscleGroups = $state<MuscleGroup[]>([]);
	let filterOpen = $state(false);

	$effect(() => {
		if (props.editingExercise) {
			currentExercise = structuredClone($state.snapshot(props.editingExercise));
			open = true;
		}
	});

	function selectExercise(exercise: PickerExercise) {
		const routineSettings = mode === 'Add' ? exercise.routineSettings : {};
		currentExercise = {
			...currentExercise,
			...routineSettings,
			name: exercise.name,
			targetMuscleGroup: exercise.targetMuscleGroup,
			customMuscleGroup: exercise.customMuscleGroup,
			bodyweightFraction: exercise.bodyweightFraction,
			// In a workout, the exercise's own note shows with the routine's
			...(props.context === 'workout' && { exerciseNote: exercise.note })
		};
		pickerOpen = false;
		pickerSearch = '';
	}

	async function createExercise(details: ExerciseFormDetails) {
		try {
			const created = await trpc().exercises.create.mutate(details);
			await loadPickerExercises();
			const picked = pickerExercises.find((exercise) => exercise.id === created.id);
			if (picked) selectExercise(picked);
			newExerciseOpen = false;
			toast.success('Exercise created');
		} catch (error) {
			toast.error(error instanceof TRPCClientError ? error.message : 'Failed to create exercise');
		}
	}

	function resetDrawerState() {
		props.setEditingExercise(undefined);
		currentExercise = structuredClone(defaultExercise);
	}

	function submitForm(e: SubmitEvent) {
		e.preventDefault();
		let result = false;
		if ('isUserExercise' in currentExercise) {
			delete currentExercise.isUserExercise;
		}
		if (!currentExercise.name) {
			toast.error('Pick an exercise');
			return;
		}
		const finishedExercise = currentExercise as NonUndefined<typeof props.editingExercise>;
		if ('sets' in finishedExercise) {
			if (mode === 'Add') result = props.addExercise(finishedExercise);
			else result = props.editExercise(finishedExercise);
		} else if (props.context === 'exerciseSplit') {
			if (mode === 'Add') result = props.addExercise(finishedExercise);
			else result = props.editExercise(finishedExercise);
		}

		if (!result) {
			toast.error('This exercise is already in the list');
			return;
		}
		resetDrawerState();
		open = false;
	}

	function submitOverrides(e: SubmitEvent) {
		e.preventDefault();
		overridesSheetOpen = false;
	}

	function toggleMuscleGroup(muscleGroup: MuscleGroup) {
		if (selectedMuscleGroups.includes(muscleGroup)) {
			selectedMuscleGroups = selectedMuscleGroups.filter((g) => g !== muscleGroup);
		} else {
			selectedMuscleGroups = [...selectedMuscleGroups, muscleGroup];
		}
	}
</script>

<Sheet.Root closeOnOutsideClick={false} onOpenChange={(o) => !o && props.setEditingExercise(undefined)} bind:open>
	<Sheet.Trigger asChild let:builder>
		<Button aria-label="add-exercise" builders={[builder]} onclick={resetDrawerState} size="icon" variant="outline">
			<AddIcon />
		</Button>
	</Sheet.Trigger>
	<Sheet.Content class="w-11/12 overflow-y-auto px-4" side="right">
		<Sheet.Header>
			<Sheet.Title>{mode} exercise</Sheet.Title>
		</Sheet.Header>
		<form class="mt-8 grid h-fit grid-cols-2 gap-x-2 gap-y-4" onsubmit={submitForm}>
			<div class="col-span-2 flex w-full flex-col gap-1.5">
				<span class="text-sm font-medium">Exercise</span>
				<Button
					class="justify-between"
					aria-expanded={pickerOpen}
					aria-label="Pick an exercise"
					onclick={() => {
						pickerOpen = !pickerOpen;
						// Freshly made exercises (e.g. in another tab) show up too
						if (pickerOpen) loadPickerExercises();
					}}
					type="button"
					variant="outline"
				>
					<span class="truncate">{currentExercise.name || 'Pick an exercise'}</span>
					<ChevronsUpDown class="h-4 w-4 opacity-50" />
				</Button>
				{#if pickerOpen}
					<Command.Root class="rounded-md border" shouldFilter={false}>
						<div class="flex items-center gap-1 pr-1">
							<Command.Input class="w-full" placeholder="Search your exercises" bind:value={pickerSearch} />
							<Popover.Root bind:open={filterOpen}>
								<Popover.Trigger>
									<Button
										class="flex h-8 w-8 items-center justify-center p-0"
										aria-label="Filter by muscle group"
										size="icon"
										type="button"
										variant={selectedMuscleGroups.length > 0 ? 'default' : 'ghost'}
									>
										<FilterIcon class="h-4 w-4" />
									</Button>
								</Popover.Trigger>
								<Popover.Content class="w-80 p-4" align="start" side="top">
									<div class="flex flex-col gap-4">
										<h4 class="font-medium leading-none">Filter by muscle group</h4>
										<div class="grid grid-cols-2 gap-2">
											{#each pickerMuscleGroups as muscleGroup}
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
						<Command.List class="max-h-48 w-full">
							{#each pickerGroups as [group, exercises] (group)}
								<Command.Group heading={group}>
									{#each exercises ?? [] as exercise (exercise.id)}
										<Command.Item onSelect={() => selectExercise(exercise)}>{exercise.name}</Command.Item>
									{/each}
								</Command.Group>
							{:else}
								<div class="p-3 text-center text-sm text-muted-foreground">
									{pickerExercises.length === 0 ? 'No exercises yet' : 'No exercises match'}
								</div>
							{/each}
						</Command.List>
					</Command.Root>
					<Button class="gap-2" onclick={() => (newExerciseOpen = true)} type="button" variant="secondary">
						<AddIcon /> New exercise
					</Button>
				{/if}
				{#if currentExercise.name && currentExercise.targetMuscleGroup}
					<div class="flex flex-col gap-1 rounded-md bg-muted/50 p-2" data-testid="picked-exercise-details">
						<div class="flex flex-wrap gap-1">
							<Badge variant="secondary">
								{muscleGroupOf({
									targetMuscleGroup: currentExercise.targetMuscleGroup,
									customMuscleGroup: currentExercise.customMuscleGroup
								})}
							</Badge>
							{#if typeof currentExercise.bodyweightFraction === 'number'}
								<Badge variant="outline">{Math.round(currentExercise.bodyweightFraction * 100)}% of bodyweight</Badge>
							{/if}
						</div>
						{#if pickedExercise?.note}
							<span class="text-sm">{pickedExercise.note}</span>
						{/if}
						<span class="text-xs text-muted-foreground">
							Name, muscle group, bodyweight and exercise note are changed on the
							{#if pickedExercise}
								<a class="underline" href="/exercises/{pickedExercise.id}" target="_blank">Exercises page</a>.
							{:else}
								Exercises page.
							{/if}
						</span>
					</div>
				{/if}
			</div>
			{#if props.context !== 'exerciseSplit' && 'sets' in currentExercise}
				<div class="flex w-full flex-col gap-1.5">
					<Label for="exercise-sets">Sets</Label>
					<Input
						id="exercise-sets"
						min={0}
						placeholder="Type here"
						required
						type="number"
						bind:value={currentExercise.sets}
					/>
				</div>
				<div class="flex flex-col gap-1.5">
					<span class="text-sm font-medium leading-none">Progression</span>
					<Button class="gap-2" onclick={() => (overridesSheetOpen = true)} variant="secondary">
						<span class="pointer-events-none">Overrides</span>
						<ChevronRight class="pointer-events-none" />
					</Button>
				</div>
			{/if}
			<div class="flex w-full flex-col gap-1.5">
				{#key currentExercise}
					<Select.Root
						name="exercise-set-type"
						onSelectedChange={(v) => (currentExercise.setType = v?.value ?? 'Straight')}
						required
						selected={{
							value: currentExercise.setType,
							label: convertCamelCaseToNormal(currentExercise.setType)
						}}
					>
						<Select.Label class="p-0 text-sm font-medium leading-none">Set type</Select.Label>
						<Select.Trigger>
							<Select.Value placeholder="Pick one" />
						</Select.Trigger>
						<Select.Content>
							{#each Object.values(SetType) as setTemplate}
								<Select.Item label={convertCamelCaseToNormal(setTemplate)} value={setTemplate} />
							{/each}
						</Select.Content>
					</Select.Root>
				{/key}
			</div>
			{#if currentExercise.setType === 'Drop' || currentExercise.setType === 'Down' || currentExercise.setType === 'MyorepMatchDown'}
				<div class="flex w-full flex-col gap-1.5">
					<Select.Root
						name="exercise-set-change-type"
						onSelectedChange={(v) => {
							if (
								currentExercise.setType === 'Drop' ||
								currentExercise.setType === 'Down' ||
								currentExercise.setType === 'MyorepMatchDown'
							)
								currentExercise.changeType = v?.value ?? 'Percentage';
						}}
						required
						selected={{
							value: currentExercise.changeType,
							label: convertCamelCaseToNormal(currentExercise.changeType)
						}}
					>
						<Select.Label class="p-0 text-sm font-medium leading-none">Load change type</Select.Label>
						<Select.Trigger>
							<Select.Value placeholder="Pick one" />
						</Select.Trigger>
						<Select.Content>
							{#each Object.values(ChangeType) as changeType}
								<Select.Item label={convertCamelCaseToNormal(changeType)} value={changeType} />
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="flex w-full flex-col gap-1.5">
					<Label for="exercise-rep-range-end">Load change</Label>
					<Input
						id="exercise-set-decrement"
						placeholder="Type here"
						required
						step={0.5}
						type="number"
						bind:value={currentExercise.changeAmount}
					/>
				</div>
			{/if}
			{#if currentExercise.setType === 'TopBackoff'}
				<div class="flex w-full flex-col gap-1.5">
					<Label for="exercise-top-rep-range-start">Top set rep range start</Label>
					<Input
						id="exercise-top-rep-range-start"
						min={1}
						placeholder="Type here"
						required
						type="number"
						bind:value={currentExercise.topRepRangeStart}
					/>
				</div>
				<div class="flex w-full flex-col gap-1.5">
					<Label for="exercise-top-rep-range-end">Top set rep range end</Label>
					<Input
						id="exercise-top-rep-range-end"
						min={(currentExercise.topRepRangeStart ?? 0) + 1}
						placeholder="Type here"
						required
						type="number"
						bind:value={currentExercise.topRepRangeEnd}
					/>
				</div>
			{/if}
			<div class="flex w-full flex-col gap-1.5">
				<Label for="exercise-rep-range-start">
					{#if currentExercise.setType === 'TopBackoff'}
						Backoff sets rep range start
					{:else}
						Rep range start
					{/if}
				</Label>
				<Input
					id="exercise-rep-range-start"
					min={1}
					placeholder="Type here"
					required
					type="number"
					bind:value={currentExercise.repRangeStart}
				/>
			</div>
			<div class="flex w-full flex-col gap-1.5">
				<Label for="exercise-rep-range-end">
					{#if currentExercise.setType === 'TopBackoff'}
						Backoff sets rep range end
					{:else}
						Rep range end
					{/if}
				</Label>
				<Input
					id="exercise-rep-range-end"
					min={(currentExercise.repRangeStart ?? 0) + 1}
					placeholder="Type here"
					required
					type="number"
					bind:value={currentExercise.repRangeEnd}
				/>
			</div>
			<div class="col-span-2 flex w-full flex-col gap-1.5">
				{#key currentExercise}
					<Select.Root
						name="exercise-weight-set"
						onSelectedChange={(v) => (currentExercise.weightSetId = v?.value || null)}
						selected={weightSetOption(currentExercise.weightSetId)}
					>
						<Select.Label class="p-0 text-sm font-medium leading-none">Weights available</Select.Label>
						<Select.Trigger aria-label="Weights available">
							<Select.Value placeholder="Standard steps" />
						</Select.Trigger>
						<Select.Content>
							<Select.Item label="Standard steps" value="" />
							{#each weightSets as weightSet (weightSet.id)}
								<Select.Item label={weightSetLabel(weightSet)} value={weightSet.id} />
							{/each}
						</Select.Content>
					</Select.Root>
				{/key}
				{#if weightSets.length === 0}
					<span class="text-xs text-muted-foreground">
						To use only weights a gym has (e.g. 5–10 kg dumbbells, then 14 and 20), add a weight set in Settings.
					</span>
				{/if}
			</div>
			<div class="col-span-2 flex w-full flex-col gap-1.5">
				<Label for="exercise-note">Routine note</Label>
				<Textarea
					id="exercise-note"
					class="resize-none"
					placeholder="For this routine, e.g. seat on 4, cable at the top"
					bind:value={currentExercise.note as string}
				/>
			</div>
			<Button class="col-span-2" type="submit">{mode} exercise</Button>
		</form>
	</Sheet.Content>
</Sheet.Root>

<ResponsiveDialog title="New exercise" bind:open={newExerciseOpen}>
	{#snippet description()}
		It's added to your exercises, and picked here.
	{/snippet}
	{#if newExerciseOpen}
		<ExerciseForm
			existingNames={pickerExercises.map((exercise) => exercise.name)}
			onSubmit={createExercise}
			submitLabel="Create exercise"
		/>
	{/if}
</ResponsiveDialog>

{#if props.context !== 'exerciseSplit' && 'sets' in currentExercise}
	<Sheet.Root closeOnOutsideClick={false} bind:open={overridesSheetOpen}>
		<Sheet.Content class="w-10/12 overflow-y-auto px-4">
			<Sheet.Header>
				<Sheet.Title>Overrides</Sheet.Title>
				<Sheet.Description>
					Exercise progressions are based on the mesocycle by default, you can override (customize) them here for each
					exercise
				</Sheet.Description>
			</Sheet.Header>
			<form class="mt-8 grid h-fit gap-x-2 gap-y-4" onsubmit={submitOverrides}>
				<div class="flex flex-col gap-1">
					<div class="flex items-center justify-between">
						<Label for="exercise-minimum-weight-change-value">Minimum weight change</Label>
						<Checkbox
							id="exercise-override-minimum-weight-change"
							checked={currentExercise.minimumWeightChange !== null}
							onCheckedChange={(c) => {
								if (c !== 'indeterminate' && 'sets' in currentExercise)
									currentExercise.minimumWeightChange = c ? undefined : null;
							}}
						/>
					</div>
					<Input
						id="exercise-minimum-weight-change-value"
						disabled={currentExercise.minimumWeightChange === null}
						placeholder="5"
						required
						step={0.5}
						type="number"
						bind:value={currentExercise.minimumWeightChange}
					/>
				</div>
				<div class="flex flex-col gap-1">
					<div class="flex items-center justify-between">
						<Label for="exercise-override-overload-percentage-value">Overload percentage</Label>
						<Checkbox
							id="exercise-override-overload-percentage"
							checked={currentExercise.overloadPercentage !== null}
							onCheckedChange={(c) => {
								if (c !== 'indeterminate' && 'sets' in currentExercise)
									currentExercise.overloadPercentage = c ? undefined : null;
							}}
						/>
					</div>
					<Input
						id="exercise-override-overload-percentage-value"
						disabled={currentExercise.overloadPercentage === null}
						placeholder={props.mesocycle?.startOverloadPercentage.toString()}
						required
						step={0.1}
						type="number"
						bind:value={currentExercise.overloadPercentage}
					/>
				</div>
				<div class="flex flex-col gap-1">
					<div class="flex items-center justify-between">
						<Label for="exercise-override-force-RIR-matching-value">Force RIR matching</Label>
						<Checkbox
							id="exercise-override-force-RIR-matching"
							checked={currentExercise.forceRIRMatching !== null}
							onCheckedChange={(c) => {
								if (c !== 'indeterminate' && 'sets' in currentExercise)
									currentExercise.forceRIRMatching = c ? props.mesocycle?.forceRIRMatching : null;
							}}
						/>
					</div>
					{#key currentExercise.forceRIRMatching === null}
						<div class="flex items-center rounded-md border px-2 py-1.5">
							<Switch
								id="exercise-override-force-RIR-matching-value"
								name="exercise-override-force-RIR-matching-value"
								checked={currentExercise.forceRIRMatching ?? props.mesocycle?.forceRIRMatching}
								disabled={currentExercise.forceRIRMatching === null}
								onCheckedChange={(c) => {
									if ('sets' in currentExercise) currentExercise.forceRIRMatching = c;
								}}
							/>
						</div>
					{/key}
				</div>
				<div class="flex flex-col gap-1">
					<div class="flex items-center justify-between">
						<Label for="exercise-override-last-set-to-failure-value">Last set to failure</Label>
						<Checkbox
							id="exercise-override-last-set-to-failure"
							checked={currentExercise.lastSetToFailure !== null}
							onCheckedChange={(c) => {
								if (c !== 'indeterminate' && 'sets' in currentExercise)
									currentExercise.lastSetToFailure = c ? props.mesocycle?.lastSetToFailure : null;
							}}
						/>
					</div>
					{#key currentExercise.lastSetToFailure === null}
						<div class="flex items-center rounded-md border px-2 py-1.5">
							<Switch
								id="exercise-override-last-set-to-failure-value"
								name="exercise-override-last-set-to-failure-value"
								checked={currentExercise.lastSetToFailure ?? props.mesocycle?.lastSetToFailure}
								disabled={currentExercise.lastSetToFailure === null}
								onCheckedChange={(c) => {
									if ('sets' in currentExercise) currentExercise.lastSetToFailure = c;
								}}
							/>
						</div>
					{/key}
				</div>
				<Button class="gap-2" type="submit" variant="secondary">
					<ChevronLeft />
					Basics
				</Button>
			</form>
		</Sheet.Content>
	</Sheet.Root>
{/if}
