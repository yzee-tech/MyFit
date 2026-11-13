<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/stores';
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
	import SetsPerMuscleChart from '$lib/components/charts/SetsPerMuscleChart.svelte';
	import { workoutRunes } from '../workoutRunes.svelte';
	import { buildWorkoutSaveData, saveWorkoutEdits } from '../saveWorkout';
	import WorkoutComparisonChart from './(components)/WorkoutComparisonChart.svelte';
	import Quotes from '$lib/components/settings/Quotes.svelte';
	import { workoutOutbox, withTimeout } from '$lib/workoutOutbox.svelte';
	import { classifyFailure, outboxLabel, type OutboxRequest } from '$lib/utils/outbox';

	let { data } = $props();

	const shouldShowQuote =
		data.userSettings.motivationalQuotesEnabled && data.userSettings.quotesDisplayModes.includes('POST_WORKOUT');

	let savingWorkout = $state(false);
	// The id of a workout just kept on the phone: this page then says so, and has no workout left to show
	let keptOnPhoneId: string | null = $state(null);
	let sentFromPhone = $derived(keptOnPhoneId !== null && !workoutOutbox.has(keptOnPhoneId));
	let workoutExercises = $derived(workoutRunes.workoutExercises ?? []);

	function preProcessSetData() {
		if (workoutRunes.workoutData === null || workoutRunes.workoutExercises === null) return;
		savingWorkout = true;
		return buildWorkoutSaveData();
	}

	type CreateData = RouterInputs['workouts']['create'];

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

		// A workout is a record of what was done: it never changes its routine (My routines does)
		await submitWorkout(createData);
	}

	/**
	 * A new workout that couldn't be sent for want of a connection (or a lapsed sign-in): kept on the phone and
	 * sent when the app can. False when it must stay open instead: the server refused it, or the phone won't
	 * keep it (then nothing is cleared and the usual message shows)
	 */
	async function keepOnPhone(createData: CreateData, clientId: string, error: unknown) {
		const failure = classifyFailure(error);
		const session = $page.data.session as { user?: { id?: string }; userId?: string } | null | undefined;
		const userId = session?.user?.id ?? session?.userId;
		if (failure.kind === 'refused' || !userId) return false;
		// The end time is the phone's: fixed now, not when it is finally sent
		const { startedAt, endedAt } = createData.workoutData;
		const request = {
			...createData,
			clientId,
			workoutData: {
				...createData.workoutData,
				startedAt: new Date(startedAt ?? Date.now()).toISOString(),
				endedAt: new Date(endedAt ?? Date.now()).toISOString()
			}
		} as unknown as OutboxRequest;
		const added = workoutOutbox.add({
			clientId,
			userId,
			queuedAt: new Date().toISOString(),
			request,
			label: outboxLabel(request),
			state: failure.kind,
			attempts: 0,
			lastAttemptAt: null,
			lastError: failure.kind === 'signIn' ? failure.reason : null
		});
		if (!added) return false;
		// On the list first, then off the screen: it is never in neither place. This page stays (the Workouts list
		// needs the server, which a phone with no signal can't reach): it says where the workout is
		keptOnPhoneId = clientId;
		workoutRunes.resetStores();
		toast.success("Saved on this phone. It will be sent when you're back online.");
		return true;
	}

	async function submitWorkout(createData: CreateData) {
		savingWorkout = true;
		try {
			let message;
			// A new blank workout (e.g. with a trainer) can be kept as a routine
			let blankWorkoutId: string | null = null;
			if (workoutRunes.editingWorkoutId === null) {
				const clientId = workoutRunes.ensureClientId() ?? undefined;
				let created;
				try {
					created = await withTimeout(trpc().workouts.create.mutate({ ...createData, clientId }));
				} catch (error) {
					if (clientId && (await keepOnPhone(createData, clientId, error))) {
						savingWorkout = false;
						return;
					}
					throw error;
				}
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
			// Nothing is lost: the workout stays here to save again
			toast.error(
				// The server's own words when it answered; a request that never got there has none worth showing
				error instanceof TRPCClientError && error.shape
					? error.message
					: "Couldn't save the workout, check your connection and try again"
			);
		}
		savingWorkout = false;
	}
</script>

{#if keptOnPhoneId !== null}
	<H3>{sentFromPhone ? 'Workout sent' : 'Saved on this phone'}</H3>
	<div class="flex w-full flex-col gap-3 rounded-md border bg-card p-4" data-testid="saved-on-phone">
		<p>
			{#if sentFromPhone}
				It reached your account.
			{:else}
				Your workout is kept on this phone and will be sent when you're back online. Open MyFit then to send it, or tap
				Send now.
			{/if}
		</p>
		<div class="grid grid-cols-2 gap-1">
			{#if !sentFromPhone}
				<Button disabled={workoutOutbox.sending} onclick={() => workoutOutbox.send('manual')} variant="secondary">
					Send now
				</Button>
			{/if}
			<Button class={sentFromPhone ? 'col-span-2' : ''} onclick={() => goto('/workouts')}>Back to workouts</Button>
		</div>
	</div>
{:else}
	<H3>Overview</H3>

	{#if shouldShowQuote}
		<Quotes mode="POST_WORKOUT" class="mb-6" />
	{/if}

	<Tabs.Root class="w-full" value="progression">
		<Tabs.List class="grid grid-cols-2">
			<Tabs.Trigger value="progression">Progression</Tabs.Trigger>
			<Tabs.Trigger value="basic">Muscles</Tabs.Trigger>
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
			<SetsPerMuscleChart
				exercises={workoutExercises.map((exercise) => ({
					...exercise,
					sets: exercise.sets.filter((set) => !set.skipped && set.reps !== undefined).length
				}))}
				label="Sets done"
			/>
		</Tabs.Content>
	</Tabs.Root>

	<div class="mt-4 flex w-full flex-col gap-1.5">
		<Label for="workout-note">Workout note</Label>
		<Textarea id="workout-note" placeholder="Type here (optional)" bind:value={workoutRunes.workoutData!.note}
		></Textarea>
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
{/if}
