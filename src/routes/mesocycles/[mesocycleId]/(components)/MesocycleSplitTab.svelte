<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs';
	import ExerciseTemplateCard from '$lib/components/mesocycleAndExerciseSplit/ExerciseTemplateCard.svelte';
	import type { RouterOutputs } from '$lib/trpc/router';

	let { mesocycle }: { mesocycle: NonNullable<RouterOutputs['mesocycles']['findById']> } = $props();

	// Read-only: a mesocycle that isn't finished uses My routines, edited there
	const routines = mesocycle.routines ?? [];
	let selectedName = $state(routines[0]?.name ?? '');
	let selectedRoutine = $derived(routines.find((routine) => routine.name === selectedName));
</script>

{#if routines.length > 0}
	<Tabs.Root class="w-full" onValueChange={(v) => v && (selectedName = v)} value={selectedName}>
		<Tabs.List class="flex justify-start overflow-x-auto">
			{#each routines as routine}
				<Tabs.Trigger value={routine.name}>{routine.name}</Tabs.Trigger>
			{/each}
			<!-- The routines are My routines: edited there -->
			<a class="ml-1 shrink-0 whitespace-nowrap px-2 text-sm text-primary hover:underline" href="/exercise-splits">
				Edit ›
			</a>
		</Tabs.List>
		{#if selectedRoutine}
			<Tabs.Content class="flex flex-col gap-1" value={selectedRoutine.name}>
				{#each selectedRoutine.exercises as exercise}
					<ExerciseTemplateCard context="exerciseSplit" exerciseTemplate={exercise} readOnly />
				{/each}
			</Tabs.Content>
		{/if}
	</Tabs.Root>
{:else}
	<div class="muted-text-box">
		No routines yet. Create them in <a class="underline" href="/exercise-splits">My routines</a>, or train with a blank
		workout.
	</div>
{/if}
