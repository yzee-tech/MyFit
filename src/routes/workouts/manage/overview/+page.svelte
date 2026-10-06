<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Tabs from '$lib/components/ui/tabs';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import H3 from '$lib/components/ui/typography/H3.svelte';
	import { trpc } from '$lib/trpc/client';
	import type { RouterInputs } from '$lib/trpc/router';
	import { TRPCClientError } from '@trpc/client';
	import { toast } from 'svelte-sonner';
	import LoaderCircle from 'virtual:icons/lucide/loader-circle';
	import ExerciseSplitExercisesCharts from '../../../exercise-splits/(components)/ExerciseSplitExercisesCharts.svelte';
	import { workoutRunes } from '../workoutRunes.svelte';
	import { buildWorkoutSaveData, saveWorkoutEdits } from '../saveWorkout';
	import WorkoutComparisonChart from './(components)/WorkoutComparisonChart.svelte';
	import Quotes from '$lib/components/settings/Quotes.svelte';
	import ResponsiveDialog from '$lib/components/ResponsiveDialog.svelte';
	import type { RouterOutputs } from '$lib/trpc/router';

	let { data } = $props();

	const shouldShowQuote =
		data.userSettings.motivationalQuotesEnabled && data.userSettings.quotesDisplayModes.includes('POST_WORKOUT');

	let savingWorkout = $state(false);
	let workoutExercises = $derived(workoutRunes.workoutExercises ?? []);

	function preProcessSetData() {
		if (workoutRunes.workoutData === null || workoutRunes.workoutExercises === null) return;
		savingWorkout = true;
		return buildWorkoutSaveData();
	}

	// "Update routine?": asked when a block workout differs from its routine; closing it saves nothing
	type CreateData = RouterInputs['workouts']['create'];
	let routineDialogOpen = $state(false);
	let routinePreview: NonNullable<RouterOutputs['workouts']['previewRoutineChanges']> | null = $state(null);
	let pendingCreateData: CreateData | null = $state(null);
	let committing = $state(false);
	$effect(() => {
		if (routineDialogOpen || committing || pendingCreateData === null) return;
		pendingCreateData = null;
		routinePreview = null;
		savingWorkout = false;
	});

	async function chooseRoutineUpdate(updateRoutine: boolean) {
		if (!pendingCreateData) return;
		committing = true;
		routineDialogOpen = false;
		const createData = pendingCreateData;
		pendingCreateData = null;
		await submitWorkout({ ...createData, updateRoutine });
		committing = false;
	}

	async function saveWorkout() {
		if (savingWorkout) return;
		let createData;
		try {
			createData = preProcessSetData();
		} catch (error) {
			if (error instanceof Error) {
				toast.error('Failed to preprocess set data', { description: error.message });
				navigator.clipboard.writeText(JSON.stringify(workoutRunes.workoutExercises));
				console.log(workoutRunes.workoutExercises);
			}
		}

		if (createData === undefined) {
			savingWorkout = false;
			return;
		}

		// A new workout from a routine (block or My routines) may have changed it: ask before saving
		const fromRoutine = createData.workoutData.workoutOfMesocycle || createData.workoutData.routineName;
		if (workoutRunes.editingWorkoutId === null && fromRoutine) {
			try {
				const preview = await trpc().workouts.previewRoutineChanges.mutate(createData);
				if (preview && preview.changes.length > 0) {
					routinePreview = preview;
					pendingCreateData = createData;
					routineDialogOpen = true;
					return;
				}
			} catch (error) {
				toast.error(error instanceof TRPCClientError ? error.message : 'Failed to check the routine');
				savingWorkout = false;
				return;
			}
		}
		await submitWorkout(createData);
	}

	async function submitWorkout(createData: CreateData) {
		savingWorkout = true;
		try {
			let message;
			// A new blank workout (e.g. with a trainer) can be kept as a routine
			let blankWorkoutId: string | null = null;
			if (workoutRunes.editingWorkoutId === null) {
				const created = await trpc().workouts.create.mutate(createData);
				message = created.message;
				const blank = !createData.workoutData.workoutOfMesocycle && !createData.workoutData.routineName;
				if (blank && createData.workoutExercises.length > 0) blankWorkoutId = created.workoutId;
			} else {
				message = await saveWorkoutEdits(createData);
			}
			if (blankWorkoutId) {
				const workoutId = blankWorkoutId;
				toast.success(message, {
					duration: 10000,
					action: { label: 'Save as routine', onClick: () => goto(`/workouts/${workoutId}?saveAsRoutine`) }
				});
			} else {
				toast.success(message);
			}
			await invalidate('workouts:all');
			workoutRunes.resetStores();

			await goto('/workouts');
		} catch (error) {
			if (error instanceof TRPCClientError) toast.error(error.message);
		}
		savingWorkout = false;
	}
</script>

<H3>Overview</H3>

{#if shouldShowQuote}
	<Quotes mode="POST_WORKOUT" class="mb-6" />
{/if}

<Tabs.Root class="w-full" value="progression">
	<Tabs.List class="grid grid-cols-2">
		<Tabs.Trigger value="progression">Progression</Tabs.Trigger>
		<Tabs.Trigger value="basic">Basic</Tabs.Trigger>
	</Tabs.List>
	<Tabs.Content value="progression">
		{#if workoutRunes.previousWorkoutData && workoutRunes.workoutExercises && workoutRunes.workoutData?.userBodyweight}
			<WorkoutComparisonChart
				previousWorkoutData={workoutRunes.previousWorkoutData}
				currentWorkoutData={{
					exercises: workoutRunes.workoutExercises,
					userBodyweight: workoutRunes.workoutData.userBodyweight
				}}
			/>
		{:else}
			<div class="muted-text-box">No previous workout available to compare</div>
		{/if}
	</Tabs.Content>
	<Tabs.Content class="rounded-md border bg-card p-4" value="basic">
		<ExerciseSplitExercisesCharts exercises={workoutExercises} />
	</Tabs.Content>
</Tabs.Root>

<div class="mt-4 flex w-full flex-col gap-1.5">
	<Label for="workout-note">Workout note</Label>
	<Textarea id="workout-note" placeholder="Type here (optional)" bind:value={workoutRunes.workoutData!.note}></Textarea>
</div>

<div class="mt-auto grid grid-cols-2 gap-1">
	<Button onclick={() => window.history.back()} variant="secondary">Previous</Button>
	<Button disabled={savingWorkout} onclick={saveWorkout}>
		{#if savingWorkout}
			<LoaderCircle class="animate-spin" />
		{:else}
			Save
		{/if}
	</Button>
</div>

<ResponsiveDialog
	title={routinePreview ? `Update ${routinePreview.routineName}?` : 'Update routine?'}
	bind:open={routineDialogOpen}
>
	{#snippet description()}
		This workout was different from the routine:
	{/snippet}
	{#if routinePreview}
		<ul class="list-disc pl-5 text-sm" data-testid="routine-changes">
			{#each routinePreview.changes as change}
				<li>{change}</li>
			{/each}
		</ul>
		<p class="text-xs text-muted-foreground">Updating changes {routinePreview.routineName} in My routines.</p>
		<div class="mt-2 grid grid-cols-2 gap-1.5">
			<Button onclick={() => chooseRoutineUpdate(false)} variant="secondary">Just this workout</Button>
			<Button onclick={() => chooseRoutineUpdate(true)}>Update routine</Button>
		</div>
	{/if}
</ResponsiveDialog>
