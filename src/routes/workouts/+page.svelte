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

	let { data } = $props();

	/** A workout's volume in the home unit, in full, e.g. "3,659 kg" */
	function formatVolume(kg: number) {
		const unit = $page.data.homeWeightUnit ?? 'KG';
		return `${Math.round(fromKg(kg, unit)).toLocaleString()} ${unitLabel(unit)}`;
	}
	let workouts: RouterOutputs['workouts']['load'] = $state([]);
	let currentFilters = $derived(getCurrentFilters());

	function getCurrentFilters() {
		const currentFilters: Exclude<RouterInputs['workouts']['load']['filters'], undefined> = {};
		const startDate = $page.url.searchParams.get('startDate');
		const endDate = $page.url.searchParams.get('endDate');
		const selectedMesocycles = $page.url.searchParams.get('selectedMesocycles');

		if (startDate) {
			currentFilters.startDate = new Date(startDate);
		}
		if (endDate) {
			currentFilters.endDate = new Date(endDate);
		}
		if (selectedMesocycles) {
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

	function createNewWorkout() {
		if (workoutRunes.editingWorkoutId !== null) workoutRunes.resetStores();
		goto('/workouts/manage/start');
	}

	function setFilters(selectedDateRange: DateRange, selectedMesocycles: (string | null)[]) {
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

		if (selectedMesocycles.length) {
			newURL.searchParams.set('selectedMesocycles', JSON.stringify(selectedMesocycles));
		} else {
			newURL.searchParams.delete('selectedMesocycles');
		}

		// Skipped and rest days are gone: an old link's filter on them goes too
		newURL.searchParams.delete('selectedWorkoutStatuses');

		if (newURL.toString() === $page.url.toString()) return;
		workouts = [];
		goto(newURL);
	}
</script>

<H2>Workouts</H2>

<div class="flex grow flex-col gap-2">
	<div class="flex gap-1">
		{#await data.filterData}
			<Skeleton class="h-10 w-full" />
		{:then filterData}
			{#if filterData}
				<FilterComponent {filterData} {currentFilters} {setFilters} />
			{:else}
				<NoWorkoutsFilterComponent />
			{/if}
		{/await}
		<Button aria-label="create-workout" onclick={createNewWorkout}><AddIcon /></Button>
	</div>
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
