<script lang="ts">
	import ResponsiveDialog from '$lib/components/ResponsiveDialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import AddIcon from 'virtual:icons/lucide/plus';
	import DeleteIcon from 'virtual:icons/lucide/trash-2';

	type PropsType = {
		routines: { name: string }[];
		/** Number of exercises in each routine, to warn before deleting one that has some */
		exerciseCounts: number[];
		/** Why a routine can't be deleted, or undefined when it can */
		deleteBlockedReason?: (idx: number) => string | undefined;
		addRoutine: () => void;
		removeRoutine: (idx: number) => void;
	};
	let {
		routines,
		exerciseCounts,
		deleteBlockedReason = () => undefined,
		addRoutine,
		removeRoutine
	}: PropsType = $props();

	let pendingDeleteIndex: number | null = $state(null);
	let confirmDeleteOpen = $state(false);

	function requestDelete(idx: number) {
		if ((exerciseCounts[idx] ?? 0) === 0) {
			removeRoutine(idx);
			return;
		}
		pendingDeleteIndex = idx;
		confirmDeleteOpen = true;
	}
</script>

<ol class="flex flex-col gap-1">
	{#each routines as routine, idx}
		{@const blockedReason = deleteBlockedReason(idx)}
		<li class="flex items-center gap-2">
			<span class="w-5 shrink-0 text-center text-sm text-muted-foreground">{idx + 1}</span>
			<Input
				id="routine-{idx + 1}-name"
				aria-label="Routine {idx + 1} name"
				placeholder="e.g. Hotel gym – Legs"
				required
				bind:value={routine.name}
			/>
			<Button
				aria-label="Delete routine {idx + 1}"
				class="shrink-0"
				disabled={routines.length === 1 || blockedReason !== undefined}
				onclick={() => requestDelete(idx)}
				size="icon"
				title={blockedReason}
				type="button"
				variant="ghost"
			>
				<DeleteIcon />
			</Button>
		</li>
	{/each}
</ol>
<Button class="mt-1 gap-2" onclick={addRoutine} type="button" variant="secondary">
	<AddIcon /> Add routine
</Button>

<ResponsiveDialog title="Delete routine?" bind:open={confirmDeleteOpen}>
	{#snippet description()}
		{#if pendingDeleteIndex !== null}
			<span class="font-semibold">{routines[pendingDeleteIndex]?.name || `Routine ${pendingDeleteIndex + 1}`}</span>
			has {exerciseCounts[pendingDeleteIndex]} exercises, which will be removed with it.
		{/if}
	{/snippet}
	<Button
		onclick={() => {
			if (pendingDeleteIndex !== null) removeRoutine(pendingDeleteIndex);
			pendingDeleteIndex = null;
			confirmDeleteOpen = false;
		}}
		variant="destructive"
	>
		Delete
	</Button>
</ResponsiveDialog>
