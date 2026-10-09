<script lang="ts">
	import { setTypeLabel } from '$lib/utils/setTypes';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import ExerciseForm, { type ExerciseFormDetails } from '$lib/components/exercises/ExerciseForm.svelte';
	import ResponsiveDialog from '$lib/components/ResponsiveDialog.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { trpc } from '$lib/trpc/client';
	import type { RouterOutputs } from '$lib/trpc/router';
	import { convertCamelCaseToNormal } from '$lib/utils';
	import { TRPCClientError } from '@trpc/client';
	import { toast } from 'svelte-sonner';
	import MenuIcon from 'virtual:icons/lucide/menu';

	type ExerciseData = RouterOutputs['exercises']['get'];
	type RoutineTargets = RouterOutputs['exercises']['routineTargets'];

	let data = $state<ExerciseData | 'loading'>('loading');
	let allExercises: RouterOutputs['exercises']['list'] = $state([]);
	let routineTargets: RoutineTargets | null = $state(null);

	let editOpen = $state(false);
	let addOpen = $state(false);
	let removeOpen = $state(false);
	let mergeOpen = $state(false);
	let deleteOpen = $state(false);
	let busy = $state(false);

	let routinesToAdd: string[] = $state([]);
	let entriesToRemove: string[] = $state([]);
	let mergeIntoId: string | undefined = $state();

	async function load() {
		const id = $page.params.exerciseId!;
		[data, allExercises] = await Promise.all([trpc().exercises.get.query(id), trpc().exercises.list.query()]);
	}

	$effect(() => {
		void $page.params.exerciseId;
		load().catch(() => toast.error('Exercise not found'));
	});

	function toggle(list: string[], id: string, checked: boolean) {
		return checked ? [...list, id] : list.filter((item) => item !== id);
	}

	async function run<T>(action: () => Promise<T>, success: (result: T) => string) {
		busy = true;
		try {
			const result = await action();
			toast.success(success(result));
			return true;
		} catch (error) {
			toast.error(error instanceof TRPCClientError ? error.message : 'Something went wrong');
			return false;
		} finally {
			busy = false;
		}
	}

	async function saveDetails(details: ExerciseFormDetails) {
		if (data === 'loading') return;
		const id = data.exercise.id;
		if (
			await run(
				() => trpc().exercises.update.mutate({ id, details }),
				() => 'Exercise saved everywhere'
			)
		) {
			editOpen = false;
			// Its levels (or none now) for the workout screen and routine editors
			await invalidate('settings:userSettings');
			await load();
		}
	}

	async function openAdd() {
		routinesToAdd = [];
		routineTargets = await trpc().exercises.routineTargets.query();
		addOpen = true;
	}

	async function addToRoutines() {
		if (data === 'loading') return;
		const exerciseId = data.exercise.id;
		const done = await run(
			() => trpc().exercises.addToRoutines.mutate({ exerciseId, routineIds: routinesToAdd }),
			({ added }) => `Added to ${added} ${added === 1 ? 'routine' : 'routines'}`
		);
		if (done) {
			addOpen = false;
			await load();
		}
	}

	async function removeFromRoutines() {
		if (data === 'loading') return;
		const exerciseId = data.exercise.id;
		const done = await run(
			() => trpc().exercises.removeFromRoutines.mutate({ exerciseId, entryIds: entriesToRemove }),
			({ removed }) => `Removed from ${removed} ${removed === 1 ? 'routine' : 'routines'}`
		);
		if (done) {
			removeOpen = false;
			await load();
		}
	}

	async function merge() {
		if (data === 'loading' || !mergeIntoId) return;
		const [fromId, intoId] = [data.exercise.id, mergeIntoId];
		if (
			await run(
				() => trpc().exercises.merge.mutate({ fromId, intoId }),
				({ message }) => message
			)
		) {
			mergeOpen = false;
			await goto(`/exercises/${intoId}`);
		}
	}

	async function deleteExercise() {
		if (data === 'loading') return;
		const id = data.exercise.id;
		const done = await run(
			() => trpc().exercises.delete.mutate(id),
			({ archived }) => (archived ? 'Removed from routines; kept for your past workouts' : 'Exercise deleted')
		);
		if (done) {
			deleteOpen = false;
			await goto('/exercises');
		}
	}

	const setsText = (entry: { setType: string; repRangeStart: number; repRangeEnd: number; sets?: number }) =>
		`${entry.sets !== undefined ? `${entry.sets} × ` : ''}${setTypeLabel(entry.setType)} sets of ${entry.repRangeStart}–${entry.repRangeEnd} reps`;
