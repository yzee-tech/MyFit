<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { navigating, page } from '$app/stores';
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
	import { formatWeekEffort, isDeloadWeek } from '$lib/utils/workoutUtils';
	import { toast } from 'svelte-sonner';
	import LoaderCircle from 'virtual:icons/lucide/loader-circle';
	import { workoutRunes } from '../workoutRunes.svelte.js';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import type { WeightUnit } from '$lib/utils/prismaEnums';
	import { fromKg, roundWeight, toKg, unitLabel } from '$lib/utils/weightUnits';
	import type { WeightSetLike } from '$lib/utils/weightSets';
	import * as Select from '$lib/components/ui/select';

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
	// Bodyweight is typed in the home unit and kept in kg
	const homeWeightUnit: WeightUnit = $page.data.homeWeightUnit ?? 'KG';
	const toHomeUnit = (kg: number | null | undefined) =>
		typeof kg === 'number' ? roundWeight(fromKg(kg, homeWeightUnit)) : null;
	let userBodyweight: null | number = $state(toHomeUnit(workoutRunes.workoutData?.userBodyweight));
	let userBodyweightKg = $derived(typeof userBodyweight === 'number' ? toKg(userBodyweight, homeWeightUnit) : null);
	// For routines set to "ask each time": this gym's unit, and the weights it has
	let sessionWeightUnit: WeightUnit = $state(homeWeightUnit);
	let sessionWeightSetId: string | null = $state(null);
	const weightSets: WeightSetLike[] = $page.data.weightSets ?? [];
	let sessionWeightSetOptions = $derived(weightSets.filter((weightSet) => weightSet.unit === sessionWeightUnit));
	let sessionWeightSet = $derived(sessionWeightSetOptions.find((weightSet) => weightSet.id === sessionWeightSetId));
	let switchRoutineDialogOpen = $state(false);
	// A workout already started: this page then sets it up again rather than starting another
	let inProgress = $derived(
		workoutRunes.editingWorkoutId === null &&
			workoutRunes.workoutData !== null &&
			workoutRunes.workoutExercises !== null
	);
	let inProgressRoutineIndex = $derived(workoutRunes.workoutData?.workoutOfMesocycle?.splitDayIndex ?? null);
	let inProgressName = $derived(workoutRunes.workoutData?.workoutOfMesocycle?.splitDayName ?? 'the blank workout');
	let finishingBlock = $state(false);
	let takeItEasy = $state(true);

	let activeBlock = $derived(workoutData === 'loading' ? undefined : workoutData.activeBlock);
	let selectedRoutine = $derived(
		activeBlock?.routines.find((routine) => routine.splitDayIndex === selectedRoutineIndex)
	);
	let sameAsInProgress = $derived(
		(useActiveMesocycle && activeBlock ? selectedRoutineIndex : null) === inProgressRoutineIndex
	);
	let switchToName = $derived(useActiveMesocycle && selectedRoutine ? selectedRoutine.name : 'a blank workout');
	let deloadWeek = $derived(
		activeBlock ? isDeloadWeek(activeBlock.mesocycle.weeklyRIR, activeBlock.weekNumber) : false
	);
	let welcomeBack = $derived(workoutData === 'loading' ? undefined : workoutData.welcomeBack);
	let canStart = $derived(userBodyweight !== null && (!useActiveMesocycle || selectedRoutine !== undefined));

	$effect(() => {
		data.workoutData.then((data) => {
			if (workoutRunes.editingWorkoutId === null) workoutData = data;
			else workoutData = workoutRunes.workoutData as TodaysWorkoutData;

			userBodyweight = userBodyweight ?? toHomeUnit(workoutData.userBodyweight);
			if (workoutData.activeBlock !== undefined) useActiveMesocycle = true;
			// Back from a workout in progress: it stays picked
			if (inProgress) {
				useActiveMesocycle = inProgressRoutineIndex !== null && workoutData.activeBlock !== undefined;
				selectedRoutineIndex = inProgressRoutineIndex;
			}
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
			if (workoutRunes.workoutData) workoutRunes.workoutData.userBodyweight = userBodyweightKg;
			workoutRunes.saveStoresToLocalStorage();
			await goto('./exercises?editing');
			return;
		}

		// A workout in progress carries on; only picking a different routine starts over (after asking)
		if (inProgress && !fromDialog) {
			if (!sameAsInProgress) {
				switchRoutineDialogOpen = true;
				return;
			}
			mode = 'keepCurrent';
			if (workoutRunes.workoutData && userBodyweightKg !== null)
				workoutRunes.workoutData.userBodyweight = userBodyweightKg;
		}
		switchRoutineDialogOpen = false;

		const newWorkoutData = buildWorkoutData();
		if (newWorkoutData === null) return;
		newWorkoutData.userBodyweight = userBodyweightKg;
		const askForUnit = useActiveMesocycle && selectedRoutine?.weightUnit === 'ASK';
		newWorkoutData.sessionWeightUnit = askForUnit || !useActiveMesocycle ? sessionWeightUnit : undefined;
		newWorkoutData.sessionWeightSetId = askForUnit || !useActiveMesocycle ? sessionWeightSet?.id : undefined;

		if (mode === 'overwrite') {
			workoutRunes.workoutData = newWorkoutData;
			workoutRunes.workoutExercises = null;
			workoutRunes.previousWorkoutData = null;
		} else if (workoutRunes.workoutData === null) workoutRunes.workoutData = newWorkoutData;
		workoutRunes.saveStoresToLocalStorage();

		const workoutOfMesocycle = workoutRunes.workoutData.workoutOfMesocycle;
		let exercisesLink = `./exercises?userBodyweight=${userBodyweightKg}`;
		if (workoutOfMesocycle) exercisesLink += '&useActiveMesocycle';
		if (mode === 'keepCurrent') exercisesLink += '&keepCurrent';
		if (workoutOfMesocycle) exercisesLink += `&splitDayIndex=${workoutOfMesocycle.splitDayIndex}`;
		if (workoutOfMesocycle && welcomeBack && takeItEasy && !deloadWeek) exercisesLink += '&welcomeBack';
		if (workoutOfMesocycle && workoutRunes.workoutData.sessionWeightUnit) {
			exercisesLink += `&sessionUnit=${workoutRunes.workoutData.sessionWeightUnit}`;
		}
		if (workoutOfMesocycle && workoutRunes.workoutData.sessionWeightSetId) {
			exercisesLink += `&sessionWeightSetId=${workoutRunes.workoutData.sessionWeightSetId}`;
		}
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
	{#if inProgress}
		<p class="mb-1 rounded-lg border border-primary bg-card p-3 text-sm" data-testid="setup-in-progress">
			Your workout ({inProgressName}) is still going. Change your bodyweight here if needed, then continue.
		</p>
	{/if}
	{#if workoutRunes.editingWorkoutId === null && activeBlock === undefined}
		<p class="mb-1 px-1 text-sm text-muted-foreground">No active block: you'll pick exercises as you go.</p>
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
		<Label for="user-bodyweight">Bodyweight ({unitLabel(homeWeightUnit)})</Label>
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
	{#if useActiveMesocycle && activeBlock && workoutRunes.editingWorkoutId === null && deloadWeek}
		<Card.Root class="mb-1">
			<Card.Header>
				<Card.Title>Deload week</Card.Title>
				<Card.Description>
					Same weights as last time with half the sets, stopping well short of failure. This week doesn't count as the
					baseline for your next workouts.
				</Card.Description>
			</Card.Header>
		</Card.Root>
	{:else if useActiveMesocycle && activeBlock && workoutRunes.editingWorkoutId === null && welcomeBack}
		<div class="mb-1 flex items-center justify-between gap-4 rounded-lg border bg-card p-4">
			<div class="flex flex-col gap-1">
				<Label for="take-it-easy">Welcome back: take it easy today</Label>
				<p class="text-sm text-muted-foreground">
					It's been {welcomeBack.daysSinceLastWorkout} days. Suggestions repeat your last numbers with 1 extra rep in reserve.
				</p>
			</div>
			<Switch id="take-it-easy" name="take-it-easy" bind:checked={takeItEasy} />
		</div>
	{/if}
	{#if activeBlock && workoutRunes.editingWorkoutId === null}
		<div class="mb-1 flex items-baseline justify-between px-1">
			<span class="font-semibold">Pick a routine</span>
			<span class="text-sm text-muted-foreground">
				Week {Math.min(activeBlock.weekNumber, activeBlock.totalWeeks)} of {activeBlock.totalWeeks} · {formatWeekEffort(
					activeBlock.mesocycle.weeklyRIR,
					activeBlock.weekNumber
				)}
			</span>
		</div>
		{#if activeBlock.routines.length === 0}
			<p class="mb-1 px-1 text-sm text-muted-foreground">
				No routines yet: create them in <a class="underline" href="/exercise-splits">My routines</a>, or do a blank
				workout.
			</p>
		{/if}
		<div class="mb-1 flex flex-col gap-1" role="radiogroup" aria-label="Routine">
			{#each activeBlock.routines as routine (routine.splitDayIndex)}
				{@const selected = useActiveMesocycle && routine.splitDayIndex === selectedRoutineIndex}
				<button
					class={cn('flex flex-col gap-2 rounded-lg border bg-card p-4 text-left transition-colors', {
						'border-primary ring-1 ring-primary': selected
					})}
					aria-checked={selected}
					onclick={() => {
						selectedRoutineIndex = routine.splitDayIndex;
						useActiveMesocycle = true;
					}}
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
			<button
				class={cn('flex flex-col gap-1 rounded-lg border border-dashed bg-card p-4 text-left transition-colors', {
					'border-solid border-primary ring-1 ring-primary': !useActiveMesocycle
				})}
				aria-checked={!useActiveMesocycle}
				onclick={() => {
					useActiveMesocycle = false;
					selectedRoutineIndex = null;
				}}
				role="radio"
				type="button"
			>
				<span class="font-semibold">Blank workout</span>
				<span class="text-sm text-muted-foreground">Pick exercises as you go, e.g. with a trainer</span>
			</button>
		</div>
	{/if}
	{#if workoutRunes.editingWorkoutId === null && (!useActiveMesocycle || selectedRoutine?.weightUnit === 'ASK')}
		<div class="mb-1 flex items-center justify-between gap-4 rounded-lg border bg-card p-4">
			<span class="text-sm font-medium" id="session-unit-label">This gym uses</span>
			<ToggleGroup.Root
				aria-labelledby="session-unit-label"
				onValueChange={(value) => {
					if (value === 'KG' || value === 'LB') sessionWeightUnit = value;
				}}
				type="single"
				value={sessionWeightUnit}
				variant="outline"
			>
				<ToggleGroup.Item aria-label="Kilograms" value="KG">kg</ToggleGroup.Item>
				<ToggleGroup.Item aria-label="Pounds" value="LB">lb</ToggleGroup.Item>
			</ToggleGroup.Root>
		</div>
		{#if sessionWeightSetOptions.length > 0}
			<div class="mb-1 flex items-center justify-between gap-4 rounded-lg border bg-card p-4">
				<span class="text-sm font-medium">Weights here</span>
				{#key sessionWeightUnit}
					<Select.Root
						onSelectedChange={(v) => (sessionWeightSetId = v?.value || null)}
						selected={sessionWeightSet
							? { value: sessionWeightSet.id, label: sessionWeightSet.name }
							: { value: '', label: 'Standard steps' }}
					>
						<Select.Trigger aria-label="Weights here" class="w-48">
							<Select.Value placeholder="Standard steps" />
						</Select.Trigger>
						<Select.Content>
							<Select.Item label="Standard steps" value="" />
							{#each sessionWeightSetOptions as weightSet (weightSet.id)}
								<Select.Item label={weightSet.name} value={weightSet.id} />
							{/each}
						</Select.Content>
					</Select.Root>
				{/key}
			</div>
		{/if}
	{/if}
	<Button class="mt-auto" type="submit" form="user-bodyweight-form" disabled={!canStart || $navigating !== null}>
		{#if $navigating}
			<LoaderCircle class="animate-spin" />
		{:else if useActiveMesocycle && selectedRoutine === undefined && workoutRunes.editingWorkoutId === null}
			Pick a routine
		{:else if inProgress && sameAsInProgress}
			Continue workout
		{:else}
			Next
		{/if}
	</Button>
{/if}

<ResponsiveDialog title="Switch to {switchToName}?" bind:open={switchRoutineDialogOpen}>
	{#snippet description()}
		The sets you've entered for {inProgressName} will be cleared.
	{/snippet}
	<div class="grid grid-cols-2 gap-1.5">
		<Button onclick={() => (switchRoutineDialogOpen = false)} variant="secondary">Keep {inProgressName}</Button>
		<Button onclick={() => startWorkout(true, 'overwrite')} variant="destructive">Switch</Button>
	</div>
</ResponsiveDialog>
