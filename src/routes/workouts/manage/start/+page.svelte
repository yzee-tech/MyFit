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
	import { workoutMinutes } from '$lib/utils/workoutLength';
	import * as Select from '$lib/components/ui/select';

	type TodaysWorkoutData = RouterOutputs['workouts']['getTodaysWorkoutData'];
	type RoutineOption = NonNullable<TodaysWorkoutData['activeBlock']>['routines'][number];

	let { data } = $props();

	const pad = (value: number) => String(value).padStart(2, '0');

	// A past workout's time, edited as a date, a start time and a length; it's still kept as a start and end
	let timeFields = $derived.by(() => {
		const startedAt = new Date(workoutRunes.workoutData?.startedAt ?? Date.now());
		const endedAt = new Date(workoutRunes.workoutData?.endedAt ?? startedAt);
		return {
			date: `${startedAt.getFullYear()}-${pad(startedAt.getMonth() + 1)}-${pad(startedAt.getDate())}`,
			time: `${pad(startedAt.getHours())}:${pad(startedAt.getMinutes())}`,
			minutes: workoutMinutes(startedAt, endedAt),
			endsAt: endedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
			inFuture: startedAt.getTime() > Date.now()
		};
	});

	function setWorkoutTime(change: { date?: string; time?: string; minutes?: number }) {
		if (!workoutRunes.workoutData) return;
		const date = change.date ?? timeFields.date;
		const time = change.time ?? timeFields.time;
		const minutes = change.minutes ?? timeFields.minutes;
		const startedAt = new Date(`${date}T${time}`);
		// A cleared or half-typed box keeps what was there
		if (Number.isNaN(startedAt.getTime()) || !Number.isFinite(minutes)) return;
		// 0 is fine: a workout saved straight after it started
		const length = Math.min(Math.max(Math.round(minutes), 0), 600);
		workoutRunes.workoutData.startedAt = startedAt;
		workoutRunes.workoutData.endedAt = new Date(startedAt.getTime() + length * 60000);
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

	// A routine (the active block's, or with no block one of My routines) rather than a blank workout
	let useRoutine = $state(false);
	let workoutData = $state<TodaysWorkoutData | 'loading'>('loading');
	let selectedRoutineName: string | null = $state(null);
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
	let inProgressRoutineName = $derived(
		workoutRunes.workoutData?.routineName ?? workoutRunes.workoutData?.workoutOfMesocycle?.splitDayName ?? null
	);
	let inProgressName = $derived(inProgressRoutineName ?? 'the blank workout');
	let finishingBlock = $state(false);
	let takeItEasy = $state(true);

	let activeBlock = $derived(workoutData === 'loading' ? undefined : workoutData.activeBlock);
	// The block's routines, else (no block) My routines
	let routines: RoutineOption[] = $derived(
		workoutData === 'loading' ? [] : (workoutData.activeBlock?.routines ?? workoutData.myRoutines ?? [])
	);
	let selectedRoutine = $derived(routines.find((routine) => routine.name === selectedRoutineName));
	let sameAsInProgress = $derived((useRoutine ? selectedRoutineName : null) === inProgressRoutineName);
	let switchToName = $derived(useRoutine && selectedRoutine ? selectedRoutine.name : 'a blank workout');
	let deloadWeek = $derived(
		activeBlock ? isDeloadWeek(activeBlock.mesocycle.weeklyRIR, activeBlock.weekNumber) : false
	);
	let welcomeBack = $derived(workoutData === 'loading' ? undefined : workoutData.welcomeBack);
	let canStart = $derived(userBodyweight !== null && (!useRoutine || selectedRoutine !== undefined));

	$effect(() => {
		data.workoutData.then((data) => {
			if (workoutRunes.editingWorkoutId === null) workoutData = data;
			else workoutData = workoutRunes.workoutData as TodaysWorkoutData;

			userBodyweight = userBodyweight ?? toHomeUnit(workoutData.userBodyweight);
			const options = workoutData.activeBlock?.routines ?? workoutData.myRoutines ?? [];
			if (workoutData.activeBlock !== undefined || options.length > 0) useRoutine = true;
			// Back from a workout in progress: it stays picked
			if (inProgress) {
				useRoutine = options.some((routine) => routine.name === inProgressRoutineName);
				selectedRoutineName = useRoutine ? inProgressRoutineName : null;
			}
		});
	});

	function buildWorkoutData(): TodaysWorkoutData | null {
		if (workoutData === 'loading') return null;
		const { activeBlock, myRoutines, ...rest } = workoutData;
		if (!useRoutine || !selectedRoutine) {
			return { ...rest, workoutExercises: [], workoutOfMesocycle: undefined, routineName: null };
		}
		// No block: a routine of My routines, and the workout isn't part of any block
		if (!activeBlock || selectedRoutine.splitDayIndex === undefined) {
			return {
				...rest,
				workoutExercises: selectedRoutine.workoutExercises,
				workoutOfMesocycle: undefined,
				routineName: selectedRoutine.name
			};
		}
		return {
			...rest,
			workoutExercises: selectedRoutine.workoutExercises,
			routineName: selectedRoutine.name,
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
		const askForUnit = useRoutine && selectedRoutine?.weightUnit === 'ASK';
		newWorkoutData.sessionWeightUnit = askForUnit || !useRoutine ? sessionWeightUnit : undefined;
		newWorkoutData.sessionWeightSetId = askForUnit || !useRoutine ? sessionWeightSet?.id : undefined;

		if (mode === 'overwrite') {
			// A new workout starts now. Resuming one (keepCurrent) never moves its start
			newWorkoutData.startedAt = new Date();
			workoutRunes.workoutData = newWorkoutData;
			workoutRunes.workoutExercises = null;
			workoutRunes.previousWorkoutData = null;
			workoutRunes.lastActivityAt = null;
		} else if (workoutRunes.workoutData === null) workoutRunes.workoutData = newWorkoutData;
		workoutRunes.saveStoresToLocalStorage();

		const { workoutOfMesocycle, routineName } = workoutRunes.workoutData;
		const fromRoutine = workoutOfMesocycle !== undefined || Boolean(routineName);
		let exercisesLink = `./exercises?userBodyweight=${userBodyweightKg}`;
		if (workoutOfMesocycle) exercisesLink += `&useActiveMesocycle&splitDayIndex=${workoutOfMesocycle.splitDayIndex}`;
		else if (routineName) exercisesLink += `&routine=${encodeURIComponent(routineName)}`;
		if (mode === 'keepCurrent') exercisesLink += '&keepCurrent';
		if (fromRoutine && welcomeBack && takeItEasy && !deloadWeek) exercisesLink += '&welcomeBack';
		if (fromRoutine && workoutRunes.workoutData.sessionWeightUnit) {
			exercisesLink += `&sessionUnit=${workoutRunes.workoutData.sessionWeightUnit}`;
		}
		if (fromRoutine && workoutRunes.workoutData.sessionWeightSetId) {
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
	{#if workoutRunes.editingWorkoutId === null && activeBlock === undefined && routines.length === 0}
		<p class="mb-1 px-1 text-sm text-muted-foreground">
			No routines yet: you'll pick exercises as you go. Create routines in <a class="underline" href="/exercise-splits"
				>My routines</a
			>.
		</p>
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
			<div class="grid grid-cols-[1fr_auto_auto] items-end gap-x-2 gap-y-1.5">
				<Label for="workout-date">Date</Label>
				<Label for="workout-start-time">Start time</Label>
				<Label for="workout-length-minutes">Length (min)</Label>
				<Input
					id="workout-date"
					onchange={(e) => setWorkoutTime({ date: e.currentTarget.value })}
					required
					type="date"
					value={timeFields.date}
				/>
				<Input
					id="workout-start-time"
					class="w-28"
					onchange={(e) => setWorkoutTime({ time: e.currentTarget.value })}
					required
					type="time"
					value={timeFields.time}
				/>
				<Input
					id="workout-length-minutes"
					class="w-24"
					max={600}
					min={0}
					onchange={(e) => setWorkoutTime({ minutes: e.currentTarget.valueAsNumber })}
					required
					step={1}
					type="number"
					value={timeFields.minutes}
				/>
			</div>
			<p class="text-sm text-muted-foreground" data-testid="workout-ends-at">
				Ends {timeFields.endsAt}
			</p>
			{#if timeFields.inFuture}
				<p class="text-sm text-destructive" data-testid="workout-in-future">This is in the future</p>
			{/if}
		{/if}
	</form>
	{#if useRoutine && activeBlock && workoutRunes.editingWorkoutId === null && deloadWeek}
		<Card.Root class="mb-1">
			<Card.Header>
				<Card.Title>Deload week</Card.Title>
				<Card.Description>
					Same weights as last time with half the sets, stopping well short of failure. This week doesn't count as the
					baseline for your next workouts.
				</Card.Description>
			</Card.Header>
		</Card.Root>
	{:else if useRoutine && (activeBlock || routines.length > 0) && workoutRunes.editingWorkoutId === null && welcomeBack}
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
	{#if (activeBlock || routines.length > 0) && workoutRunes.editingWorkoutId === null}
		<div class="mb-1 flex items-baseline justify-between px-1">
			<span class="font-semibold">Pick a routine</span>
			{#if activeBlock}
				<span class="text-sm text-muted-foreground">
					Week {Math.min(activeBlock.weekNumber, activeBlock.totalWeeks)} of {activeBlock.totalWeeks} · {formatWeekEffort(
						activeBlock.mesocycle.weeklyRIR,
						activeBlock.weekNumber
					)}
				</span>
			{/if}
		</div>
		{#if routines.length === 0}
			<p class="mb-1 px-1 text-sm text-muted-foreground">
				No routines yet: create them in <a class="underline" href="/exercise-splits">My routines</a>, or do a blank
				workout.
			</p>
		{/if}
		<div class="mb-1 flex flex-col gap-1" role="radiogroup" aria-label="Routine">
			{#each routines as routine (routine.name)}
				{@const selected = useRoutine && routine.name === selectedRoutineName}
				<button
					class={cn('flex flex-col gap-2 rounded-lg border bg-card p-4 text-left transition-colors', {
						'border-primary ring-1 ring-primary': selected
					})}
					aria-checked={selected}
					onclick={() => {
						selectedRoutineName = routine.name;
						useRoutine = true;
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
					'border-solid border-primary ring-1 ring-primary': !useRoutine
				})}
				aria-checked={!useRoutine}
				onclick={() => {
					useRoutine = false;
					selectedRoutineName = null;
				}}
				role="radio"
				type="button"
			>
				<span class="font-semibold">Blank workout</span>
				<span class="text-sm text-muted-foreground">Pick exercises as you go, e.g. with a trainer</span>
			</button>
		</div>
	{/if}
	{#if workoutRunes.editingWorkoutId === null && (!useRoutine || selectedRoutine?.weightUnit === 'ASK')}
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
		{:else if useRoutine && selectedRoutine === undefined && workoutRunes.editingWorkoutId === null}
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
	<Button onclick={() => startWorkout(true, 'overwrite')} variant="destructive">Switch</Button>
</ResponsiveDialog>
