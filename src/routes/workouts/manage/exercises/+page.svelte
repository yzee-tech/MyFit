<script lang="ts">
	import { goto } from '$app/navigation';
	import InfoPopover from '$lib/components/InfoPopover.svelte';
	import AddEditExerciseDrawer from '$lib/components/mesocycleAndExerciseSplit/AddEditExerciseDrawer.svelte';
	import AddIcon from 'virtual:icons/lucide/plus';
	import Button from '$lib/components/ui/button/button.svelte';
	import Progress from '$lib/components/ui/progress/progress.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import H3 from '$lib/components/ui/typography/H3.svelte';
	import { arraySum } from '$lib/utils.js';
	import { formatWorkoutClock } from '$lib/utils/workoutLength';
	import { onMount } from 'svelte';
	import { trpc } from '$lib/trpc/client';
	import type { RouterOutputs } from '$lib/trpc/router';
	import { TRPCClientError } from '@trpc/client';
	import { browserTimeZone, withHintBase } from '$lib/utils/workoutUtils';
	import { toast } from 'svelte-sonner';
	import ReorderIcon from 'virtual:icons/lucide/git-compare-arrows';
	import LoaderCircle from 'virtual:icons/lucide/loader-circle';
	import EditIcon from 'virtual:icons/lucide/pencil';
	import CompareIcon from 'virtual:icons/lucide/scale';
	import { workoutRunes } from '../workoutRunes.svelte.js';
	import DndComponent from './(components)/DndComponent.svelte';
	import ExerciseHistorySheet from './(components)/ExerciseHistorySheet.svelte';
	import ResponsiveDialog from '$lib/components/ResponsiveDialog.svelte';
	import WarmUpDialog from './(components)/WarmUpDialog.svelte';
	import EditWorkoutDetails from './(components)/EditWorkoutDetails.svelte';
	import { page } from '$app/stores';
	import QuotesDialog from './(components)/QuotesDialog.svelte';
	import QuickAddSheet from './(components)/QuickAddSheet.svelte';
	import { blankWorkoutName } from '$lib/utils/workoutNames';

	let { data } = $props();
	let reordering = $state(false);
	let quickAdd: ReturnType<typeof QuickAddSheet> | undefined = $state();
	let comparing = $state(false);

	const shouldShowQuote =
		data.userSettings.motivationalQuotesEnabled && data.userSettings.quotesDisplayModes.includes('BETWEEN_SETS');

	let workoutData = $derived(workoutRunes.workoutData);

	// The workout's clock and the rest since the last ticked set, for a new workout (not an edit).
	// lastActivityAt is only ever set by markActivity() on a set or mini-set tick, and cleared only by
	// resetStores(): unticking a set leaves it, so rest keeps counting from the last tick
	let now = $state(new Date());
	$effect(() => {
		// Only writes `now`, never reads it: reading it here would re-run the effect every second and stack intervals
		const timer = setInterval(() => (now = new Date()), 1000);
		return () => clearInterval(timer);
	});
	let showClock = $derived(workoutRunes.editingWorkoutId === null && Boolean(workoutData?.startedAt));
	let lastActivityAt = $derived(workoutRunes.lastActivityAt);
	let workoutExercises = $derived(workoutRunes.workoutExercises);

	let totalSets = $derived(
		workoutExercises
			? arraySum(
					workoutExercises.map((e) => arraySum(e.sets.filter((s) => !s.skipped).map((s) => s.miniSets.length + 1)))
				)
			: null
	);
	let completedSets = $derived(
		workoutExercises
			? arraySum(
					workoutExercises.map((e) =>
						arraySum(
							e.sets
								.filter((s) => !s.skipped)
								.map((s) => s.miniSets.filter((ms) => ms.completed).length + (s.completed ? 1 : 0))
						)
					)
				)
			: null
	);

	onMount(() => {
		if (workoutRunes.workoutData === null) goto('./start');
		void loadSuggestions();
	});

	async function loadSuggestions() {
		const request = data.suggestionsRequest;
		// Edits, blank workouts and keepCurrent carry no suggestion request.
		if (request === null) {
			if (workoutRunes.workoutExercises === null) workoutRunes.workoutExercises = [];
			return;
		}
		const needsLoad = () =>
			workoutRunes.workoutExercises === null ||
			(workoutRunes.suggestionsFailed && workoutRunes.workoutExercises.length === 0);
		if (!needsLoad()) return;
		const startedAt = workoutRunes.workoutData?.startedAt;
		const startedMs = startedAt === undefined ? NaN : new Date(startedAt).getTime();
		let serverData: RouterOutputs['workouts']['getWorkoutExercisesWithPreviousData'] | null = null;
		let failure: unknown;
		try {
			serverData = await trpc().workouts.getWorkoutExercisesWithPreviousData.query({
				...request,
				timeZone: browserTimeZone(),
				now: new Date().toISOString()
			});
		} catch (error) {
			failure = error;
		}
		// A discarded/replaced workout, or a list filled while this was pending, owns its own state.
		if (workoutRunes.workoutData === null || new Date(workoutRunes.workoutData.startedAt).getTime() !== startedMs)
			return;
		if (!needsLoad()) return;
		if (serverData !== null) {
			workoutRunes.workoutExercises = serverData.todaysWorkoutExercises.map((exercise) => ({
				...exercise,
				sets: withHintBase(exercise.sets)
			}));
			workoutRunes.previousWorkoutData = serverData.previousWorkoutData ?? null;
			if (serverData.repsOnly) workoutRunes.repsOnly = { ...workoutRunes.repsOnly, ...serverData.repsOnly };
			if (serverData.measures) workoutRunes.measures = { ...workoutRunes.measures, ...serverData.measures };
			workoutRunes.suggestionsFailed = false;
		} else {
			toast.error(
				failure instanceof TRPCClientError ? failure.message : "Couldn't get your exercises, check your connection",
				{
					action: {
						label: 'Retry',
						onClick: () => {
							void loadSuggestions();
						}
					}
				}
			);
			if (workoutRunes.workoutExercises === null) {
				workoutRunes.workoutExercises = [];
				workoutRunes.suggestionsFailed = true;
			}
		}
	}

	function getFormattedDate(date: string | Date) {
		if (typeof date === 'string') date = new Date(date);
		return date.toLocaleString(undefined, {
			month: 'long',
			day: 'numeric'
		});
	}

	function submitWorkoutExercises() {
		if (totalSets === null || completedSets === null) return;
		if (workoutExercises === null) return;
		if (workoutExercises.length === 0) {
			toast.error('Add at least one exercise');
			return;
		}
		// Sets not done yet: remove them, or keep going (nothing done at all: keep going, or discard)
		if (completedSets < totalSets) {
			removeDialogOpen = true;
			return;
		}
		goto('./overview');
	}

	let discardDialogOpen = $state(false);
	function discardWorkout() {
		const message = workoutRunes.editingWorkoutId === null ? 'Workout discarded' : 'Changes discarded';
		workoutRunes.resetStores();
		discardDialogOpen = false;
		toast.success(message);
		goto('/workouts');
	}

	let removeDialogOpen = $state(false);
	let setsLeft = $derived(totalSets !== null && completedSets !== null ? totalSets - completedSets : 0);

	/**
	 * Removes every set not done (with its mini-sets; unfinished mini-sets of a done set too), and an
	 * exercise left with none, then moves on. A past workout's old skipped sets stay as they were
	 */
	function removeSetsLeftAndContinue() {
		if (!workoutRunes.workoutExercises) return;
		workoutRunes.workoutExercises = workoutRunes.workoutExercises
			.map((exercise) => ({
				...exercise,
				sets: exercise.sets
					.filter((set) => set.completed || set.skipped)
					.map((set) => ({ ...set, miniSets: set.miniSets.filter((miniSet) => miniSet.completed) }))
			}))
			.filter((exercise) => exercise.sets.length > 0);
		removeDialogOpen = false;
		goto('./overview');
	}
