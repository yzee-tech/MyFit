<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { navigating } from '$app/stores';
	import ResponsiveDialog from '$lib/components/ResponsiveDialog.svelte';
	import Quotes from '$lib/components/settings/Quotes.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte';
	import { Switch } from '$lib/components/ui/switch';
	import H3 from '$lib/components/ui/typography/H3.svelte';
	import { trpc } from '$lib/trpc/client.js';
	import type { RouterOutputs } from '$lib/trpc/router.js';
	import { cn, convertCamelCaseToNormal } from '$lib/utils.js';
	import { getRIRForWeek } from '$lib/utils/workoutUtils';
	import { toast } from 'svelte-sonner';
	import LoaderCircle from 'virtual:icons/lucide/loader-circle';
	import { workoutRunes } from '../workoutRunes.svelte.js';

	type TodaysWorkoutData = RouterOutputs['workouts']['getTodaysWorkoutData'];
	type RoutineOption = NonNullable<TodaysWorkoutData['activeBlock']>['routines'][number];

	let { data } = $props();

	function dateToLocalISOString(date: Date): string {
		return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
	}

	function localISOStringToDate(isoString: string): Date {
		const localDate = new Date(isoString);
		return new Date(localDate.getTime());
	}

	function formatLastDone(lastDoneAt: Date | string | null) {
		if (lastDoneAt === null) return 'Not done yet';
		const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
		const days = Math.round((startOfDay(new Date()) - startOfDay(new Date(lastDoneAt))) / 86400000);
		if (days <= 0) return 'Done today';
		if (days === 1) return 'Done yesterday';
		return `Done ${days} days ago`;
	}

	function getMuscleGroups(routine: RoutineOption) {
		const muscleGroups = routine.workoutExercises.map((ex) => ex.customMuscleGroup ?? ex.targetMuscleGroup);
		return Array.from(new Set(muscleGroups));
	}

	const shouldShowQuote =
		data.userSettings.motivationalQuotesEnabled && data.userSettings.quotesDisplayModes.includes('PRE_WORKOUT');

	let useActiveMesocycle = $state(false);
	let workoutData = $state<TodaysWorkoutData | 'loading'>('loading');
	let selectedRoutineIndex: number | null = $state(null);
	let userBodyweight: null | number = $state(workoutRunes.workoutData?.userBodyweight ?? null);
	let overwriteWorkoutDialogOpen = $state(false);
	let finishingBlock = $state(false);

	let activeBlock = $derived(workoutData === 'loading' ? undefined : workoutData.activeBlock);
	let selectedRoutine = $derived(
		activeBlock?.routines.find((routine) => routine.splitDayIndex === selectedRoutineIndex)
	);
	let canStart = $derived(userBodyweight !== null && (!useActiveMesocycle || selectedRoutine !== undefined));

	$effect(() => {
		data.workoutData.then((data) => {
			if (workoutRunes.editingWorkoutId === null) workoutData = data;
			else workoutData = workoutRunes.workoutData as TodaysWorkoutData;

			userBodyweight = userBodyweight ?? workoutData.userBodyweight;
			if (workoutData.activeBlock !== undefined) useActiveMesocycle = true;
		});
	});

	function buildWorkoutData(): TodaysWorkoutData | null {
		if (workoutData === 'loading') return null;
		const { activeBlock, ...rest } = workoutData;
		if (!useActiveMesocycle || !activeBlock || !selectedRoutine) {
			return { ...rest, workoutExercises: [], workoutOfMesocycle: undefined };
		}
		return {
			...rest,
			workoutExercises: selectedRoutine.workoutExercises,
			workoutOfMesocycle: {
				mesocycle: activeBlock.mesocycle,
				cycleNumber: activeBlock.weekNumber,
				splitDayName: selectedRoutine.name,
				splitDayIndex: selectedRoutine.splitDayIndex,
				workoutStatus: null
			}
		};
	}

	async function startWorkout(fromDialog = false, mode: 'keepCurrent' | 'overwrite' = 'overwrite') {
		if (workoutRunes.editingWorkoutId) {
			if (workoutRunes.workoutData) workoutRunes.workoutData.userBodyweight = userBodyweight;
			workoutRunes.saveStoresToLocalStorage();
			await goto('./exercises?editing');
			return;
		}

		if (workoutRunes.workoutExercises !== null && !fromDialog) {
			overwriteWorkoutDialogOpen = true;
			return;
		}
		overwriteWorkoutDialogOpen = false;

		const newWorkoutData = buildWorkoutData();
		if (newWorkoutData === null) return;
		newWorkoutData.userBodyweight = userBodyweight;

		if (mode === 'overwrite') {
			workoutRunes.workoutData = newWorkoutData;
			workoutRunes.workoutExercises = null;
			workoutRunes.previousWorkoutData = null;
		} else if (workoutRunes.workoutData === null) workoutRunes.workoutData = newWorkoutData;
		workoutRunes.saveStoresToLocalStorage();

		const workoutOfMesocycle = workoutRunes.workoutData.workoutOfMesocycle;
		let exercisesLink = `./exercises?userBodyweight=${userBodyweight}`;
		if (workoutOfMesocycle) exercisesLink += '&useActiveMesocycle';
		if (mode === 'keepCurrent') exercisesLink += '&keepCurrent';
		if (workoutOfMesocycle) exercisesLink += `&splitDayIndex=${workoutOfMesocycle.splitDayIndex}`;
		goto(exercisesLink);
	}

	async function finishBlock() {
		if (!activeBlock) return;
		finishingBlock = true;
		const { mesocycle } = activeBlock;
		try {
			const { message } = await trpc().mesocycles.progressToNextStage.mutate({
				id: mesocycle.id,
				startDate: mesocycle.startDate,
				endDate: null
			});
			toast.success(message);
			await invalidate('workouts:start');
			await goto(`/mesocycles/${mesocycle.id}?completion`);
		} finally {
			finishingBlock = false;
		}
	}
