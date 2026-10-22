<script lang="ts">
	import { replaceState } from '$app/navigation';
	import { page } from '$app/stores';
	import { untrack } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { RangeCalendar } from '$lib/components/ui/range-calendar/index.js';
	import * as Select from '$lib/components/ui/select';
	import { trpc } from '$lib/trpc/client.js';
	import type { RouterOutputs } from '$lib/trpc/router';
	import { dateToCalendarDate } from '$lib/utils';
	import { cn } from '$lib/utils.js';
	import { DateFormatter, getLocalTimeZone } from '@internationalized/date';
	import type { DateRange, Selected } from 'bits-ui';
	import CalendarIcon from 'virtual:icons/lucide/calendar';
	import ChevronsUpDown from 'virtual:icons/lucide/chevrons-up-down';
	import FilterIcon from 'virtual:icons/lucide/filter';
	import LoaderCircle from 'virtual:icons/lucide/loader-circle';
	import WorkoutExerciseCard from '../workouts/[workoutId]/(components)/WorkoutExerciseCard.svelte';
	import ExerciseStatsChart from './ExerciseStatsChart.svelte';

	type WorkoutExercise = RouterOutputs['workouts']['getExerciseHistory'][number];
	type BasicExerciseData = Pick<WorkoutExercise, 'name' | 'targetMuscleGroup' | 'customMuscleGroup'>;

	const df = new DateFormatter('en-US', {
		dateStyle: 'medium'
	});

	let { data }: { data: { exerciseList: Promise<BasicExerciseData[]> } } = $props();
	let exercisesByMuscleGroup = $state<{ group: string; exercises: BasicExerciseData[] }[]>();

	let searchText = $state('');
	// Opening it before the page is ready left it blank, so it needed two taps: it starts closed
	let searchOpen = $state(false);
	let selectedExercise = $state<string>();
	let exerciseInstances = $state<WorkoutExercise[]>();

	let filteredExercisesByMuscleGroup = $derived(
		exercisesByMuscleGroup
			?.filter((g) => g.exercises.some((ex) => ex.name.toLowerCase().includes(searchText.toLowerCase())))
			.map(({ group, exercises }) => ({
				group,
				exercises: exercises.filter((ex) => ex.name.toLowerCase().includes(searchText.toLowerCase()))
			})) ?? []
	);

	let dateRange: DateRange = $state({
		start: dateToCalendarDate(new Date()),
		end: dateToCalendarDate(new Date())
	});
	let mesocycleNames = $derived.by(() => {
		if (!exerciseInstances) return [];
		return Array.from(new Set(exerciseInstances.map((ex) => ex.workout.workoutOfMesocycle?.mesocycle.name ?? null)));
	});
	let selectedMesocycleNames: Selected<string | null>[] = $state([]);

	let filteredExerciseInstances = $derived.by(() => {
		if (!exerciseInstances) return [];
		return exerciseInstances.filter((ex) => {
			const date = dateToCalendarDate(ex.workout.startedAt);
			if (dateRange.start && dateRange.start > date) return false;
			if (dateRange.end && dateRange.end < date) return false;
			if (
				selectedMesocycleNames.length > 0 &&
				!selectedMesocycleNames.some((s) => s.value === (ex.workout.workoutOfMesocycle?.mesocycle.name ?? null))
			)
				return false;
			return true;
		});
	});

	$effect(() => {
		selectedExercise = undefined;
		exercisesByMuscleGroup = undefined;
		searchText = '';
		searchOpen = false;
		exerciseInstances = [];
		loadExercises().then(() => {
			// Opened from an exercise's page
			const requested = untrack(() => $page.url.searchParams.get('exercise'));
			if (requested) selectExercise(requested);
		});
	});

	async function loadExercises() {
		const exerciseList = await data.exerciseList;
		exercisesByMuscleGroup = Object.entries(
			Object.groupBy(exerciseList, (ex) => ex.customMuscleGroup ?? ex.targetMuscleGroup)
		).map(([group, exercises]) => ({
			group,
			exercises: exercises!.filter((ex) => ex !== undefined)
		}));
	}

	function selectExercise(name: string) {
		searchText = name;
		searchOpen = false;
		// Already showing it: carries on as it was
		if (selectedExercise === name) return;
		selectedExercise = name;
		exerciseInstances = [];
		// In the link, so a reload or coming back shows it again (no history entry per pick)
		const url = new URL($page.url);
		url.searchParams.set('exercise', name);
		replaceState(url, {});
		loadAllSessions(name);
	}

	// Every session for the chart (not just a page of them), the latest few hundred at most
	const PAGE_SIZE = 100;
	const MAX_SESSIONS = 200;
	let loadingSessions = $state(false);
	let moreThanShown = $state(false);
	// The date filter follows the sessions loaded, until it's changed by hand
	let dateRangeChanged = false;

	async function loadAllSessions(exerciseName: string) {
		loadingSessions = true;
		moreThanShown = false;
		dateRangeChanged = false;
		const found: WorkoutExercise[] = [];
		const fetchPage = (pageSize: number) =>
			trpc().workouts.getExerciseHistory.query({ exerciseName, cursorId: found.at(-1)?.id, pageSize });
		try {
			while (found.length < MAX_SESSIONS) {
				const pageSize = Math.min(PAGE_SIZE, MAX_SESSIONS - found.length);
				const sessions = await fetchPage(pageSize);
				// Another exercise picked meanwhile
				if (selectedExercise !== exerciseName) return;
				// Never the same workout twice
				const shown = new Set(found.map((ex) => ex.id));
				found.push(...sessions.filter((ex) => !shown.has(ex.id)));
				exerciseInstances = [...found];
				if (!dateRangeChanged && found.length > 0) {
					dateRange = {
						start: dateToCalendarDate(found[found.length - 1].workout.startedAt),
						end: dateToCalendarDate(found[0].workout.startedAt)
					};
				}
				if (sessions.length < pageSize) return;
			}
			// At the limit: is there more than that?
			const beyond = await fetchPage(1);
			if (selectedExercise === exerciseName) moreThanShown = beyond.length > 0;
		} finally {
			if (selectedExercise === exerciseName) loadingSessions = false;
		}
	}