</script>

<!-- Reps only: the cap wins over a routine's range, so say when the range starts above it -->
{#snippet maxBelowRange(entry: { repRangeStart: number; repRangeEnd: number })}
	{#if data !== 'loading' && data.exercise.repsOnly && data.exercise.maxReps && data.exercise.maxReps < entry.repRangeStart}
		<span class="text-xs text-amber-600 dark:text-amber-400" data-testid="max-below-range">
			Max reps ({data.exercise.maxReps}) is below this routine's range ({entry.repRangeStart}–{entry.repRangeEnd})
		</span>
	{/if}
{/snippet}

{#if data === 'loading'}
	<Skeleton class="mb-4 h-10 w-48" />
	<Skeleton class="h-40 w-full" />
{:else}
	{@const { exercise } = data}
	<div class="mb-4 flex items-end justify-between gap-2 border-b pb-2">
		<div class="flex min-w-0 flex-col">
			<h2 class="truncate text-3xl font-semibold tracking-tight">{exercise.name}</h2>
			<span class="text-sm text-muted-foreground">Exercise</span>
		</div>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger aria-label="exercise-options" class="mb-1 shrink-0">
				<MenuIcon />
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end">
				<DropdownMenu.Group>
					<DropdownMenu.Item onclick={() => (editOpen = true)}>Edit</DropdownMenu.Item>
					<DropdownMenu.Item onclick={() => ((mergeIntoId = undefined), (mergeOpen = true))}>
						Merge into…
					</DropdownMenu.Item>
					<DropdownMenu.Item class="text-red-500" onclick={() => (deleteOpen = true)}>Delete</DropdownMenu.Item>
				</DropdownMenu.Group>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>

	<div class="flex flex-col gap-4 overflow-y-auto pb-4">
		{#if exercise.archived}
			<div class="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
				Deleted: kept for your past workouts. Add it to a routine to bring it back.
			</div>
		{/if}

		<section class="flex flex-col gap-2">
			<div class="flex flex-wrap gap-1">
				<Badge variant="secondary">
					{exercise.customMuscleGroup ?? convertCamelCaseToNormal(exercise.targetMuscleGroup)}
				</Badge>
				{#if exercise.bodyweightFraction !== null}
					<Badge variant="outline">{Math.round(exercise.bodyweightFraction * 100)}% of bodyweight</Badge>
				{/if}
				{#if exercise.repsOnly}
					<Badge variant="outline">Reps only{exercise.maxReps ? `, max ${exercise.maxReps}` : ''}</Badge>
				{/if}
				{#if exercise.levelsFrom !== null && exercise.levelsTo !== null}
					<Badge variant="outline">
						Levels {exercise.levelsFrom}–{exercise.levelsTo}{exercise.levelStep === 0.5 ? ' by ½' : ''}
					</Badge>
				{/if}
			</div>
			{#if exercise.note}
				<p class="rounded-md bg-secondary px-2 py-1 text-sm">{exercise.note}</p>
			{/if}
		</section>

		<section class="flex flex-col gap-1">
			<h3 class="font-semibold">Used in</h3>
			{#if data.routineEntries.length === 0}
				<p class="text-sm text-muted-foreground">Not in a routine yet</p>
			{/if}
			{#each data.routineEntries as entry (entry.id)}
				<a class="flex flex-col rounded-md border p-2 hover:bg-accent" href="/exercise-splits">
					<span class="text-sm font-medium">My routines › {entry.routineName}</span>
					<span class="text-xs text-muted-foreground">{setsText(entry)}</span>
					{@render maxBelowRange(entry)}
				</a>
			{/each}
			<div class="mt-1 grid grid-cols-2 gap-1">
				<Button onclick={openAdd} size="sm" variant="secondary">Add to routine</Button>
				<Button
					disabled={data.routineEntries.length === 0}
					onclick={() => ((entriesToRemove = []), (removeOpen = true))}
					size="sm"
					variant="outline"
				>
					Remove from routines
				</Button>
			</div>
		</section>

		<section class="flex flex-col gap-1">
			<h3 class="font-semibold">History</h3>
			{#if data.workoutCount === 0}
				<p class="text-sm text-muted-foreground">Not done yet</p>
			{:else}
				<p class="text-sm">
					{data.workoutCount}
					{data.workoutCount === 1 ? 'workout' : 'workouts'}{#if data.lastDoneAt}, last on {new Date(
							data.lastDoneAt
						).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}{/if}
				</p>
				<a class="text-sm underline" href="/stats?exercise={encodeURIComponent(exercise.name)}">
					See its charts and past sets
				</a>
			{/if}
		</section>
	</div>

	<ResponsiveDialog title="Edit exercise" bind:open={editOpen}>
		{#snippet description()}
			Changes apply everywhere it's used, including past workouts.
		{/snippet}
		{#if editOpen}
			<ExerciseForm initial={exercise} onSubmit={saveDetails} pastWorkoutCount={data.workoutCount} submitLabel="Save" />
		{/if}
	</ResponsiveDialog>

	<ResponsiveDialog title="Add to routine" bind:open={addOpen}>
		{#snippet description()}
			Sets and reps start from where you last used it; change them in the routine.
		{/snippet}
		{#if routineTargets}
			<div class="flex max-h-80 flex-col gap-1 overflow-y-auto">
				{#each routineTargets as routine (routine.id)}
					{@const already = routine.exerciseIds.includes(exercise.id)}
					<div class="flex items-center gap-2">
						<Checkbox
							id="add-routine-{routine.id}"
							aria-label="My routines {routine.name}"
							checked={already || routinesToAdd.includes(routine.id)}
							disabled={already}
							onCheckedChange={(c) => (routinesToAdd = toggle(routinesToAdd, routine.id, c === true))}
						/>
						<Label for="add-routine-{routine.id}">{routine.name}{already ? ' (already in it)' : ''}</Label>
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">No routines yet: create them in My routines first.</p>
				{/each}
			</div>
			<Button class="mt-2" disabled={busy || routinesToAdd.length === 0} onclick={addToRoutines}>Add</Button>
		{/if}
	</ResponsiveDialog>

	<ResponsiveDialog title="Remove from routines" bind:open={removeOpen}>
		{#snippet description()}
			Your past workouts keep it.
		{/snippet}
		<div class="flex max-h-80 flex-col gap-1 overflow-y-auto">
			{#each data.routineEntries as entry (entry.id)}
				<div class="flex items-center gap-2">
					<Checkbox
						id="remove-routine-{entry.id}"
						aria-label="Remove from My routines {entry.routineName}"
						checked={entriesToRemove.includes(entry.id)}
						onCheckedChange={(c) => (entriesToRemove = toggle(entriesToRemove, entry.id, c === true))}
					/>
					<Label for="remove-routine-{entry.id}">My routines › {entry.routineName}</Label>
				</div>
			{/each}
		</div>
		<Button
			class="mt-2"
			disabled={busy || entriesToRemove.length === 0}
			onclick={removeFromRoutines}
			variant="destructive"
		>
			Remove
		</Button>
	</ResponsiveDialog>

	<ResponsiveDialog title="Merge into…" bind:open={mergeOpen}>
		{#snippet description()}
			For a duplicate, e.g. a misspelling: its workouts and routines move to the exercise you pick, and
			<span class="font-semibold">{exercise.name}</span> is removed. A workout with both gets one entry with all their sets.
		{/snippet}
		{@const others = allExercises.filter((other) => other.id !== exercise.id)}
		<Select.Root
			onSelectedChange={(v) => (mergeIntoId = v?.value)}
			selected={mergeIntoId
				? { value: mergeIntoId, label: others.find((other) => other.id === mergeIntoId)?.name }
				: undefined}
		>
			<Select.Trigger aria-label="Exercise to merge into">
				<Select.Value placeholder="Pick an exercise" />
			</Select.Trigger>
			<Select.Content class="max-h-60 overflow-y-auto">
				{#each others as other (other.id)}
					<Select.Item label={other.name} value={other.id} />
				{/each}
			</Select.Content>
		</Select.Root>
		<Button class="mt-2" disabled={busy || !mergeIntoId} onclick={merge}>Merge</Button>
	</ResponsiveDialog>

	<ResponsiveDialog title="Delete {exercise.name}?" bind:open={deleteOpen}>
		{#snippet description()}
			{#if data !== 'loading' && data.workoutCount > 0}
				It's removed from every routine. Your {data.workoutCount} past
				{data.workoutCount === 1 ? 'workout keeps' : 'workouts keep'} it, and its stats stay.
			{:else}
				It's removed from every routine and deleted. This can't be undone.
			{/if}
		{/snippet}
		<Button disabled={busy} onclick={deleteExercise} variant="destructive">Yes, delete</Button>
	</ResponsiveDialog>
{/if}
