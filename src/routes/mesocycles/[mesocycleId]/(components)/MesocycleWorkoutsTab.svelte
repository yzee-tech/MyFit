<script lang="ts">
	import WorkoutCalendar from '$lib/components/WorkoutCalendar.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { RouterOutputs } from '$lib/trpc/router';
	import { calendarDayNames, compareMonths, localDayKey, monthOf, type CalendarMonth } from '$lib/utils/calendarDays';
	import { onMount } from 'svelte';

	let { mesocycle }: { mesocycle: NonNullable<RouterOutputs['mesocycles']['findById']> } = $props();

	// The block's workouts done (its old skipped and rest days aren't), on the phone's days
	const days = calendarDayNames(
		mesocycle.workoutsOfMesocycle
			.filter((wm) => wm.workoutStatus === null)
			.map(({ workout }) => ({ startedAt: workout.startedAt, routineName: workout.routineName }))
	);

	// The months it covers: from its first, to its planned last (or this month, if it runs longer) while
	// it runs, else its last workout's. Worked out on the phone, like the days
	let month: CalendarMonth | null = $state(null);
	let firstMonth: CalendarMonth | undefined = $state();
	let lastMonth: CalendarMonth | undefined = $state();
	onMount(() => {
		const workoutTimes = mesocycle.workoutsOfMesocycle.map(({ workout }) => new Date(workout.startedAt));
		const firstDay = mesocycle.startDate ? new Date(mesocycle.startDate) : workoutTimes[0];
		const thisMonth = monthOf(new Date());
		firstMonth = firstDay ? monthOf(firstDay) : thisMonth;
		if (mesocycle.endDate) {
			lastMonth = monthOf(workoutTimes.at(-1) ?? new Date(mesocycle.endDate));
		} else {
			const plannedLast = new Date(firstDay ?? new Date());
			plannedLast.setDate(plannedLast.getDate() + mesocycle.weeklyRIR.length * 7 - 1);
			lastMonth = compareMonths(monthOf(plannedLast), thisMonth) > 0 ? monthOf(plannedLast) : thisMonth;
		}
		if (compareMonths(lastMonth, firstMonth) < 0) lastMonth = firstMonth;
		// This month while it runs (within its months), else its last
		const opening = mesocycle.endDate ? lastMonth : thisMonth;
		month =
			compareMonths(opening, firstMonth) < 0 ? firstMonth : compareMonths(opening, lastMonth) > 0 ? lastMonth : opening;
	});

	let picked: { from: string; to: string } | null = $state(null);
	let shownWorkouts = $derived(
		mesocycle.workoutsOfMesocycle.filter(({ workout }) => {
			if (!picked) return true;
			const day = localDayKey(new Date(workout.startedAt));
			return day >= picked.from && day <= picked.to;
		})
	);
</script>

<div class="flex h-full flex-col gap-2">
	<WorkoutCalendar
		{days}
		maxMonth={lastMonth}
		minMonth={firstMonth}
		{month}
		onMonthChange={(next) => (month = next)}
		onPick={(next) => (picked = next)}
		{picked}
	/>

	<div class="flex h-px grow flex-col gap-1 overflow-y-auto">
		{#each shownWorkouts as { workout, ...workoutOfMesocycle }}
			<Button
				class="flex h-12 items-center justify-between rounded-md border bg-card p-2"
				href="/workouts/{workout.id}"
				variant="outline"
			>
				<span class="text-lg font-semibold">
					{workout.startedAt.toLocaleDateString(undefined, {
						day: '2-digit',
						month: 'long'
					})}
				</span>
				{#if workoutOfMesocycle}
					<span class="truncate text-muted-foreground">
						{workoutOfMesocycle.workoutStatus === 'RestDay' ? 'Rest' : (workout.routineName ?? '')}
						{workoutOfMesocycle.workoutStatus === 'Skipped' ? '(skipped)' : ''}
					</span>
				{/if}
			</Button>
		{/each}
	</div>
</div>
