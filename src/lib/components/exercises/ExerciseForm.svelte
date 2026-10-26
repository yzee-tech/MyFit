<script lang="ts" module>
	import type { DistanceUnit, ExerciseMeasure, MuscleGroup, WeightUnit } from '$lib/utils/prismaEnums';
	import type { MassUnit } from '$lib/utils/weightUnits';

	/** What belongs to the exercise itself, the same in every routine and workout */
	export type ExerciseFormDetails = {
		name: string;
		targetMuscleGroup: MuscleGroup;
		customMuscleGroup: string | null;
		bodyweightFraction: number | null;
		note: string | null;
		/** Suggestions only add reps, never weight; a bodyweight share still counts in volume */
		repsOnly: boolean;
		/** Reps-only cap; null for none */
		maxReps: number | null;
		/** A machine that shows levels instead of weights; null for weights. Never with reps only */
		levels: { from: number; to: number; step: 1 | 0.5 } | null;
		/** A machine with its own weights, in the unit printed on it; null for none. Never with levels or reps only */
		machine: { weights: number[]; unit: MassUnit } | null;
		/** A machine whose weights are help, or whose higher levels are more help */
		assisted: boolean;
		/** How it's measured: reps and weight, time, or distance and time. Fixed once it has workouts */
		measure: ExerciseMeasure;
		/** The unit a DistanceTime exercise's distances are shown in; null for the others */
		distanceUnit: DistanceUnit | null;
	};

	/** An exercise as saved: its levels as three fields, its machine's weights and unit as two */
	export type ExerciseFormInitial = Omit<
		ExerciseFormDetails,
		'levels' | 'machine' | 'assisted' | 'measure' | 'distanceUnit'
	> & {
		levelsFrom?: number | null;
		levelsTo?: number | null;
		levelStep?: number | null;
		machineWeights?: number[];
		machineUnit?: WeightUnit | null;
		assisted?: boolean;
		measure?: ExerciseMeasure;
		distanceUnit?: DistanceUnit | null;
	};

	/** One of the user's exercises, for "Already on your list" */
	export type ExistingExercise = { id: string; name: string };
</script>

