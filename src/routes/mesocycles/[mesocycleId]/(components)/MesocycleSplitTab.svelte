<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import EditIcon from 'virtual:icons/lucide/pencil';
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

<Card.Root class="mb-2 flex items-center justify-between gap-2 p-2">
	<span class="text-sm font-medium text-muted-foreground" data-testid="mesocycle-routines-note">
		{mesocycle.endDate ? 'The routines as they were during this mesocycle' : 'This mesocycle uses My routines'}
	</span>
	{#if !mesocycle.endDate}
		<Button class="gap-2" href="/exercise-splits" size="sm">
			Edit routines <EditIcon />
		</Button>
	{/if}
</Card.Root>
{#if routines.length > 0}
	<Tabs.Root class="w-full" onValueChange={(v) => v && (selectedName = v)} value={selectedName}>
		<Tabs.List class="flex justify-start overflow-x-auto">
			{#each routines as routine}
				<Tabs.Trigger value={routine.name}>{routine.name}</Tabs.Trigger>
			{/each}
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
	<div class="muted-text-box">No routines yet. Create them in My routines, or train with a blank workout.</div>
{/if}