</script>

<div class="flex items-baseline justify-between gap-2">
	<H3>Exercises</H3>
	{#if showClock && workoutData}
		<span class="text-sm font-semibold tabular-nums" aria-label="Workout time and rest">
			⏱ <span data-testid="workout-clock">{formatWorkoutClock(workoutData.startedAt, now)}</span>
			{#if lastActivityAt}
				<span class="font-normal text-muted-foreground">· Rest</span>
				<span class="text-primary" data-testid="workout-rest">{formatWorkoutClock(lastActivityAt, now)}</span>
			{/if}
		</span>
	{/if}
</div>

<!-- Editing a past workout: its date, times and bodyweight are here, not on a page of their own -->
{#if workoutData !== null && workoutRunes.editingWorkoutId !== null}
	<EditWorkoutDetails open={$page.url.searchParams.has('details')} />
{/if}

{#if workoutData !== null}
	<div class="flex items-end">
		<div class="mr-auto flex flex-col">
			{#if workoutData.workoutOfMesocycle !== undefined}
				<span class="text-lg font-semibold">
					{workoutData.workoutOfMesocycle.splitDayName}
				</span>
				<span class="flex items-center gap-2 text-sm text-muted-foreground">
					Week {workoutData.workoutOfMesocycle.cycleNumber}
					<InfoPopover align="center" ariaLabel="mesocycle-info">
						<span class="text-sm text-foreground">
							<p class="font-semibold">{workoutData.workoutOfMesocycle.mesocycle.name}</p>
							{getFormattedDate(workoutData.startedAt)}
						</span>
					</InfoPopover>
				</span>
			{:else if workoutData.routineName}
				<span class="text-lg font-semibold" data-testid="workout-routine-name">{workoutData.routineName}</span>
				<span class="text-sm text-muted-foreground">{getFormattedDate(workoutData.startedAt)}</span>
			{:else}
				<!-- A blank workout: named after the time it started -->
				<span class="text-lg font-semibold" data-testid="workout-routine-name">
					{blankWorkoutName(workoutData.startedAt)}
				</span>
				<span class="text-sm text-muted-foreground">{getFormattedDate(workoutData.startedAt)}</span>
			{/if}
		</div>
		<div class="grid grid-cols-3 gap-1">
			<Button
				aria-label="reorder-toggle"
				disabled={comparing}
				onclick={() => (reordering = !reordering)}
				size="icon"
				variant="outline"
			>
				{#if !reordering}
					<ReorderIcon />
				{:else}
					<EditIcon />
				{/if}
			</Button>
			<Button
				aria-label="compare-exercises"
				disabled={reordering || workoutRunes.editingWorkoutId !== null}
				onclick={() => (comparing = !comparing)}
				size="icon"
				variant="outline"
			>
				{#if !comparing}
					<CompareIcon />
				{:else}
					<EditIcon />
				{/if}
			</Button>
			<AddEditExerciseDrawer
				addExercise={workoutRunes.addExercise}
				context="workout"
				editExercise={workoutRunes.editExercise}
				editingExercise={workoutRunes.editingExercise}
				mesocycle={workoutData.workoutOfMesocycle?.mesocycle}
				onAdd={() => quickAdd?.openSheet()}
				setEditingExercise={workoutRunes.setEditingExercise}
			/>
			{#if totalSets !== null && completedSets !== null}
				<Progress class="col-span-full h-1.5" max={totalSets} value={completedSets} />
			{:else}
				<Skeleton class="col-span-3 h-1.5 w-full" />
			{/if}
		</div>
	</div>
{/if}

{#if workoutRunes.workoutExercises === null}
	<div class="flex h-full w-full items-center justify-center text-muted-foreground">
		Fetching exercises
		<LoaderCircle class="ml-2 animate-spin" />
	</div>
{:else}
	<div class="mt-2 flex h-px grow flex-col overflow-y-auto">
		<DndComponent {comparing} {reordering} bind:itemList={workoutRunes.workoutExercises}>
			{#snippet footer()}
				<!-- The main way to add one: big, under the exercises (the small + above stays) -->
				{#if !reordering && !comparing}
					<Button
						class="mt-2 h-12 w-full shrink-0 gap-2 border-2 border-dashed border-primary bg-primary/5 font-semibold text-primary hover:bg-primary/10 hover:text-primary"
						aria-label="Add an exercise"
						data-testid="add-exercise-big"
						onclick={() => quickAdd?.openSheet()}
						variant="ghost"
					>
						<AddIcon class="h-4 w-4" /> Add exercise
					</Button>
				{/if}
			{/snippet}
		</DndComponent>
	</div>
{/if}

<Button
	class="mt-1 h-8 border border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive"
	onclick={() => (discardDialogOpen = true)}
	size="sm"
	variant="ghost"
>
	{workoutRunes.editingWorkoutId === null ? 'Discard workout' : 'Discard changes'}
</Button>
<div class="mt-1 grid grid-cols-2 gap-1">
	<!-- An edit has no start step: back to the workout (it asks first if anything changed) -->
	<Button
		href={workoutRunes.editingWorkoutId === null ? './start' : `/workouts/${workoutRunes.editingWorkoutId}`}
		variant="secondary"
	>
		Previous
	</Button>
	<Button onclick={submitWorkoutExercises}>Next</Button>
</div>

<ResponsiveDialog
	title={workoutRunes.editingWorkoutId === null ? 'Discard this workout?' : 'Discard your changes?'}
	bind:open={discardDialogOpen}
>
	{#snippet description()}
		{#if workoutRunes.editingWorkoutId === null}
			Everything entered so far is cleared. This can't be undone.
		{:else}
			The saved workout stays as it was.
		{/if}
	{/snippet}
	<Button onclick={discardWorkout} variant="destructive">Yes, discard</Button>
</ResponsiveDialog>

<ResponsiveDialog
	title={completedSets === 0 ? 'No sets done yet' : `${setsLeft} ${setsLeft === 1 ? 'set' : 'sets'} not done`}
	bind:open={removeDialogOpen}
>
	{#snippet description()}
		{#if completedSets === 0}
			There's nothing to save yet. Keep going, or discard {workoutRunes.editingWorkoutId === null
				? 'the workout'
				: 'your changes'}.
		{:else}
			Remove {setsLeft === 1 ? 'it' : 'them'} and finish? Sets not ticked aren't saved.
		{/if}
	{/snippet}
	<div class="grid grid-cols-2 gap-1.5">
		<Button onclick={() => (removeDialogOpen = false)} variant="secondary">Keep going</Button>
		{#if completedSets === 0}
			<Button
				onclick={() => {
					removeDialogOpen = false;
					discardDialogOpen = true;
				}}
				variant="destructive"
			>
				{workoutRunes.editingWorkoutId === null ? 'Discard workout' : 'Discard changes'}
			</Button>
		{:else}
			<Button onclick={removeSetsLeftAndContinue}>Remove and finish</Button>
		{/if}
	</div>
</ResponsiveDialog>

<ExerciseHistorySheet />
<WarmUpDialog />
<QuickAddSheet bind:this={quickAdd} />

{#if shouldShowQuote && completedSets}
	<QuotesDialog {completedSets} />
{/if}
