<script lang="ts">
	import { formatWorkoutLength } from '$lib/utils/workoutLength';
	import { fromKg, unitLabel } from '$lib/utils/weightUnits';
	import { workoutName } from '$lib/utils/workoutNames';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import DefaultInfiniteLoader from '$lib/components/DefaultInfiniteLoader.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import H2 from '$lib/components/ui/typography/H2.svelte';
	import { trpc } from '$lib/trpc/client';
	import type { RouterInputs, RouterOutputs } from '$lib/trpc/router.js';
	import type { DateRange } from 'bits-ui';
	import { type InfiniteLoadingEvents } from 'svelte-infinite-loading';
	import AddIcon from 'virtual:icons/lucide/plus';
	import StickyNoteIcon from 'virtual:icons/lucide/sticky-note';
	import FilterComponent from './(components)/FilterComponent.svelte';
	import NoWorkoutsFilterComponent from './(components)/NoWorkoutsFilterComponent.svelte';
	import { workoutRunes } from './manage/workoutRunes.svelte.js';
	import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte';
	import WorkoutCalendar from '$lib/components/WorkoutCalendar.svelte';
	import {
		addMonths,
		calendarDayNames,
		describeDates,
		describePick,
		localDayKey,
		monthOf,
		monthStart,
		nextDay,
		parseLocalDay,
		pickedBounds,
		type CalendarMonth
	} from '$lib/utils/calendarDays';
	import { onMount } from 'svelte';

	let { data } = $props();

	/** A workout's volume in the home unit, in full, e.g. "3,659 kg" */
	function formatVolume(kg: number) {
		const unit = $page.data.homeWeightUnit ?? 'KG';
		return `${Math.round(fromKg(kg, unit)).toLocaleString()} ${unitLabel(unit)}`;
	}
	let workouts: RouterOutputs['workouts']['load'] = $state([]);
	let currentFilters = $derived(getCurrentFilters());
	let picked = $derived(getPicked());

	/** The days picked on the calendar (from the link, as the phone's days), if they're real days */
	function getPicked() {
		const from = parseLocalDay($page.url.searchParams.get('from'));
		if (!from) return null;
		const to = parseLocalDay($page.url.searchParams.get('to')) ?? from;
		return to < from ? null : { from, to };
	}

	function getCurrentFilters() {
		const currentFilters: Exclude<RouterInputs['workouts']['load']['filters'], undefined> = {};
		// Days picked on the calendar replace the filters
		const pickedDays = getPicked();
		if (pickedDays) {
			currentFilters.pickedDays = pickedBounds(pickedDays.from, pickedDays.to);
			return currentFilters;
		}
		const startDate = $page.url.searchParams.get('startDate');
		const endDate = $page.url.searchParams.get('endDate');
		const selectedMesocycleIds = $page.url.searchParams.get('selectedMesocycleIds');
		// A link from before ids: its blocks by name
		const selectedMesocycles = $page.url.searchParams.get('selectedMesocycles');

		// The filter's dates are days on the phone's calendar: from the first one's midnight to the
		// midnight after the last
		const startDay = parseLocalDay(startDate);
		const endDay = parseLocalDay(endDate);
		if (startDay) currentFilters.startDate = startDay;
		if (endDay) currentFilters.endBefore = nextDay(endDay);
		if (selectedMesocycleIds) {
			currentFilters.selectedMesocycleIds = JSON.parse(selectedMesocycleIds);
		} else if (selectedMesocycles) {
			currentFilters.selectedMesocycles = JSON.parse(selectedMesocycles);
		}

		return currentFilters;
	}

	async function loadMore(infiniteEvent: InfiniteLoadingEvents['infinite']) {
		const lastWorkout = workouts.at(-1);

		const newWorkouts = await trpc().workouts.load.query({
			cursorId: lastWorkout?.id,
			filters: getCurrentFilters()
		});

		if (newWorkouts.length === 0) {
			infiniteEvent.detail.complete();
			return;
		}

		infiniteEvent.detail.loaded();
		workouts.push(...newWorkouts);
		if (newWorkouts.length !== 10) infiniteEvent.detail.complete();
	}

	// The calendar: this month on the phone (or the picked days' month), worked out once on the phone
	let calendarMonth: CalendarMonth | null = $state(null);
	let calendarDays: Map<string, string[]> = $state(new Map());
	onMount(() => showMonth(monthOf(getPicked()?.from ?? new Date())));

	// Only the latest month asked for is shown (one asked for earlier can answer later)
	let monthRequest = 0;
	async function showMonth(month: CalendarMonth) {
		calendarMonth = month;
		const request = ++monthRequest;
		try {
			const done = await trpc().workouts.monthDays.query({
				from: monthStart(month),
				to: monthStart(addMonths(month, 1))
			});
			if (request === monthRequest) calendarDays = calendarDayNames(done);
		} catch {
			// The month without its workouts
		}
	}

	/** Days picked on the calendar (or none): they replace the filters, and the filters replace them */
	function pickDays(days: { from: string; to: string } | null) {
		const newURL = new URL($page.url);
		const params = ['from', 'to', 'startDate', 'endDate', 'selectedMesocycleIds', 'selectedMesocycles'];
		for (const param of [...params, 'selectedWorkoutStatuses']) newURL.searchParams.delete(param);
		if (days) {
			newURL.searchParams.set('from', days.from);
			if (days.to !== days.from) newURL.searchParams.set('to', days.to);
		}
		if (newURL.toString() === $page.url.toString()) return;
		workouts = [];
		goto(newURL, { noScroll: true, keepFocus: true });
	}

	/** What the list is showing, in words, if not everything: the days picked, or the filters */
	function describeShowing(filterData: RouterOutputs['workouts']['getFilterData']) {
		if (picked) return describePick(picked.from, picked.to);
		const params = $page.url.searchParams;
		const parts: string[] = [];
		const blockName = (id: string | null) =>
			id === null
				? 'Non-meso workouts'
				: (filterData?.allMesocycles.find((block) => block.id === id)?.name ?? 'A block');
		if (currentFilters.selectedMesocycleIds) parts.push(currentFilters.selectedMesocycleIds.map(blockName).join(', '));
		else if (currentFilters.selectedMesocycles) {
			parts.push(currentFilters.selectedMesocycles.map((name) => name ?? 'Non-meso workouts').join(', '));
		}
		// The filter's dates are days on the phone's calendar
		const start = parseLocalDay(params.get('startDate'));
		const end = parseLocalDay(params.get('endDate'));
		const day = (date: Date) => date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
		if (start && end) parts.push(+start === +end ? describePick(start, end) : describeDates(start, end));
		else if (start) parts.push(`From ${day(start)}`);
		else if (end) parts.push(`Until ${day(end)}`);
		return parts.length ? parts.join(' · ') : null;
	}

	function createNewWorkout() {
		if (workoutRunes.editingWorkoutId !== null) workoutRunes.resetStores();
		goto('/workouts/manage/start');
	}

	function setFilters(selectedDateRange: DateRange, selectedMesocycleIds: (string | null)[]) {
		const newURL = new URL($page.url);

		if (selectedDateRange.start) {
			newURL.searchParams.set('startDate', selectedDateRange.start.toString());
		} else {
			newURL.searchParams.delete('startDate');
		}

		if (selectedDateRange.end) {
			newURL.searchParams.set('endDate', selectedDateRange.end.toString());
		} else {
			newURL.searchParams.delete('endDate');
		}

		if (selectedMesocycleIds.length) {
			newURL.searchParams.set('selectedMesocycleIds', JSON.stringify(selectedMesocycleIds));
		} else {
			newURL.searchParams.delete('selectedMesocycleIds');
		}
		// An old link's blocks by name are now the ones picked here
		newURL.searchParams.delete('selectedMesocycles');

		// Skipped and rest days are gone: an old link's filter on them goes too
		newURL.searchParams.delete('selectedWorkoutStatuses');
		// Filters replace days picked on the calendar
		newURL.searchParams.delete('from');
		newURL.searchParams.delete('to');

		if (newURL.toString() === $page.url.toString()) return;
		workouts = [];
		goto(newURL);
	}