<script lang="ts">
	import { commonExercisePerMuscleGroup } from '$lib/common/commonExercises';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Switch } from '$lib/components/ui/switch';
	import { Textarea } from '$lib/components/ui/textarea';
	import { convertCamelCaseToNormal } from '$lib/utils';
	import { MuscleGroup as MuscleGroups } from '$lib/utils/prismaEnums';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import { page } from '$app/stores';
	import { isLevelUnit, unitLabel } from '$lib/utils/weightUnits';
	import { expandRange, formatWeightList, normalizeWeights, pickableWeightSets } from '$lib/utils/weightSets';
	import { DISTANCE_UNITS, distanceUnitLabel } from '$lib/utils/distanceUnits';
	import { isCardioMeasure, measureLabel } from '$lib/utils/measure';
	import AddIcon from 'virtual:icons/lucide/plus';

	type PropsType = {
		/** The exercise being edited; a new one when missing */
		initial?: ExerciseFormInitial;
		/** Your exercises: matches show as "Already on your list", and built-in suggestions leave them out */
		existingExercises?: ExistingExercise[];
		/** Tapping one of your exercises instead of making a new one */
		onPickExisting?: (exercise: ExistingExercise) => void;
		/** The exercise has workouts: how it's measured can't change (its history has to keep meaning what it says) */
		measureLocked?: boolean;
		submitLabel: string;
		onSubmit: (details: ExerciseFormDetails) => Promise<unknown>;
	};
	let {
		initial,
		existingExercises = [],
		onPickExisting,
		measureLocked = false,
		submitLabel,
		onSubmit
	}: PropsType = $props();

	let name = $state(initial?.name ?? '');
	let targetMuscleGroup: MuscleGroup | undefined = $state(initial?.targetMuscleGroup);
	let customMuscleGroup = $state(initial?.customMuscleGroup ?? '');
	let countsBodyweight = $state(initial ? initial.bodyweightFraction !== null : false);
	let bodyweightPercentage: number | undefined = $state(
		initial?.bodyweightFraction ? Math.round(initial.bodyweightFraction * 100) : 100
	);
	let note = $state(initial?.note ?? '');
	// How it's measured: reps and weight (everything until cardio), time, or distance and time
	let measure: ExerciseMeasure = $state(initial?.measure ?? 'Reps');
	let distanceUnit: DistanceUnit = $state(initial?.distanceUnit ?? 'KM');
	let isCardio = $derived(isCardioMeasure(measure));
	let repsOnly = $state(initial?.repsOnly ?? false);
	let maxReps: number | undefined = $state(initial?.maxReps ?? undefined);
	// A machine: its own levels, or its own weights (both off: dumbbells, a barbell, push-ups…)
	let isMachine = $state(typeof initial?.levelsFrom === 'number' || (initial?.machineWeights?.length ?? 0) > 0);
	let machineKind: 'weights' | 'levels' = $state(typeof initial?.levelsFrom === 'number' ? 'levels' : 'weights');
	// Cardio on a machine logs its levels (bike resistance, treadmill incline), never weights
	let hasLevels = $derived(isMachine && (machineKind === 'levels' || isCardio));
	let hasMachineWeights = $derived(isMachine && machineKind === 'weights' && !isCardio);
	const homeUnit: WeightUnit = $page.data.homeWeightUnit ?? 'KG';
	let machineUnit: MassUnit = $state(
		initial?.machineUnit === 'LB' || initial?.machineUnit === 'KG'
			? initial.machineUnit
			: isLevelUnit(homeUnit)
				? 'KG'
				: homeUnit
	);
	let machineWeights: number[] = $state(initial?.machineWeights ?? []);
	let rangeFrom: number | undefined = $state();
	let rangeTo: number | undefined = $state();
	let rangeStep: number | undefined = $state();
	let singleWeight: number | undefined = $state();
	let assisted = $state(initial?.assisted ?? false);
	let triedNoMachineWeights = $state(false);
	// A weight set to start from, e.g. one made for this machine before machines had their own weights
	let copyableWeightSets = $derived(pickableWeightSets($page.data.weightSets ?? []));
	let levelsFrom: number | undefined = $state(initial?.levelsFrom ?? 1);
	let levelsTo: number | undefined = $state(initial?.levelsTo ?? 20);
	let halfLevels = $state(initial?.levelStep === 0.5);
	let saving = $state(false);

	// Your own exercises that match what's typed
	let existingMatches = $derived.by(() => {
		const typed = name.trim().toLowerCase();
		if (initial || typed.length < 2) return [];
		return existingExercises.filter((ex) => ex.name.toLowerCase().includes(typed)).slice(0, 5);
	});

	// Built-in exercises to start from, when making a new one
	const builtIns = commonExercisePerMuscleGroup.flatMap((group) => group.exercises);
	let suggestions = $derived.by(() => {
		const typed = name.trim().toLowerCase();
		if (initial || typed.length < 2) return [];
		const taken = new Set(existingExercises.map((existing) => existing.name.toLowerCase()));
		return builtIns
			.filter((ex) => ex.name.toLowerCase().includes(typed) && ex.name.toLowerCase() !== typed)
			.filter((ex) => !taken.has(ex.name.toLowerCase()))
			.slice(0, 5);
	});

	function useSuggestion(suggestion: (typeof builtIns)[number]) {
		name = suggestion.name;
		targetMuscleGroup = suggestion.targetMuscleGroup;
		customMuscleGroup = suggestion.customMuscleGroup ?? '';
		countsBodyweight = typeof suggestion.bodyweightFraction === 'number';
		bodyweightPercentage = suggestion.bodyweightFraction ? Math.round(suggestion.bodyweightFraction * 100) : 100;
		note = suggestion.note ?? '';
		if (!measureLocked) {
			measure = suggestion.measure ?? 'Reps';
			distanceUnit = suggestion.distanceUnit ?? distanceUnit;
		}
	}

	function addRange() {
		if (rangeFrom === undefined || rangeTo === undefined || rangeStep === undefined) return;
		machineWeights = normalizeWeights([...machineWeights, ...expandRange(rangeFrom, rangeTo, rangeStep)]);
		rangeFrom = rangeTo = rangeStep = undefined;
	}

	function addSingleWeight() {
		if (singleWeight === undefined) return;
		machineWeights = normalizeWeights([...machineWeights, singleWeight]);
		singleWeight = undefined;
	}

	function copyWeightSet(id: string | undefined) {
		const weightSet = copyableWeightSets.find((set) => set.id === id);
		if (!weightSet || isLevelUnit(weightSet.unit)) return;
		machineWeights = normalizeWeights(weightSet.weights);
		machineUnit = weightSet.unit;
		if (weightSet.isAssistance) setAssisted(true);
	}

	// Help only means something against your weight: turning it on for weights counts bodyweight
	function setAssisted(on: boolean) {
		assisted = on;
		if (on && machineKind === 'weights' && !countsBodyweight) {
			countsBodyweight = true;
			bodyweightPercentage = 100;
		}
	}

	// Spaces get past `required` but aren't a name
	let triedBlankName = $state(false);
	let nameIsBlank = $derived(triedBlankName && !name.trim());

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!name.trim()) {
			triedBlankName = true;
			return;
		}
		if (!targetMuscleGroup) return;
		if (!repsOnly && hasMachineWeights && machineWeights.length === 0) {
			triedNoMachineWeights = true;
			return;
		}
		// Reps only, a machine's weights and a bodyweight share are all about weight: cardio has none
		const weighted = !isCardio;
		saving = true;
		try {
			await onSubmit({
				name: name.trim(),
				targetMuscleGroup,
				customMuscleGroup: targetMuscleGroup === 'Custom' ? customMuscleGroup.trim() || null : null,
				// Reps only can count bodyweight too (e.g. push-ups): only reps suggested, the share still in volume
				bodyweightFraction: weighted && countsBodyweight && bodyweightPercentage ? bodyweightPercentage / 100 : null,
				note: note.trim() || null,
				repsOnly: weighted && repsOnly,
				maxReps: weighted && repsOnly && maxReps ? maxReps : null,
				// Reps only and levels are one or the other
				levels:
					!(weighted && repsOnly) && hasLevels && levelsFrom !== undefined && levelsTo !== undefined
						? { from: levelsFrom, to: levelsTo, step: halfLevels ? 0.5 : 1 }
						: null,
				machine: weighted && !repsOnly && hasMachineWeights ? { weights: machineWeights, unit: machineUnit } : null,
				assisted: !(weighted && repsOnly) && isMachine && assisted,
				measure,
				distanceUnit: measure === 'DistanceTime' ? distanceUnit : null
			});
		} finally {
			saving = false;
		}
	}