</script>

<H3>Start</H3>

{#if shouldShowQuote}
	<Quotes mode="PRE_WORKOUT" class="mb-1" />
{/if}

{#if workoutData === 'loading'}
	<Skeleton class="mb-1 h-14 w-full rounded-lg border border-opacity-0" />
	<Skeleton class="mb-1 h-[96px] w-full" />
	<Skeleton class="h-[166px] w-full" />
	<Skeleton class="mt-auto h-10 w-full" />
{:else}
	{#if activeBlock?.blockFinished && workoutRunes.editingWorkoutId === null}
		<Card.Root class="mb-1">
			<Card.Header>
				<Card.Title>Block finished &nbsp;🎉</Card.Title>
				<Card.Description>
					All {activeBlock.totalWeeks} weeks of {activeBlock.mesocycle.name} are done. Finish it to see how it went, then
					start a new one. If you want to keep going, extend it instead.
				</Card.Description>
			</Card.Header>
			<Card.Footer class="flex justify-end gap-1">
				<Button href={`/mesocycles/${activeBlock.mesocycle.id}`} variant="secondary">Extend</Button>
				<Button disabled={finishingBlock} onclick={finishBlock}>
					{#if finishingBlock}
						<LoaderCircle class="animate-spin" />
					{:else}
						Finish block
					{/if}
				</Button>
			</Card.Footer>
		</Card.Root>
	{/if}
	{#if workoutRunes.editingWorkoutId === null}
		<div class="mb-1 flex items-center justify-between gap-2 rounded-lg border bg-card p-4">
			<Label for="use-active-mesocycle">
				{activeBlock === undefined ? 'No' : 'Use'} active mesocycle
			</Label>
			{#if activeBlock === undefined}
				<Switch id="use-active-mesocycle" name="use-active-mesocycle" disabled />
			{:else}
				<Switch id="use-active-mesocycle" name="use-active-mesocycle" bind:checked={useActiveMesocycle} />
			{/if}
		</div>
	{/if}
	<form
		class="mb-1 flex w-full flex-col gap-1.5 rounded-lg border bg-card p-4"
		name="user-bodyweight-form"
		id="user-bodyweight-form"
		onsubmit={(e) => {
			e.preventDefault();
			startWorkout();
		}}
	>
		<Label for="user-bodyweight">Bodyweight</Label>
		<Input id="user-bodyweight" placeholder="Type here" type="number" min={1} step={0.01} bind:value={userBodyweight} />
		{#if workoutRunes.editingWorkoutId !== null && workoutRunes.workoutData}
			<div class="grid grid-cols-2 gap-x-2 gap-y-1.5">
				<Label for="start-date">Start date</Label>
				<Label for="end-date">End date</Label>
				<Input
					id="start-date"
					type="datetime-local"
					value={dateToLocalISOString(workoutRunes.workoutData.startedAt as Date)}
					onchange={(e) => {
						workoutRunes.workoutData!.startedAt = localISOStringToDate(e.currentTarget.value);
					}}
					required
				/>
				<Input
					id="end-date"
					type="datetime-local"
					min={dateToLocalISOString(workoutRunes.workoutData.startedAt as Date)}
					value={dateToLocalISOString(workoutRunes.workoutData.endedAt! as Date)}
					onchange={(e) => {
						workoutRunes.workoutData!.endedAt = localISOStringToDate(e.currentTarget.value);
					}}
					required
				/>
			</div>
		{/if}
	</form>
	{#if useActiveMesocycle && activeBlock && workoutRunes.editingWorkoutId === null}
		<div class="mb-1 flex items-baseline justify-between px-1">
			<span class="font-semibold">Pick a routine</span>
			<span class="text-sm text-muted-foreground">
				Week {Math.min(activeBlock.weekNumber, activeBlock.totalWeeks)} of {activeBlock.totalWeeks} · {getRIRForWeek(
					activeBlock.mesocycle.RIRProgression,
					activeBlock.weekNumber
				)} RIR
			</span>
		</div>
		{#if activeBlock.routines.length === 0}
			<p class="mb-1 px-1 text-sm text-muted-foreground">This block has no routines yet.</p>
		{/if}
		<div class="mb-1 flex flex-col gap-1" role="radiogroup" aria-label="Routine">
			{#each activeBlock.routines as routine (routine.splitDayIndex)}
				{@const selected = routine.splitDayIndex === selectedRoutineIndex}
				<button
					class={cn('flex flex-col gap-2 rounded-lg border bg-card p-4 text-left transition-colors', {
						'border-primary ring-1 ring-primary': selected
					})}
					aria-checked={selected}
					onclick={() => (selectedRoutineIndex = routine.splitDayIndex)}
					role="radio"
					type="button"
				>
					<div class="flex w-full items-baseline justify-between gap-2">
						<span class="font-semibold">{routine.name}</span>
						<span class="shrink-0 text-xs text-muted-foreground">{formatLastDone(routine.lastDoneAt)}</span>
					</div>
					<div class="flex flex-wrap gap-1">
						{#each getMuscleGroups(routine) as muscleGroup}
							<Badge variant="secondary">{convertCamelCaseToNormal(muscleGroup)}</Badge>
						{/each}
					</div>
				</button>
			{/each}
		</div>
	{/if}
	<Button class="mt-auto" type="submit" form="user-bodyweight-form" disabled={!canStart || $navigating !== null}>
		{#if $navigating}
			<LoaderCircle class="animate-spin" />
		{:else if useActiveMesocycle && selectedRoutine === undefined && workoutRunes.editingWorkoutId === null}
			Pick a routine
		{:else}
			Next
		{/if}
	</Button>
{/if}

<ResponsiveDialog title="Warning" bind:open={overwriteWorkoutDialogOpen}>
	{#snippet description()}
		A workout is already in progress with <span class="font-semibold"
			>{workoutRunes.workoutExercises?.length} exercises</span
		>, do you want to overwrite it?
	{/snippet}
	<div class="grid grid-cols-2 gap-1.5">
		<Button onclick={() => startWorkout(true, 'keepCurrent')}>Keep current</Button>
		<Button onclick={() => startWorkout(true, 'overwrite')} variant="destructive">Overwrite</Button>
	</div>
</ResponsiveDialog>
