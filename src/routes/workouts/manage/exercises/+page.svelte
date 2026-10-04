<script lang="ts">
	import { goto } from '$app/navigation';
	import InfoPopover from '$lib/components/InfoPopover.svelte';
	import AddEditExerciseDrawer from '$lib/components/mesocycleAndExerciseSplit/AddEditExerciseDrawer.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Progress from '$lib/components/ui/progress/progress.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import H3 from '$lib/components/ui/typography/H3.svelte';
	import { arraySum } from '$lib/utils.js';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
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
	import QuotesDialog from './(components)/QuotesDialog.svelte';

	let { data } = $props();
	let reordering = $state(false);
	let comparing = $state(false);

	const shouldShowQuote =
		data.userSettings.motivationalQuotesEnabled && data.userSettings.quotesDisplayModes.includes('BETWEEN_SETS');

	let workoutData = $derived(workoutRunes.workoutData);
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

	onMount(async () => {
		if (workoutRunes.workoutData === null) goto('./start');
		const serverData = await data.serverData;
		if (workoutRunes.workoutExercises === null) {
			workoutRunes.workoutExercises = serverData?.todaysWorkoutExercises ?? [];
		}
		if (workoutRunes.previousWorkoutData === null) {
			workoutRunes.previousWorkoutData = serverData?.previousWorkoutData ?? null;
		}
		if (serverData?.repsOnly) workoutRunes.repsOnly = { ...workoutRunes.repsOnly, ...serverData.repsOnly };
		// "Finish now" from the in-progress banner: on to saving, skipping any sets not done (after asking)
		if ($page.url.searchParams.has('finish')) submitWorkoutExercises();
	});

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
		// Sets not done yet: skip them, or keep going
		if (completedSets < totalSets) {
			skipDialogOpen = true;
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

	let skipDialogOpen = $state(false);
	let setsLeft = $derived(totalSets !== null && completedSets !== null ? totalSets - completedSets : 0);

	/** Marks every set not done as skipped (dropping unfinished mini-sets), then moves on */
	function skipSetsLeftAndContinue() {
		workoutRunes.workoutExercises?.forEach((exercise) => {
			exercise.sets.forEach((set) => {
				if (!set.completed && !set.skipped) {
					set.skipped = true;
					set.miniSets = [];
					return;
				}
				set.miniSets = set.miniSets.filter((miniSet) => miniSet.completed);
			});
		});
		workoutRunes.workoutExercises = workoutRunes.workoutExercises;
		skipDialogOpen = false;
		goto('./overview');
	}
</script>

<H3>Exercises</H3>

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
				<span class="text-lg font-semibold">
					{getFormattedDate(workoutData.startedAt)}
				</span>
				<p class="text-sm text-muted-foreground">
					{workoutRunes.editingWorkoutId === null ? 'Without mesocycle' : 'Edit mode'}
				</p>
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
		<DndComponent {comparing} {reordering} bind:itemList={workoutRunes.workoutExercises} />
	</div>
{/if}

<Button class="mt-1 h-8 text-muted-foreground" onclick={() => (discardDialogOpen = true)} size="sm" variant="ghost">
	{workoutRunes.editingWorkoutId === null ? 'Discard workout' : 'Discard changes'}
</Button>
<div class="mt-1 grid grid-cols-2 gap-1">
	<Button href="./start" variant="secondary">Previous</Button>
	<Button onclick={submitWorkoutExercises}>Next</Button>
</div>

<ResponsiveDialog title="Discard this workout?" bind:open={discardDialogOpen}>
	{#snippet description()}
		Everything entered so far is cleared. This can't be undone.
	{/snippet}
	<Button onclick={discardWorkout} variant="destructive">Yes, discard</Button>
</ResponsiveDialog>

<ResponsiveDialog title="{setsLeft} {setsLeft === 1 ? 'set' : 'sets'} not done" bind:open={skipDialogOpen}>
	{#snippet description()}
		Skip {setsLeft === 1 ? 'it' : 'them'} and continue? Skipped sets are saved as skipped.
	{/snippet}
	<div class="grid grid-cols-2 gap-1.5">
		<Button onclick={() => (skipDialogOpen = false)} variant="secondary">Keep going</Button>
		<Button onclick={skipSetsLeftAndContinue}>Skip and continue</Button>
	</div>
</ResponsiveDialog>

<ExerciseHistorySheet />
<WarmUpDialog />

{#if shouldShowQuote && completedSets}
	<QuotesDialog {completedSets} />
{/if}
