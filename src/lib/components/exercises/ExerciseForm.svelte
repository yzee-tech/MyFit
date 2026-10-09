<script lang="ts" module>
	import type { MuscleGroup } from '$lib/utils/prismaEnums';

	/** What belongs to the exercise itself, the same in every routine and workout */
	export type ExerciseFormDetails = {
		name: string;
		targetMuscleGroup: MuscleGroup;
		customMuscleGroup: string | null;
		bodyweightFraction: number | null;
		note: string | null;
		/** Suggestions only add reps, never weight; never with a bodyweight share */
		repsOnly: boolean;
		/** Reps-only cap; null for none */
		maxReps: number | null;
		/** A machine that shows levels instead of weights; null for weights. Never with reps only */
		levels: { from: number; to: number; step: 1 | 0.5 } | null;
	};

	/** An exercise as saved: its levels as three fields */
	export type ExerciseFormInitial = Omit<ExerciseFormDetails, 'levels'> & {
		levelsFrom?: number | null;
		levelsTo?: number | null;
		levelStep?: number | null;
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
	import AddIcon from 'virtual:icons/lucide/plus';

	type PropsType = {
		/** The exercise being edited; a new one when missing */
		initial?: ExerciseFormInitial;
		/** Your exercises: matches show as "Already on your list", and built-in suggestions leave them out */
		existingExercises?: ExistingExercise[];
		/** Tapping one of your exercises instead of making a new one */
		onPickExisting?: (exercise: ExistingExercise) => void;
		/** Past workouts of the exercise being edited, for the warning about bodyweight */
		pastWorkoutCount?: number;
		submitLabel: string;
		onSubmit: (details: ExerciseFormDetails) => Promise<unknown>;
	};
	let {
		initial,
		existingExercises = [],
		onPickExisting,
		pastWorkoutCount = 0,
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
	let repsOnly = $state(initial?.repsOnly ?? false);
	let maxReps: number | undefined = $state(initial?.maxReps ?? undefined);
	let hasLevels = $state(typeof initial?.levelsFrom === 'number');
	let levelsFrom: number | undefined = $state(initial?.levelsFrom ?? 1);
	let levelsTo: number | undefined = $state(initial?.levelsTo ?? 20);
	let halfLevels = $state(initial?.levelStep === 0.5);
	let saving = $state(false);

	// Turning on reps only drops a bodyweight share the exercise already had
	let dropsBodyweight = $derived(repsOnly && typeof initial?.bodyweightFraction === 'number');

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
		if (countsBodyweight) repsOnly = false;
		bodyweightPercentage = suggestion.bodyweightFraction ? Math.round(suggestion.bodyweightFraction * 100) : 100;
		note = suggestion.note ?? '';
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!targetMuscleGroup) return;
		saving = true;
		try {
			await onSubmit({
				name: name.trim(),
				targetMuscleGroup,
				customMuscleGroup: targetMuscleGroup === 'Custom' ? customMuscleGroup.trim() || null : null,
				// Reps only and a bodyweight share are one or the other
				bodyweightFraction: !repsOnly && countsBodyweight && bodyweightPercentage ? bodyweightPercentage / 100 : null,
				note: note.trim() || null,
				repsOnly,
				maxReps: repsOnly && maxReps ? maxReps : null,
				// Reps only and levels are one or the other
				levels:
					!repsOnly && hasLevels && levelsFrom !== undefined && levelsTo !== undefined
						? { from: levelsFrom, to: levelsTo, step: halfLevels ? 0.5 : 1 }
						: null
			});
		} finally {
			saving = false;
		}
	}
</script>

<form class="grid gap-4" onsubmit={submit}>
	<div class="grid gap-1.5">
		<Label for="exercise-form-name">Name</Label>
		<Input id="exercise-form-name" maxlength={100} placeholder="e.g. Incline DB press" required bind:value={name} />
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
			{#if dropsBodyweight}
				<p class="rounded-md bg-muted/50 p-2 text-xs" data-testid="reps-only-bodyweight-warning">
					This exercise counts {Math.round((initial?.bodyweightFraction ?? 0) * 100)}% of your bodyweight. Turning on
					Reps only removes that{#if pastWorkoutCount > 0}, so its {pastWorkoutCount} past
						{pastWorkoutCount === 1 ? 'workout' : 'workouts'} will count as 0 volume in stats{/if}. Your reps and
					weights don't change.
				</p>
			{/if}
		{/if}
	</div>

	<div class="grid gap-1.5" class:hidden={repsOnly}>
		<div class="flex items-center justify-between gap-4">
			<div class="grid gap-0.5">
				<Label for="exercise-form-levels">Machine with levels</Label>
				<span class="text-xs text-muted-foreground">It shows levels (1, 2, 3…) instead of weights.</span>
			</div>
			<Switch id="exercise-form-levels" bind:checked={hasLevels} />
		</div>
		{#if hasLevels}
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
				Suggestions go up a level once every set reaches the top of the rep range.
			</span>
		{/if}
	</div>

	<div class="grid gap-1.5" class:hidden={repsOnly}>
		<div class="flex items-center justify-between gap-4">
			<Label for="exercise-form-bodyweight">Counts bodyweight</Label>
			<Switch id="exercise-form-bodyweight" bind:checked={countsBodyweight} />
		</div>
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
