<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import RoutineCard from '$lib/components/mesocycleAndExerciseSplit/RoutineCard.svelte';
	import ResponsiveDialog from '$lib/components/ResponsiveDialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { trpc } from '$lib/trpc/client';
	import type { RouterOutputs } from '$lib/trpc/router';
	import { formatRoutineCount } from '$lib/utils/mesocycleUtils';
	import { TRPCClientError } from '@trpc/client';
	import { onMount, tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import EllipsisIcon from 'virtual:icons/lucide/ellipsis-vertical';
	import FileUpIcon from 'virtual:icons/lucide/file-up';
	import MenuIcon from 'virtual:icons/lucide/menu';
	import AddIcon from 'virtual:icons/lucide/plus';
	import ExerciseSplitSkeleton from './(components)/ExerciseSplitSkeleton.svelte';
	import { fetchMyRoutines, saveMyRoutines, withDuplicate, withMoved, type MyRoutine } from './myRoutines';

	type MyRoutines = RouterOutputs['exerciseSplits']['mine'];
	type Routine = NonNullable<MyRoutines>['exerciseSplitDays'][number];
	let myRoutines = $state<MyRoutines | 'loading'>('loading');
	let routines = $derived(myRoutines === 'loading' ? [] : (myRoutines?.exerciseSplitDays ?? []));
	/** Routines showing their exercises */
	let shown: string[] = $state([]);
	let busy = $state(false);

	async function refresh() {
		myRoutines = await trpc().exerciseSplits.mine.query();
	}
	onMount(refresh);

	/**
	 * A link from a workout (?routine=name) opens that routine, scrolls it into view and focuses its
	 * title. Each target is handled once: a refresh after duplicate/move/delete does not scroll again
	 */
	let handledTarget: string | null = null;
	$effect(() => {
		const target = $page.url.searchParams.get('routine');
		if (target === null || target === handledTarget || myRoutines === 'loading') return;
		handledTarget = target;
		const routine = routines.find((other) => other.name === target);
		if (!routine) return;
		if (!shown.includes(routine.name)) shown = [...shown, routine.name];
		tick().then(() => {
			const card = document.getElementById(`routine-${routine.id}`);
			const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
			card?.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
			card?.querySelector<HTMLElement>('button[aria-expanded]')?.focus({ preventScroll: true });
		});
	});

	function editLink(name: string) {
		return `/exercise-splits/edit?routine=${encodeURIComponent(name)}`;
	}

	function toggleShown(name: string) {
		shown = shown.includes(name) ? shown.filter((other) => other !== name) : [...shown, name];
	}

	/**
	 * A change to the whole list (duplicate, move, delete), saved straight away. It starts from My
	 * routines as the server has them now, so it never undoes changes made elsewhere. One at a time:
	 * a tap while one is saving does nothing
	 */
	async function change(apply: (routines: MyRoutine[]) => MyRoutine[], message: string) {
		if (busy) return;
		busy = true;
		try {
			await saveMyRoutines(apply(await fetchMyRoutines()));
			toast.success(message);
			await refresh();
		} catch (error) {
			toast.error(error instanceof TRPCClientError ? error.message : "Couldn't save My routines, try again");
		}
		busy = false;
	}

	let deleting: Routine | null = $state(null);
	let deleteOpen = $state(false);

	function askToDelete(routine: Routine) {
		deleting = routine;
		deleteOpen = true;
	}

	async function deleteRoutine() {
		const name = deleting?.name;
		deleteOpen = false;
		if (name === undefined) return;
		shown = shown.filter((other) => other !== name);
		await change((routines) => routines.filter((routine) => routine.name !== name), `“${name}” deleted`);
	}

	function exportRoutines() {
		const exported = {
			name: 'My routines',
			exerciseSplitDays: routines.map(({ id, exerciseSplitId, exercises, ...routine }) => ({
				...routine,
				exercises: exercises.map(({ id, exerciseSplitDayId, ...exercise }) => exercise)
			}))
		};
		const blob = new Blob([JSON.stringify(exported)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'My routines.json';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}
</script>

{#if myRoutines === 'loading'}
	<ExerciseSplitSkeleton />
{:else}
	<div class="mb-4 flex items-end justify-between gap-2 border-b pb-2">
		<div class="flex min-w-0 flex-col">
			<h2 class="truncate text-3xl font-semibold tracking-tight">My routines</h2>
			<span class="text-sm text-muted-foreground" data-testid="my-routines-count">
				{routines.length > 0 ? formatRoutineCount(routines) : 'No routines yet'}
			</span>
		</div>
		<div class="flex shrink-0 items-center gap-1">
			<Button class="gap-1" href="/exercise-splits/edit?new">
				<AddIcon /> New routine
			</Button>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger asChild let:builder>
					<Button aria-label="my-routines-options" builders={[builder]} size="icon" variant="outline">
						<MenuIcon />
					</Button>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end">
					<DropdownMenu.Group>
						<DropdownMenu.Item href="/exercise-splits/templates">Add from a template</DropdownMenu.Item>
						<DropdownMenu.Item href="/exercise-splits/import">Import</DropdownMenu.Item>
						<DropdownMenu.Item class="gap-2" disabled={routines.length === 0} onclick={exportRoutines}>
							<FileUpIcon /> Export
						</DropdownMenu.Item>
						<DropdownMenu.Separator />
						<DropdownMenu.Item href="/exercise-splits/weight-sets">Weight sets</DropdownMenu.Item>
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	</div>

	{#if routines.length > 0}
		<p class="mb-2 text-sm text-muted-foreground">You pick one of these each time you train.</p>
		<div class="flex flex-col gap-2 overflow-y-auto pb-2">
			{#each routines as routine, idx (routine.id)}
				<RoutineCard
					editHref={editLink(routine.name)}
					{routine}
					ontoggle={() => toggleShown(routine.name)}
					shown={shown.includes(routine.name)}
				>
					{#snippet menu()}
						<DropdownMenu.Root>
							<DropdownMenu.Trigger asChild let:builder>
								<Button
									class="shrink-0"
									aria-label="Routine {routine.name} options"
									builders={[builder]}
									size="icon"
									variant="ghost"
								>
									<EllipsisIcon />
								</Button>
							</DropdownMenu.Trigger>
							<DropdownMenu.Content align="end">
								<DropdownMenu.Group>
									<DropdownMenu.Item href={editLink(routine.name)}>Edit</DropdownMenu.Item>
									<DropdownMenu.Item
										onclick={() =>
											change((routines) => withDuplicate(routines, routine.name), `“${routine.name}” duplicated`)}
									>
										Duplicate
									</DropdownMenu.Item>
									<DropdownMenu.Item
										disabled={idx === 0}
										onclick={() => change((routines) => withMoved(routines, routine.name, -1), 'Moved up')}
									>
										Move up
									</DropdownMenu.Item>
									<DropdownMenu.Item
										disabled={idx === routines.length - 1}
										onclick={() => change((routines) => withMoved(routines, routine.name, 1), 'Moved down')}
									>
										Move down
									</DropdownMenu.Item>
									<DropdownMenu.Separator />
									<DropdownMenu.Item class="text-destructive" onclick={() => askToDelete(routine)}>
										Delete…
									</DropdownMenu.Item>
								</DropdownMenu.Group>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					{/snippet}
				</RoutineCard>
			{/each}
		</div>
	{:else}
		<div class="muted-text-box">
			Create a routine for each workout you do, for example "Hotel gym – Upper". You can also start from a template.
		</div>
		<div class="mt-2 grid grid-cols-2 gap-1">
			<Button href="/exercise-splits/templates" variant="secondary">Add from a template</Button>
			<Button class="gap-1" onclick={() => goto('/exercise-splits/edit?new')}>
				<AddIcon /> New routine
			</Button>
		</div>
	{/if}
{/if}

<ResponsiveDialog title="Delete routine?" bind:open={deleteOpen}>
	{#snippet description()}
		{#if deleting}
			<span class="font-semibold">{deleting.name}</span>
			has {deleting.exercises.length}
			{deleting.exercises.length === 1 ? 'exercise' : 'exercises'}, which will be removed with it. Past workouts keep
			their records.
		{/if}
	{/snippet}
	<Button disabled={busy} onclick={deleteRoutine} variant="destructive">Delete</Button>
</ResponsiveDialog>
