<script lang="ts">
	import ExerciseTemplateCard from '$lib/components/mesocycleAndExerciseSplit/ExerciseTemplateCard.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import type { RouterOutputs } from '$lib/trpc/router';
	import { convertCamelCaseToNormal } from '$lib/utils';
	import type { Snippet } from 'svelte';
	import ChevronDownIcon from 'virtual:icons/lucide/chevron-down';
	import ChevronUpIcon from 'virtual:icons/lucide/chevron-up';
	import EditIcon from 'virtual:icons/lucide/pencil';

	type Routine = NonNullable<RouterOutputs['exerciseSplits']['mine']>['exerciseSplitDays'][number];

	/**
	 * A routine as a card: its name (which opens and closes it), how many exercises and in what unit, the
	 * muscle groups, and open, its exercises with an Edit button. Shared by My routines and a block's
	 * Routines tab. `menu` is the ⋮ menu beside the name, where a page has one
	 */
	let {
		routine,
		shown,
		ontoggle,
		editHref,
		menu
	}: {
		routine: Pick<Routine, 'id' | 'name' | 'weightUnit' | 'exercises'>;
		shown: boolean;
		ontoggle: () => void;
		editHref: string;
		menu?: Snippet;
	} = $props();

	let muscleGroups = $derived([
		...new Set(
			routine.exercises.map(
				(exercise) => exercise.customMuscleGroup ?? convertCamelCaseToNormal(exercise.targetMuscleGroup)
			)
		)
	]);
	let unitText = $derived(routine.weightUnit === 'ASK' ? 'unit asked each time' : routine.weightUnit);
</script>

<div class="rounded-lg border bg-card p-3" data-testid="routine-card" id="routine-{routine.id}">
	<div class="flex items-start gap-2">
		<!-- The title opens and closes the card; the menu beside it stays its own button -->
		<button
			class="flex min-w-0 grow flex-col text-left"
			aria-expanded={shown}
			aria-label="{shown ? 'Hide' : 'Show'} the exercises of {routine.name}"
			onclick={ontoggle}
			type="button"
		>
			<span class="flex items-center gap-1 text-lg font-semibold">
				<span data-testid="routine-card-name">{routine.name}</span>
				{#if shown}
					<ChevronUpIcon class="h-4 w-4 shrink-0 text-muted-foreground" />
				{:else}
					<ChevronDownIcon class="h-4 w-4 shrink-0 text-muted-foreground" />
				{/if}
			</span>
			<span class="text-sm text-muted-foreground">
				{routine.exercises.length}
				{routine.exercises.length === 1 ? 'exercise' : 'exercises'} · {unitText}
			</span>
		</button>
		{@render menu?.()}
	</div>
	{#if routine.exercises.length > 0}
		<div class="mt-2 flex flex-wrap gap-1">
			{#each muscleGroups as muscleGroup}
				<Badge variant="secondary">{muscleGroup}</Badge>
			{/each}
		</div>
	{/if}
	{#if shown}
		<div class="mt-2 flex flex-col gap-1" data-testid="routine-card-exercises">
			{#each routine.exercises as exercise}
				<ExerciseTemplateCard context="exerciseSplit" exerciseTemplate={exercise} readOnly />
			{/each}
		</div>
		<div class="mt-2 flex items-center justify-end gap-1">
			<Button class="gap-1" href={editHref} size="sm" variant="outline">
				<EditIcon class="h-4 w-4" /> Edit
			</Button>
			<Button class="gap-1" aria-label="Close {routine.name}" onclick={ontoggle} size="sm" variant="ghost">
				Hide <ChevronUpIcon class="h-4 w-4" />
			</Button>
		</div>
	{/if}
</div>
