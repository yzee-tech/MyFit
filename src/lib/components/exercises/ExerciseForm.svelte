<script lang="ts" module>
	import type { MuscleGroup } from '$lib/utils/prismaEnums';

	/** What belongs to the exercise itself, the same in every routine and workout */
	export type ExerciseFormDetails = {
		name: string;
		targetMuscleGroup: MuscleGroup;
		customMuscleGroup: string | null;
		bodyweightFraction: number | null;
		note: string | null;
	};
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

	type PropsType = {
		/** The exercise being edited; a new one when missing */
		initial?: ExerciseFormDetails;
		/** Names already used, so built-in suggestions leave them out */
		existingNames?: string[];
		submitLabel: string;
		onSubmit: (details: ExerciseFormDetails) => Promise<unknown>;
	};
	let { initial, existingNames = [], submitLabel, onSubmit }: PropsType = $props();

	let name = $state(initial?.name ?? '');
	let targetMuscleGroup: MuscleGroup | undefined = $state(initial?.targetMuscleGroup);
	let customMuscleGroup = $state(initial?.customMuscleGroup ?? '');
	let countsBodyweight = $state(initial ? initial.bodyweightFraction !== null : false);
	let bodyweightPercentage: number | undefined = $state(
		initial?.bodyweightFraction ? Math.round(initial.bodyweightFraction * 100) : 100
	);
	let note = $state(initial?.note ?? '');
	let saving = $state(false);

	// Built-in exercises to start from, when making a new one
	const builtIns = commonExercisePerMuscleGroup.flatMap((group) => group.exercises);
	let suggestions = $derived.by(() => {
		const typed = name.trim().toLowerCase();
		if (initial || typed.length < 2) return [];
		const taken = new Set(existingNames.map((existing) => existing.toLowerCase()));
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
				bodyweightFraction: countsBodyweight && bodyweightPercentage ? bodyweightPercentage / 100 : null,
				note: note.trim() || null
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
		{#if suggestions.length > 0}
			<div class="flex flex-wrap gap-1" aria-label="Built-in exercises">
				{#each suggestions as suggestion (suggestion.name)}
					<Button class="h-7 px-2" onclick={() => useSuggestion(suggestion)} size="sm" type="button" variant="outline">
						{suggestion.name}
					</Button>
				{/each}
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