</script>

<div class="flex gap-1">
	<Popover.Root bind:open={searchOpen}>
		<Popover.Trigger asChild let:builder>
			<Button builders={[builder]} variant="outline" role="combobox" class="mb-2 grow justify-between truncate">
				<span class="truncate">{selectedExercise ?? 'Search for an exercise'}</span>
				<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
			</Button>
		</Popover.Trigger>
		<Popover.Content sameWidth>
			<Command.Root class="mb-6 h-fit" shouldFilter={false}>
				<Command.Input placeholder="Type here" bind:value={searchText} />
				<Command.List>
					{#if exercisesByMuscleGroup === undefined}
						<Command.Loading>
							<div
								class="flex h-full w-full flex-row items-center justify-center gap-2 p-4 text-sm text-muted-foreground"
							>
								<LoaderCircle class="animate-spin" />
								<span>Fetching exercises...</span>
							</div>
						</Command.Loading>
					{:else}
						<Command.Empty>No results found.</Command.Empty>
						{#each filteredExercisesByMuscleGroup as { group, exercises }}
							<Command.Group heading={group}>
								{#each exercises as ex}
									<Command.Item onclick={() => selectExercise(ex.name)}>{ex.name}</Command.Item>
								{/each}
							</Command.Group>
						{/each}
					{/if}
				</Command.List>
			</Command.Root>
		</Popover.Content>
	</Popover.Root>
	<Popover.Root>
		<Popover.Trigger asChild let:builder>
			<Button
				builders={[builder]}
				size="icon"
				aria-label="Filter exercises"
				class="shrink-0"
				disabled={(exerciseInstances?.length ?? 0) === 0}
			>
				<FilterIcon />
			</Button>
		</Popover.Trigger>
		<Popover.Content class="w-fit">
			<span class="font-semibold">Filter by date</span>
			<div class="my-2 flex w-full max-w-sm flex-col gap-1.5">
				<Popover.Root openFocus>
					<Popover.Trigger asChild let:builder>
						<Button
							variant="outline"
							class={cn('w-[300px] justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}
							builders={[builder]}
						>
							<CalendarIcon class="mr-2 h-4 w-4" />
							{#if dateRange && dateRange.start}
								{#if dateRange.end}
									{df.format(dateRange.start.toDate(getLocalTimeZone()))} - {df.format(
										dateRange.end.toDate(getLocalTimeZone())
									)}
								{:else}
									{df.format(dateRange.start.toDate(getLocalTimeZone()))}
								{/if}
							{:else if dateRange.start}
								{df.format(dateRange.start.toDate(getLocalTimeZone()))}
							{:else}
								Pick a date
							{/if}
						</Button>
					</Popover.Trigger>
					<Popover.Content class="w-auto p-0" align="start">
						<RangeCalendar
							initialFocus
							onValueChange={() => (dateRangeChanged = true)}
							placeholder={dateRange?.start}
							bind:value={dateRange}
						/>
					</Popover.Content>
				</Popover.Root>
				<span class="font-semibold">Filter by mesocycles</span>
				<Select.Root multiple bind:selected={selectedMesocycleNames}>
					<Select.Trigger class="w-[300px]">
						<Select.Value placeholder="All mesocycles" />
					</Select.Trigger>
					<Select.Content>
						{#each mesocycleNames as mesocycleName}
							<Select.Item class={cn({ italic: mesocycleName === null })} value={mesocycleName}>
								{mesocycleName === null ? 'Non-mesocycle' : mesocycleName}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</Popover.Content>
	</Popover.Root>
</div>

<div class="flex flex-col gap-2">
	{#if selectedExercise}
		{#if exerciseInstances?.length}
			<ExerciseStatsChart {selectedExercise} exercises={filteredExerciseInstances} />
			{#if moreThanShown}
				<span class="px-2 text-sm text-muted-foreground" data-testid="sessions-limit">
					Showing the latest {MAX_SESSIONS} sessions
				</span>
			{/if}
			{#each filteredExerciseInstances as instance}
				<WorkoutExerciseCard exercise={instance} date={new Date(instance.workout.startedAt)} />
			{/each}
		{/if}
		{#if loadingSessions}
			<div class="flex items-center gap-2 px-2 text-sm text-muted-foreground">
				<LoaderCircle class="animate-spin" /> Loading…
			</div>
		{:else if !exerciseInstances?.length}
			<span class="px-2 text-sm text-muted-foreground" data-testid="no-sessions">No sessions yet</span>
		{/if}
	{/if}
</div>