</script>

<H2>Workouts</H2>

<div class="flex grow flex-col gap-2">
	<WorkoutCalendar
		days={calendarDays}
		month={calendarMonth}
		onMonthChange={showMonth}
		onPick={pickDays}
		picked={picked && { from: localDayKey(picked.from), to: localDayKey(picked.to) }}
	/>
	<Button class="w-full gap-1" aria-label="create-workout" onclick={createNewWorkout}>
		<AddIcon class="h-5 w-5" /> Start workout
	</Button>
	{#await data.filterData}
		<Skeleton class="h-10 w-full" />
	{:then filterData}
		{@const showing = describeShowing(filterData)}
		<div class="flex">
			{#if filterData}
				<!-- Made again when the link changes: it shows the filters in use (a day picked clears them) -->
				{#key $page.url.search}
					<FilterComponent {filterData} {currentFilters} {setFilters} />
				{/key}
			{:else}
				<NoWorkoutsFilterComponent />
			{/if}
		</div>
		{#if showing}
			<div class="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1 text-sm" data-testid="showing">
				<span class="min-w-0 truncate">Showing <span class="font-semibold">{showing}</span></span>
				<Button class="h-7 shrink-0 px-1" onclick={() => pickDays(null)} variant="link">Show all ✕</Button>
			</div>
		{/if}
	{/await}
	<div class="flex h-px grow flex-col gap-1 overflow-y-auto">
		{#each workouts as workout}
			{@const { workoutOfMesocycle } = workout}
			{@const status = workoutOfMesocycle?.workoutStatus ?? null}
			<!-- Date and name, then length and volume. Skipped and rest days (only in old history) say so -->
			<Button
				class="flex h-auto flex-col items-stretch gap-0.5 rounded-md border bg-card p-2 font-normal"
				href="/workouts/{workout.id}"
				variant="outline"
			>
				<span class="flex items-baseline justify-between gap-2">
					<span class="whitespace-nowrap text-lg font-semibold">
						{workout.startedAt.toLocaleDateString(undefined, {
							day: '2-digit',
							month: 'long'
						})}
					</span>
					<span class="flex min-w-0 items-center gap-1 text-muted-foreground">
						{#if workout.note}
							<StickyNoteIcon class="shrink-0" />
						{/if}
						<span class="truncate" data-testid="workout-name">
							{#if status === 'RestDay'}
								Rest
							{:else}
								{workoutName(workout)}{status === 'Skipped' ? ' (skipped)' : ''}
							{/if}
						</span>
					</span>
				</span>
				<span class="flex gap-4 text-sm text-muted-foreground">
					{#if status === null}
						<span data-testid="workout-length">{formatWorkoutLength(workout.startedAt, workout.endedAt)}</span>
						<span data-testid="workout-volume">
							Volume <span class="font-medium text-foreground">{formatVolume(workout.volume)}</span>
						</span>
					{:else}
						<span>{status === 'RestDay' ? 'Rest day' : 'Skipped'}</span>
					{/if}
				</span>
			</Button>
		{/each}
		<DefaultInfiniteLoader {loadMore} identifier={currentFilters} entityPlural="workouts" />
	</div>
</div>
