<script lang="ts">
	import { beforeNavigate, goto, invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import AddEditExerciseDrawer from '$lib/components/mesocycleAndExerciseSplit/AddEditExerciseDrawer.svelte';
	import DndComponent from '$lib/components/mesocycleAndExerciseSplit/DndComponent.svelte';
	import ResponsiveDialog from '$lib/components/ResponsiveDialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import H2 from '$lib/components/ui/typography/H2.svelte';
	import type { RoutineWeightUnit } from '$lib/utils/prismaEnums';
	import { TRPCClientError } from '@trpc/client';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import PasteIcon from 'virtual:icons/lucide/clipboard-paste';
	import CopyIcon from 'virtual:icons/lucide/copy';
	import ReorderIcon from 'virtual:icons/lucide/git-compare-arrows';
	import LoaderCircle from 'virtual:icons/lucide/loader-circle';
	import MenuIcon from 'virtual:icons/lucide/menu';
	import EditIcon from 'virtual:icons/lucide/pencil';
	import { fetchMyRoutines, routineFingerprint, saveMyRoutines, type MyRoutine } from '../myRoutines';
	import { routineEditor } from './routineEditor.svelte';

	const unitOptions: { value: RoutineWeightUnit; label: string }[] = [
		{ value: 'KG', label: 'KG' },
		{ value: 'LB', label: 'LB' },
		{ value: 'ASK', label: 'Ask each time' }
	];

	// ?routine=<name> edits that routine; ?new starts one
	let routineParam = $derived($page.url.searchParams.get('routine'));
	let isNew = $derived(routineParam === null);
	let ready = $state(false);
	let reordering = $state(false);
	let saving = $state(false);

	onMount(async () => {
		const originalName = $page.url.searchParams.get('routine');
		// Back after a reload: the unsaved edits are still here
		if (routineEditor.isOpenFor(originalName)) {
			ready = true;
			return;
		}
		if (originalName === null) {
			routineEditor.open(null);
			ready = true;
			return;
		}
		try {
			const routine = (await fetchMyRoutines()).find((routine) => routine.name === originalName);
			if (!routine) {
				toast.error(`“${originalName}” isn't in My routines any more`);
				await goto('/exercise-splits');
				return;
			}
			routineEditor.open(routine);
			ready = true;
		} catch {
			toast.error("Couldn't load the routine, try again");
			await goto('/exercise-splits');
		}
	});

	// Someone else changed or deleted this routine while it was open here
	let conflict: 'changed' | 'gone' | null = $state(null);
	let conflictOpen = $state(false);
	// Where to go once saved (the place someone was leaving for), else My routines
	let afterSave: URL | string = '/exercise-splits';

	/** Problems that stop a save (`others`: the rest of My routines), else null */
	function invalid(others: MyRoutine[]): string | null {
		const name = routineEditor.name.trim();
		if (!name) return 'Give the routine a name';
		if (others.some((routine) => routine.name === name)) {
			return `You already have a routine called “${name}”`;
		}
		if (routineEditor.exercises.length === 0) return 'Add at least one exercise';
		return null;
	}

	/**
	 * Saves just this routine into My routines as they are now on the server. `force`: after the
	 * question, overwrite someone else's changes, or save a routine deleted elsewhere as a new one
	 */
	async function save(force = false) {
		if (saving || !routineEditor.editing) return;
		saving = true;
		try {
			const originalName = routineEditor.editing.originalName;
			const routines = await fetchMyRoutines();
			const idx = originalName === null ? -1 : routines.findIndex((routine) => routine.name === originalName);
			if (!force && originalName !== null) {
				if (idx === -1) {
					askAboutConflict('gone');
					return;
				}
				if (routineFingerprint(routines[idx]) !== routineEditor.opened) {
					askAboutConflict('changed');
					return;
				}
			}
			const others = idx === -1 ? routines : routines.filter((_, i) => i !== idx);
			const problem = invalid(others);
			if (problem) {
				toast.error(problem);
				return;
			}
			const edited: MyRoutine = {
				name: routineEditor.name.trim(),
				weightUnit: routineEditor.weightUnit,
				exercises: $state.snapshot(routineEditor.exercises),
				// Renamed: the current block keeps it in its place
				previousName: idx === -1 ? undefined : originalName!
			};
			const next = idx === -1 ? [...routines, edited] : routines.map((routine, i) => (i === idx ? edited : routine));
			const message = await saveMyRoutines(next);
			toast.success(message);
			routineEditor.close();
			await invalidate('exerciseSplits:all');
			await goto(afterSave);
		} catch (error) {
			// Nothing is lost: the edits stay here to try again
			toast.error(error instanceof TRPCClientError ? error.message : "Couldn't save the routine, try again");
		} finally {
			saving = false;
		}
	}

	function askAboutConflict(kind: 'changed' | 'gone') {
		conflict = kind;
		conflictOpen = true;
	}

	async function resolveConflict() {
		conflictOpen = false;
		await save(true);
	}

	// Leaving with unsaved changes asks first; unchanged, it just ends
	let leaveOpen = $state(false);
	let leavingTo: URL | null = null;
	beforeNavigate((navigation) => {
		if (!routineEditor.editing || navigation.to === null || navigation.type === 'leave') return;
		if (navigation.to.url.pathname === '/exercise-splits/edit') return;
		// Off to set up a weight set: the edits wait here on this device, and its page links back
		if (navigation.to.url.pathname === '/exercise-splits/weight-sets') return;
		if (!routineEditor.hasUnsavedChanges()) {
			routineEditor.close();
			return;
		}
		navigation.cancel();
		leavingTo = navigation.to.url;
		leaveOpen = true;
	});

	async function saveAndLeave() {
		leaveOpen = false;
		if (leavingTo) afterSave = leavingTo;
		await save();
	}

	async function discardAndLeave() {
		leaveOpen = false;
		routineEditor.close();
		toast.success('Changes discarded');
		if (leavingTo) await goto(leavingTo);
	}
</script>

<H2>{isNew ? 'New routine' : 'Edit routine'}</H2>

{#if !ready}
	<div class="flex grow items-center justify-center text-muted-foreground">
		<LoaderCircle class="animate-spin" />
	</div>
{:else}
	<div class="flex items-end gap-2">
		<div class="flex grow flex-col gap-1">
			<Label for="routine-name">Name</Label>
			<Input id="routine-name" autofocus={isNew} placeholder="e.g. Hotel gym – Legs" bind:value={routineEditor.name} />
		</div>
		<div class="flex flex-col gap-1">
			<Label for="routine-unit">Unit</Label>
			<Select.Root
				onSelectedChange={(selected) => {
					if (selected) routineEditor.weightUnit = selected.value;
				}}
				selected={unitOptions.find((option) => option.value === routineEditor.weightUnit)}
			>
				<Select.Trigger id="routine-unit" class="w-36" aria-label="Routine unit">
					<Select.Value />
				</Select.Trigger>
				<Select.Content>
					{#each unitOptions as option}
						<Select.Item value={option.value}>{option.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
	</div>

	<div class="mt-4 flex items-center gap-2">
		<span class="mr-auto font-semibold" data-testid="routine-exercise-count">
			{routineEditor.exercises.length}
			{routineEditor.exercises.length === 1 ? 'exercise' : 'exercises'}
		</span>
		<AddEditExerciseDrawer
			addExercise={routineEditor.addExercise}
			context="exerciseSplit"
			editExercise={routineEditor.editExercise}
			editingExercise={routineEditor.editingExercise}
			setEditingExercise={routineEditor.setEditingExercise}
		/>
		<Button
			aria-label={reordering ? 'Done reordering' : 'Reorder exercises'}
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
		<DropdownMenu.Root>
			<DropdownMenu.Trigger asChild let:builder>
				<Button aria-label="routine-exercise-functions" builders={[builder]} size="icon" variant="outline">
					<MenuIcon />
				</Button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content>
				<DropdownMenu.Group>
					<DropdownMenu.Item
						class="gap-2"
						disabled={routineEditor.exercises.length === 0}
						onclick={routineEditor.copyExercises}
					>
						<CopyIcon /> Copy exercises
					</DropdownMenu.Item>
					<DropdownMenu.Item
						class="gap-2"
						disabled={routineEditor.copiedExercises === undefined || routineEditor.exercises.length > 0}
						onclick={routineEditor.pasteExercises}
					>
						<PasteIcon /> Paste exercises
					</DropdownMenu.Item>
				</DropdownMenu.Group>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
	<div class="mt-2 flex h-px grow flex-col overflow-y-auto">
		<DndComponent
			context="exerciseSplit"
			deleteExercise={routineEditor.deleteExercise}
			{reordering}
			setEditingExercise={routineEditor.setEditingExercise}
			bind:itemList={routineEditor.exercises}
		/>
	</div>

	<p class="mt-2 text-sm text-muted-foreground" data-testid="block-follows-routines">
		Your current block uses this routine as soon as you save.
	</p>
	<div class="mt-2 grid grid-cols-2 gap-1">
		<Button href="/exercise-splits" variant="secondary">Cancel</Button>
		<Button disabled={saving} onclick={() => save()}>
			{#if saving}
				<LoaderCircle class="animate-spin" />
			{:else}
				Save
			{/if}
		</Button>
	</div>
{/if}

<ResponsiveDialog
	title={conflict === 'gone' ? 'This routine is gone' : 'Changed on another device'}
	bind:open={conflictOpen}
>
	{#snippet description()}
		{#if conflict === 'gone'}
			“{routineEditor.editing?.originalName}” was deleted or renamed on another device since you opened it.
		{:else}
			This routine was changed on another device since you opened it.
		{/if}
	{/snippet}
	<Button disabled={saving} onclick={resolveConflict}>
		{conflict === 'gone' ? 'Save as a new routine' : 'Overwrite with mine'}
	</Button>
</ResponsiveDialog>

<ResponsiveDialog cancelLabel="Keep editing" title="Save your changes?" bind:open={leaveOpen}>
	{#snippet description()}
		You changed this routine. Save the changes, or discard them?
	{/snippet}
	<Button disabled={saving} onclick={saveAndLeave}>Save changes</Button>
	<Button disabled={saving} onclick={discardAndLeave} variant="destructive">Discard changes</Button>
</ResponsiveDialog>
