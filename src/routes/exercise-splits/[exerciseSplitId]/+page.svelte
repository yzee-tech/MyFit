<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Button } from '$lib/components/ui/button';
	import MenuIcon from 'virtual:icons/lucide/menu';
	import CloneIcon from 'virtual:icons/clarity/clone-line';
	import DeleteIcon from 'virtual:icons/lucide/trash';
	import EditIcon from 'virtual:icons/lucide/pencil';
	import LoaderCircle from 'virtual:icons/lucide/loader-circle';
	import FileUpIcon from 'virtual:icons/lucide/file-up';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import ExerciseSplitSkeleton from './(components)/ExerciseSplitSkeleton.svelte';
	import ExercisesTableComponent from './(components)/ExercisesTableComponent.svelte';
	import ResponsiveDialog from '$lib/components/ResponsiveDialog.svelte';
	import { goto, invalidate } from '$app/navigation';
	import {
		exerciseSplitRunes,
		type FullExerciseSplit,
		type FullExerciseSplitWithoutIdsOrIndex
	} from '../manage/exerciseSplitRunes.svelte';
	import { trpc } from '$lib/trpc/client';
	import { page } from '$app/stores';
	import { TRPCClientError } from '@trpc/client';
	import { formatRoutineCount } from '$lib/utils/mesocycleUtils';

	let { data } = $props();
	let exerciseSplit: FullExerciseSplit | 'loading' = $state('loading');
	let deleteConfirmDrawerOpen = $state(false);
	let callingDeleteEndpoint = $state(false);

	onMount(async () => {
		const serverExerciseSplit = await data.exerciseSplit;
		if (serverExerciseSplit) exerciseSplit = serverExerciseSplit;
		else toast.error('Routine library not found');
	});

	async function deleteExerciseSplit() {
		callingDeleteEndpoint = true;
		try {
			const response = await trpc().exerciseSplits.deleteById.mutate($page.params.exerciseSplitId!);
			toast.success(response.message);
			await invalidate('exerciseSplits:all');
			await goto('/exercise-splits');
		} catch (error) {
			if (error instanceof TRPCClientError) toast.error(error.message);
		}
		callingDeleteEndpoint = false;
	}

	function getExerciseSplitWithoutIds(exerciseSplit: FullExerciseSplit) {
		const noIdsSplit: FullExerciseSplitWithoutIdsOrIndex = {
			name: exerciseSplit.name,
			exerciseSplitDays: exerciseSplit.exerciseSplitDays.map(({ name, isRestDay, exercises }) => ({
				name,
				isRestDay,
				exercises: exercises.map(({ id, exerciseSplitDayId, ...exerciseTemplate }) => exerciseTemplate)
			}))
		};
		return noIdsSplit;
	}

	function loadExerciseSplit(mode: 'edit' | 'clone') {
		if (exerciseSplit === 'loading') return;
		if (mode === 'edit') {
			editExerciseSplit();
		} else if (mode === 'clone') {
			exerciseSplitRunes.loadExerciseSplit(getExerciseSplitWithoutIds(exerciseSplit));
			goto(`/exercise-splits/manage/structure`);
		}
	}

	function editExerciseSplit() {
		if (exerciseSplit === 'loading') return;
		exerciseSplitRunes.loadExerciseSplit(getExerciseSplitWithoutIds(exerciseSplit), exerciseSplit.id);
		goto(`/exercise-splits/manage/structure`);
	}

	function exportSplit() {
		if (exerciseSplit === 'loading') return;

		const { userId, id, ...rest } = exerciseSplit;
		(rest.exerciseSplitDays as unknown) = rest.exerciseSplitDays.map((day) => {
			const { id, exerciseSplitId, ...rest } = day;
			(rest.exercises as unknown) = rest.exercises.map((ex) => {
				const { id, exerciseSplitDayId, ...rest } = ex;
				return rest;
			});
			return rest;
		});

		const jsonData = JSON.stringify(rest);
		const blob = new Blob([jsonData], { type: 'application/json' });

		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `${exerciseSplit.name}.json`;

		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}
</script>

{#if exerciseSplit === 'loading'}
	<ExerciseSplitSkeleton />
{:else}
	<div class="mb-4 flex items-end justify-between gap-2 border-b pb-2">
		<div class="flex min-w-0 flex-col">
			<h2 class="truncate text-3xl font-semibold tracking-tight">{exerciseSplit.name}</h2>
			<span class="text-sm text-muted-foreground">
				Routine library · {formatRoutineCount(exerciseSplit.exerciseSplitDays)}
			</span>
		</div>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger aria-label="exercise-split-options" class="mb-1 shrink-0">
				<MenuIcon />
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end">
				<DropdownMenu.Group>
					<DropdownMenu.Item class="gap-2" onclick={() => loadExerciseSplit('edit')}>
						<EditIcon /> Edit
					</DropdownMenu.Item>
					<DropdownMenu.Item class="gap-2" onclick={() => loadExerciseSplit('clone')}>
						<CloneIcon /> Clone
					</DropdownMenu.Item>
					<DropdownMenu.Item class="gap-2" onclick={() => exportSplit()}>
						<FileUpIcon /> Export
					</DropdownMenu.Item>
					<DropdownMenu.Item class="gap-2 text-red-500" onclick={() => (deleteConfirmDrawerOpen = true)}>
						<DeleteIcon /> Delete
					</DropdownMenu.Item>
				</DropdownMenu.Group>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
	<div class="flex grow flex-col">
		<ExercisesTableComponent exerciseSplitDays={exerciseSplit.exerciseSplitDays.filter((day) => !day.isRestDay)} />
	</div>
	<ResponsiveDialog title="Delete routine library?" bind:open={deleteConfirmDrawerOpen}>
		{#snippet description()}
			This can't be undone. Blocks made from it and your workouts are kept.
		{/snippet}
		<Button disabled={callingDeleteEndpoint} onclick={deleteExerciseSplit} variant="destructive">
			{#if callingDeleteEndpoint}
				<LoaderCircle class="animate-spin" />
			{:else}
				Yes, delete
			{/if}
		</Button>
	</ResponsiveDialog>
{/if}