</script>

<form class="grid gap-4" onsubmit={submit}>
	<div class="grid gap-1.5">
		<Label for="exercise-form-name">Name</Label>
		<Input
			id="exercise-form-name"
			class={nameIsBlank ? 'border-destructive' : ''}
			aria-invalid={nameIsBlank}
			maxlength={100}
			placeholder="e.g. Incline DB press"
			required
			bind:value={name}
		/>
		{#if nameIsBlank}
			<p class="text-sm text-destructive" data-testid="exercise-form-name-missing" role="alert">Enter a name</p>
		{/if}
		{#if existingMatches.length > 0}
			<div class="mt-1 grid gap-1" data-testid="existing-exercise-matches">
				<span class="text-xs font-medium">Already on your list</span>
				<div class="flex flex-wrap gap-1">
					{#each existingMatches as existing (existing.id)}
						<Button
							class="h-7 px-2"
							disabled={!onPickExisting}
							onclick={() => onPickExisting?.(existing)}
							size="sm"
							type="button"
							variant="secondary"
						>
							{existing.name}
						</Button>
					{/each}
				</div>
			</div>
		{/if}
		{#if suggestions.length > 0}
			<div class="mt-1 grid gap-1" data-testid="built-in-suggestions">
				<span class="text-xs font-medium">Suggestions — not on your list yet</span>
				<div class="flex flex-wrap gap-1" aria-label="Built-in exercises">
					{#each suggestions as suggestion (suggestion.name)}
						<Button
							class="h-7 gap-1 px-2"
							onclick={() => useSuggestion(suggestion)}
							size="sm"
							type="button"
							variant="outline"
						>
							<AddIcon class="h-3 w-3" />
							{suggestion.name}
						</Button>
					{/each}
				</div>
				<span class="text-xs text-muted-foreground">
					Tap one to fill in its details. It's added when you tap {submitLabel}.
				</span>
			</div>
		{/if}
	</div>

	<div class="grid gap-1.5">
		<Select.Root
			onSelectedChange={(v) => (targetMuscleGroup = v?.value)}
			required
			selected={targetMuscleGroup
				? { value: targetMuscleGroup, label: convertCamelCaseToNormal(targetMuscleGroup) }
				: undefined}
		>
			<Select.Label class="p-0 text-sm font-medium leading-none">Muscle group</Select.Label>
			<Select.Trigger aria-label="Muscle group">
				<Select.Value placeholder="Pick one" />
			</Select.Trigger>
			<Select.Content class="h-48 overflow-y-auto">
				{#each Object.values(MuscleGroups) as muscleGroup}
					<Select.Item label={convertCamelCaseToNormal(muscleGroup)} value={muscleGroup} />
				{/each}
			</Select.Content>
		</Select.Root>
		{#if targetMuscleGroup === 'Custom'}
			<Label class="mt-1" for="exercise-form-custom-muscle-group">Custom muscle group</Label>
			<Input
				id="exercise-form-custom-muscle-group"
				maxlength={60}
				placeholder="e.g. Soleus"
				required
				bind:value={customMuscleGroup}
			/>
		{/if}
	</div>

	<div class="grid gap-1.5">
		<div class="flex items-start justify-between gap-4">
			<div class="grid gap-0.5">
				<span class="text-sm font-medium" id="exercise-form-measure">How it's measured</span>
				<span class="text-xs text-muted-foreground">
					{#if measureLocked}
						Fixed once an exercise has workouts. For a change, make a new exercise.
					{:else if measure === 'Time'}
						Each set is a timed interval, e.g. a plank or 30 s on the bike.
					{:else if measure === 'DistanceTime'}
						Each set is a distance and a time; the pace is worked out for you.
					{:else}
						Reps with a weight. Cardio logs time, or distance and time, instead.
					{/if}
				</span>
			</div>
			<ToggleGroup.Root
				class="shrink-0 flex-wrap justify-end"
				aria-labelledby="exercise-form-measure"
				disabled={measureLocked}
				onValueChange={(value) => {
					if (value === 'Reps' || value === 'Time' || value === 'DistanceTime') measure = value;
				}}
				type="single"
				value={measure}
				variant="outline"
			>
				<ToggleGroup.Item aria-label="Measured in reps and weight" value="Reps">Reps</ToggleGroup.Item>
				<ToggleGroup.Item aria-label="Measured in time" value="Time">Time</ToggleGroup.Item>
				<ToggleGroup.Item aria-label="Measured in distance and time" value="DistanceTime">Distance</ToggleGroup.Item>
			</ToggleGroup.Root>
		</div>
		{#if measure === 'DistanceTime'}
			<div class="mt-1 flex items-center justify-between gap-4">
				<span class="text-sm font-medium" id="exercise-form-distance-unit">Distance unit</span>
				<ToggleGroup.Root
					aria-labelledby="exercise-form-distance-unit"
					onValueChange={(value) => {
						if (value === 'KM' || value === 'MI' || value === 'M' || value === 'FT') distanceUnit = value;
					}}
					type="single"
					value={distanceUnit}
					variant="outline"
				>
					{#each DISTANCE_UNITS as unit}
						<ToggleGroup.Item aria-label="Distance in {distanceUnitLabel(unit)}" value={unit}>
							{distanceUnitLabel(unit)}
						</ToggleGroup.Item>
					{/each}
				</ToggleGroup.Root>
			</div>
			<span class="text-xs text-muted-foreground">
				Can be changed later: distances are kept in metres, so past {measureLabel(measure).toLowerCase()} sets stay as they
				were.
			</span>
		{/if}
	</div>

	<div class="grid gap-1.5" class:hidden={isCardio}>
		<div class="flex items-center justify-between gap-4">
			<div class="grid gap-0.5">
				<Label for="exercise-form-reps-only">Reps only</Label>
				<span class="text-xs text-muted-foreground">Never suggest adding weight — just more reps.</span>
			</div>
			<Switch id="exercise-form-reps-only" bind:checked={repsOnly} />
		</div>
		{#if repsOnly}
			<Label class="mt-1" for="exercise-form-max-reps">Max reps (optional)</Label>
			<Input
				id="exercise-form-max-reps"
				max={500}
				min={1}
				placeholder="No limit"
				step={1}
				type="number"
				bind:value={maxReps}
			/>
			<span class="text-xs text-muted-foreground">Suggestions stop at this many reps.</span>
		{/if}
	</div>

	<div class="grid gap-1.5" class:hidden={repsOnly && !isCardio}>
		<div class="flex items-center justify-between gap-4">
			<div class="grid gap-0.5">
				<Label for="exercise-form-machine">Machine</Label>
				<span class="text-xs text-muted-foreground">
					{#if isCardio}
						It has levels (resistance, incline) to log with each interval.
					{:else}
						Its weights or levels are the machine's own, the same at every gym.
					{/if}
				</span>
			</div>
			<Switch id="exercise-form-machine" bind:checked={isMachine} />
		</div>
		{#if isMachine}
			<div class="mt-1 grid gap-3 rounded-md border p-3" data-testid="exercise-form-machine-settings">
				<div class="flex items-center justify-between gap-4" class:hidden={isCardio}>
					<span class="text-sm font-medium" id="exercise-form-machine-kind">It shows</span>
					<ToggleGroup.Root
						aria-labelledby="exercise-form-machine-kind"
						onValueChange={(value) => {
							if (value === 'weights' || value === 'levels') machineKind = value;
						}}
						type="single"
						value={machineKind}
						variant="outline"
					>
						<ToggleGroup.Item value="weights">Weights</ToggleGroup.Item>
						<ToggleGroup.Item value="levels">Levels</ToggleGroup.Item>
					</ToggleGroup.Root>
				</div>
				{#if hasMachineWeights}
					<div class="flex items-center justify-between gap-4">
						<span class="text-sm font-medium" id="exercise-form-machine-unit">Unit</span>
						<ToggleGroup.Root
							aria-labelledby="exercise-form-machine-unit"
							onValueChange={(value) => {
								if (value === 'KG' || value === 'LB') machineUnit = value;
							}}
							type="single"
							value={machineUnit}
							variant="outline"
						>
							<ToggleGroup.Item aria-label="Machine in kilograms" value="KG">kg</ToggleGroup.Item>
							<ToggleGroup.Item aria-label="Machine in pounds" value="LB">lb</ToggleGroup.Item>
						</ToggleGroup.Root>
					</div>
					<span class="-mt-2 text-xs text-muted-foreground">The machine's own unit. Its sets always show in it.</span>
					<div class="grid gap-1">
						<span class="text-sm font-medium">Add a range</span>
						<div class="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
							<div class="grid gap-1">
								<Label class="text-xs text-muted-foreground" for="exercise-form-machine-from">From</Label>
								<Input id="exercise-form-machine-from" min={0} step="any" type="number" bind:value={rangeFrom} />
							</div>
							<div class="grid gap-1">
								<Label class="text-xs text-muted-foreground" for="exercise-form-machine-to">To</Label>
								<Input id="exercise-form-machine-to" min={0} step="any" type="number" bind:value={rangeTo} />
							</div>
							<div class="grid gap-1">
								<Label class="text-xs text-muted-foreground" for="exercise-form-machine-step">Every</Label>
								<Input id="exercise-form-machine-step" min={0} step="any" type="number" bind:value={rangeStep} />
							</div>
							<Button aria-label="Add range" onclick={addRange} size="icon" type="button" variant="secondary">
								<AddIcon />
							</Button>
						</div>
					</div>
					<div class="grid gap-1">
						<Label for="exercise-form-machine-single">Add one weight</Label>
						<div class="flex gap-2">
							<Input
								id="exercise-form-machine-single"
								min={0}
								onkeydown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault();
										addSingleWeight();
									}
								}}
								placeholder="e.g. 52.5"
								step="any"
								type="number"
								bind:value={singleWeight}
							/>
							<Button aria-label="Add weight" onclick={addSingleWeight} size="icon" type="button" variant="secondary">
								<AddIcon />
							</Button>
						</div>
					</div>
					{#if copyableWeightSets.length > 0}
						<Select.Root onSelectedChange={(v) => copyWeightSet(v?.value as string | undefined)} selected={undefined}>
							<Select.Trigger aria-label="Copy from a weight set">
								<Select.Value placeholder="Copy from a weight set" />
							</Select.Trigger>
							<Select.Content>
								{#each copyableWeightSets as weightSet (weightSet.id)}
									<Select.Item label="{weightSet.name} ({unitLabel(weightSet.unit)})" value={weightSet.id} />
								{/each}
							</Select.Content>
						</Select.Root>
					{/if}
					{#if machineWeights.length > 0}
						<div class="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-sm">
							<span data-testid="exercise-form-machine-weights">
								<span class="text-muted-foreground">{assisted ? 'Help:' : 'Weights:'}</span>
								{formatWeightList(machineWeights)}
								{unitLabel(machineUnit)}
							</span>
							<Button class="h-7 px-2" onclick={() => (machineWeights = [])} size="sm" type="button" variant="ghost">
								Clear
							</Button>
						</div>
					{:else if triedNoMachineWeights}
						<p class="text-sm text-destructive" role="alert">Add the machine's weights</p>
					{/if}
				{:else}
					<div class="mt-1 grid grid-cols-2 gap-2">
						<div class="grid gap-1">
							<Label class="text-xs text-muted-foreground" for="exercise-form-levels-from">From level</Label>
							<Input
								id="exercise-form-levels-from"
								max={1000}
								min={0.5}
								required={hasLevels && !repsOnly}
								step={0.5}
								type="number"
								bind:value={levelsFrom}
							/>
						</div>
						<div class="grid gap-1">
							<Label class="text-xs text-muted-foreground" for="exercise-form-levels-to">To level</Label>
							<Input
								id="exercise-form-levels-to"
								max={1000}
								min={levelsFrom ?? 0.5}
								required={hasLevels && !repsOnly}
								step={0.5}
								type="number"
								bind:value={levelsTo}
							/>
						</div>
					</div>
					<div class="flex items-center justify-between gap-4">
						<Label class="font-normal" for="exercise-form-half-levels">Has half levels (e.g. 7.5)</Label>
						<Switch id="exercise-form-half-levels" bind:checked={halfLevels} />
					</div>
					<span class="text-xs text-muted-foreground">
						{#if isCardio}
							Each interval logs its level; suggestions repeat last time's.
						{:else}
							Suggestions go {assisted ? 'down a level (less help)' : 'up a level'} once every set reaches the top of the
							rep range.
						{/if}
					</span>
				{/if}
				<div class="flex items-start justify-between gap-4 border-t pt-3">
					<div class="grid gap-0.5">
						<Label for="exercise-form-assisted">Assisted machine</Label>
						<span class="text-xs text-muted-foreground">
							{#if hasLevels}
								Higher levels give more help, so going down a level is progress.
							{:else}
								The weights are help, e.g. assisted pull-ups: typed as −20 for 20 kg of help, and less help is progress.
							{/if}
						</span>
					</div>
					<Switch id="exercise-form-assisted" checked={assisted} onCheckedChange={(on) => setAssisted(on)} />
				</div>
			</div>
		{/if}
	</div>

	<div class="grid gap-1.5" class:hidden={isCardio}>
		<div class="flex items-center justify-between gap-4">
			<Label for="exercise-form-bodyweight">Counts bodyweight</Label>
			<Switch id="exercise-form-bodyweight" bind:checked={countsBodyweight} />
		</div>
		{#if !repsOnly && hasMachineWeights && assisted && !countsBodyweight}
			<p
				class="rounded-md border border-amber-600 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200"
				data-testid="exercise-form-assisted-warning"
				role="alert"
			>
				Without bodyweight, less help can't be counted as progress. Suggestions will keep the help the same and add
				reps.
			</p>
		{/if}
		{#if countsBodyweight}
			<Label class="mt-1" for="exercise-form-bodyweight-share">Share of bodyweight (%)</Label>
			<Input
				id="exercise-form-bodyweight-share"
				max={200}
				min={1}
				required
				step={1}
				type="number"
				bind:value={bodyweightPercentage}
			/>
			<span class="text-xs text-muted-foreground">
				How much of your weight the movement moves, e.g. pull-ups 100%, push-ups about 65%.
			</span>
		{/if}
	</div>

	<div class="grid gap-1.5">
		<Label for="exercise-form-note">Exercise note</Label>
		<Textarea
			id="exercise-form-note"
			class="resize-none"
			maxlength={1000}
			placeholder="How to do it, e.g. elbows tucked, 2 s down"
			bind:value={note}
		/>
	</div>

	<Button disabled={saving || !targetMuscleGroup} type="submit">{submitLabel}</Button>
</form>
