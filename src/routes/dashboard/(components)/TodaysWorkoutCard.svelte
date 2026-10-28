<script lang="ts">
	import { goto } from '$app/navigation';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte';
	import type { RouterOutputs } from '$lib/trpc/router';
	import { formatWeekEffort, getBlockWeekHere } from '$lib/utils/workoutUtils';
	import { useNow } from '$lib/utils/useNow.svelte';
	import { workoutRunes } from '../../workouts/manage/workoutRunes.svelte';
	import WorkoutProgressionChart from './WorkoutProgressionChart.svelte';
	import ChevronRight from 'virtual:icons/lucide/chevron-right';

	type PropsType = {
		todaysWorkoutData: Promise<RouterOutputs['workouts']['getTodaysWorkoutData']>;
		pastWorkouts: Promise<RouterOutputs['mesocycles']['getWorkouts']>;
	};
	let { todaysWorkoutData, pastWorkouts }: PropsType = $props();

	// The week is counted on the phone (its clock and timezone), so nothing until the page is up
	const now = useNow();

	function createNewWorkout() {
		if (workoutRunes.editingWorkoutId !== null) workoutRunes.resetStores();
		goto('/workouts/manage/start');
	}
</script>

<Card.Root>
	{#await todaysWorkoutData}
		<Card.Header>
			<Card.Title><Skeleton class="card-title-skeleton" /></Card.Title>
			<Card.Description><Skeleton class="card-description-skeleton !w-40" /></Card.Description>
		</Card.Header>
		<Card.Content>
			<Skeleton class="h-20 w-full" />
		</Card.Content>
		<Card.Footer>
			<Skeleton class="button-skeleton ml-auto" />
		</Card.Footer>
	{:then todaysWorkoutData}
		{@const block = todaysWorkoutData.activeBlock}
		{@const weekNumber =
			block?.mesocycle.startDate && now.value ? getBlockWeekHere(block.mesocycle.startDate, now.value) : null}
		{#if block}
			<Card.Header>
				<Card.Title class="flex items-center justify-between">
					{block.mesocycle.name}
					{#if weekNumber !== null}
						<Badge variant="secondary">{formatWeekEffort(block.mesocycle.weeklyRIR, weekNumber)}</Badge>
					{/if}
				</Card.Title>
				<Card.Description>
					{#if weekNumber === null}
						{block.routines.length} routines
					{:else if weekNumber > block.totalWeeks}
						Block finished, all {block.totalWeeks} weeks done
					{:else}
						Week {weekNumber} of {block.totalWeeks} · {block.routines.length} routines
					{/if}
				</Card.Description>
			</Card.Header>
			<Card.Content>
				{#await pastWorkouts}
					<Skeleton class="h-40 w-full" />
				{:then pastWorkouts}
					<WorkoutProgressionChart {pastWorkouts} />
				{/await}
			</Card.Content>
			<Card.Footer>
				<Button class="ml-auto gap-2" onclick={createNewWorkout}>
					Start workout
					<ChevronRight />
				</Button>
			</Card.Footer>
		{:else}
			{@const routineCount = todaysWorkoutData.myRoutines?.length ?? 0}
			<Card.Header>
				<Card.Title>No mesocycle running</Card.Title>
				<Card.Description>
					{routineCount > 0
						? `${routineCount} ${routineCount === 1 ? 'routine' : 'routines'} in My routines`
						: 'No routines yet'}
				</Card.Description>
			</Card.Header>
			<Card.Content class="h-20 text-sm leading-snug">
				Pick one of My routines or do a blank workout: suggestions follow your past workouts. A mesocycle adds a weekly
				effort plan and deloads.
			</Card.Content>
			<Card.Footer class="flex flex-col items-end gap-2">
				<Button href="/workouts/manage/start">Start workout</Button>
				<Button href="/mesocycles" variant="secondary">Go to mesocycles</Button>
			</Card.Footer>
		{/if}
	{/await}
</Card.Root>
