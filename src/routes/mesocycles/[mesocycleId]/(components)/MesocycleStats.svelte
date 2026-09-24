<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { convertCamelCaseToNormal } from '$lib/utils';
	import {
		generatePerformanceChangesPerMuscleGroup,
		generatePerformanceChangesPerSplitDay,
		getSetsPerformedPerMuscleGroup
	} from '$lib/utils/mesocycleUtils';
	import CircleCheck from 'virtual:icons/lucide/circle-check';
	import CalendarCheck from 'virtual:icons/lucide/calendar-check';
	import { getBlockWeek } from '$lib/utils/workoutUtils';
	import BicepsFlexed from 'virtual:icons/lucide/biceps-flexed';
	import Frown from 'virtual:icons/lucide/frown';
	import CalendarHeart from 'virtual:icons/lucide/calendar-heart';
	import CalendarArrowDown from 'virtual:icons/lucide/calendar-arrow-down';
	import ChartColumnIncreasing from 'virtual:icons/lucide/chart-column-increasing';
	import ChartColumnDecreasing from 'virtual:icons/lucide/chart-column-decreasing';
	import type { RouterOutputs } from '$lib/trpc/router';

	let { mesocycle }: { mesocycle: NonNullable<RouterOutputs['mesocycles']['findById']> } = $props();

	const performedWorkouts = $derived(mesocycle.workoutsOfMesocycle.filter((wm) => wm.workoutStatus === null));
	const plannedWeeks = $derived(mesocycle.weeklyRIR.length);
	const weeksDone = $derived.by(() => {
		if (!mesocycle.startDate) return 0;
		const lastDay = mesocycle.endDate ?? new Date();
		return Math.min(getBlockWeek(mesocycle.startDate, new Date(lastDay)), plannedWeeks);
	});
	const workoutsPerWeek = $derived(weeksDone > 0 ? performedWorkouts.length / weeksDone : 0);

	const performanceChangesPerMuscleGroups = $derived(
		generatePerformanceChangesPerMuscleGroup(mesocycle.workoutsOfMesocycle)
	);

	const performanceChangesPerSplitDay = $derived(generatePerformanceChangesPerSplitDay(mesocycle));

	const setsPerformedPerMuscleGroup = $derived(getSetsPerformedPerMuscleGroup(mesocycle.workoutsOfMesocycle));
</script>

{#if mesocycle.workoutsOfMesocycle.filter((wm) => wm.workoutStatus === null).length}
	<div class="grid grid-cols-2 gap-1">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 p-4 pb-1.5">
				<Card.Title class="text-sm font-medium">Completion</Card.Title>
				<CircleCheck />
			</Card.Header>
			<Card.Content class="p-4 pt-0">
				<div class="text-2xl font-bold">
					{plannedWeeks > 0 ? ((weeksDone / plannedWeeks) * 100).toFixed(0) : 0}%
				</div>
				<p class="text-xs text-muted-foreground">
					Week {weeksDone} of {plannedWeeks}
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 p-4 pb-1.5">
				<Card.Title class="text-sm font-medium">Workouts</Card.Title>
				<CalendarCheck />
			</Card.Header>
			<Card.Content class="p-4 pt-0">
				<div class="text-2xl font-bold">{performedWorkouts.length}</div>
				<p class="text-xs text-muted-foreground">
					{workoutsPerWeek.toFixed(1)} per week
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 p-4 pb-1.5">
				<Card.Title class="text-sm font-medium">Best muscle</Card.Title>
				<BicepsFlexed />
			</Card.Header>
			<Card.Content class="p-4 pt-0">
				<div class="text-2xl font-bold">
					{convertCamelCaseToNormal(performanceChangesPerMuscleGroups.at(-1)!.muscleGroup)}
				</div>
				<p class="text-xs text-muted-foreground">
					{performanceChangesPerMuscleGroups.at(-1)!.averagePercentageChange.toFixed(2)}% cyclic increase
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 p-4 pb-1.5">
				<Card.Title class="text-sm font-medium">Worst muscle</Card.Title>
				<Frown />
			</Card.Header>
			<Card.Content class="p-4 pt-0">
				<div class="text-2xl font-bold">
					{convertCamelCaseToNormal(performanceChangesPerMuscleGroups[0].muscleGroup)}
				</div>
				<p class="text-xs text-muted-foreground">
					{performanceChangesPerMuscleGroups[0].averagePercentageChange.toFixed(2)}% cyclic increase
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 p-4 pb-1.5">
				<Card.Title class="text-sm font-medium">Best day</Card.Title>
				<CalendarHeart />
			</Card.Header>
			<Card.Content class="p-4 pt-0">
				<div class="text-2xl font-bold">
					{performanceChangesPerSplitDay.at(-1)!.splitDayName}
				</div>
				<p class="text-xs text-muted-foreground">
					{performanceChangesPerSplitDay.at(-1)!.averagePercentageChange.toFixed(2)}% cyclic increase
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 p-4 pb-1.5">
				<Card.Title class="text-sm font-medium">Worst day</Card.Title>
				<CalendarArrowDown />
			</Card.Header>
			<Card.Content class="p-4 pt-0">
				<div class="text-2xl font-bold">
					{performanceChangesPerSplitDay[0].splitDayName}
				</div>
				<p class="text-xs text-muted-foreground">
					{performanceChangesPerSplitDay[0].averagePercentageChange.toFixed(2)}% cyclic increase
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 p-4 pb-1.5">
				<Card.Title class="text-sm font-medium">Most sets</Card.Title>
				<ChartColumnIncreasing />
			</Card.Header>
			<Card.Content class="p-4 pt-0">
				<div class="text-2xl font-bold">
					{setsPerformedPerMuscleGroup.at(-1)!.muscleGroup}
				</div>
				<p class="text-xs text-muted-foreground">
					Total: {setsPerformedPerMuscleGroup.at(-1)!.totalSets} sets
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 p-4 pb-1.5">
				<Card.Title class="text-sm font-medium">Least sets</Card.Title>
				<ChartColumnDecreasing />
			</Card.Header>
			<Card.Content class="p-4 pt-0">
				<div class="text-2xl font-bold">
					{setsPerformedPerMuscleGroup[0].muscleGroup}
				</div>
				<p class="text-xs text-muted-foreground">
					Total: {setsPerformedPerMuscleGroup[0].totalSets} sets
				</p>
			</Card.Content>
		</Card.Root>
	</div>
{:else}
	<div class="muted-text-box">No workouts for stat generation</div>
{/if}
