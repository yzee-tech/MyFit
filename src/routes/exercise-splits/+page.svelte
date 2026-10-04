<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { trpc } from '$lib/trpc/client';
	import type { RouterOutputs } from '$lib/trpc/router';
	import { formatRoutineCount } from '$lib/utils/mesocycleUtils';
	import { onMount } from 'svelte';
	import EditIcon from 'virtual:icons/lucide/pencil';
	import FileUpIcon from 'virtual:icons/lucide/file-up';
	import MenuIcon from 'virtual:icons/lucide/menu';
	import ExerciseSplitSkeleton from './(components)/ExerciseSplitSkeleton.svelte';
	import ExercisesTableComponent from './(components)/ExercisesTableComponent.svelte';
	import { exerciseSplitRunes } from './manage/exerciseSplitRunes.svelte';

	type MyRoutines = RouterOutputs['exerciseSplits']['mine'];
	let myRoutines = $state<MyRoutines | 'loading'>('loading');
	let routines = $derived(myRoutines === 'loading' ? [] : (myRoutines?.exerciseSplitDays ?? []));

	onMount(async () => {
		myRoutines = await trpc().exerciseSplits.mine.query();
	});

	/** Opens the editor with My routines as saved */
	function editRoutines() {
		exerciseSplitRunes.loadMyRoutines(routines);
		goto('/exercise-splits/manage/structure');
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
			<Button class="gap-2" onclick={editRoutines}>
				<EditIcon />
				{routines.length > 0 ? 'Edit' : 'Create'}
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
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	</div>
	{#if routines.length > 0}
		<p class="mb-2 text-sm text-muted-foreground">
			You pick one of these each time you train. Your current block always uses them as they are here.
		</p>
		<div class="flex grow flex-col">
			<ExercisesTableComponent exerciseSplitDays={routines} />
		</div>
	{:else}
		<div class="muted-text-box">
			Create a routine for each workout you do, for example "Hotel gym – Upper". You can also start from a template.
		</div>
	{/if}
{/if}
