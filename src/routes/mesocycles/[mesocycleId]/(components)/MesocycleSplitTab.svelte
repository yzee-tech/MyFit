<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs';
	import ExerciseTemplateCard from '$lib/components/mesocycleAndExerciseSplit/ExerciseTemplateCard.svelte';
	import type { RouterOutputs } from '$lib/trpc/router';

	let { mesocycle }: { mesocycle: NonNullable<RouterOutputs['mesocycles']['findById']> } = $props();

	// Read-only: routines are edited in My routines. A block that isn't finished lists them in My
	// routines' order, without ones no longer there
	const order = mesocycle.routineOrder;
	const routines = mesocycle.mesocycleExerciseSplitDays
		.filter((splitDay) => !splitDay.isRestDay && !splitDay.hidden)
		.sort((a, b) => (order ? order.indexOf(a.name) - order.indexOf(b.name) : a.dayIndex - b.dayIndex));
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
				{#each selectedRoutine.mesocycleSplitDayExercises as exercise}
					<ExerciseTemplateCard context="mesocycle" exerciseTemplate={exercise} readOnly />
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
