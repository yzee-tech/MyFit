<script lang="ts">
	import { beforeNavigate, goto, invalidate } from '$app/navigation';
	import ResponsiveDialog from '$lib/components/ResponsiveDialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import H2 from '$lib/components/ui/typography/H2.svelte';
	import { TRPCClientError } from '@trpc/client';
	import type { Snippet } from 'svelte';
	import { toast } from 'svelte-sonner';
	import LoaderCircle from 'virtual:icons/lucide/loader-circle';
	import type { LayoutData } from './$types';
	import { saveWorkoutEdits } from './saveWorkout';
	import { workoutRunes } from './workoutRunes.svelte';

	let { children, data }: { children: Snippet<[LayoutData]>; data: LayoutData } = $props();
	let editing = $derived(workoutRunes.editingWorkoutId !== null);

	// Leaving an edit of a past workout (for a page outside these): unchanged, it just ends;
	// changed, ask to save or discard first
	let leaveDialogOpen = $state(false);
	let leavingTo: URL | null = $state(null);
	let savingEdits = $state(false);

	beforeNavigate((navigation) => {
		if (workoutRunes.editingWorkoutId === null) return;
		// Closing the tab or going to another site: no question is possible (cleared on the next visit)
		if (navigation.to === null || navigation.type === 'leave') return;
		if (navigation.to.url.pathname.startsWith('/workouts/manage')) return;
		if (!workoutRunes.hasUnsavedEdits()) {
			workoutRunes.resetStores();
			return;
		}
		navigation.cancel();
		leavingTo = navigation.to.url;
		leaveDialogOpen = true;
	});

	function continueLeaving() {
		const destination = leavingTo;
		leaveDialogOpen = false;
		leavingTo = null;
		if (destination) goto(destination);
	}

	async function saveAndLeave() {
		if (savingEdits) return;
		savingEdits = true;
		try {
			const message = await saveWorkoutEdits();
			toast.success(message);
			await invalidate('workouts:all');
			workoutRunes.resetStores();
			continueLeaving();
		} catch (error) {
			// Nothing lost: the edit stays, and so does the question
			toast.error(error instanceof TRPCClientError || error instanceof Error ? error.message : 'Failed to save');
		}
		savingEdits = false;
	}

	function discardAndLeave() {
		workoutRunes.resetStores();
		toast.success('Changes discarded');
		continueLeaving();
	}
</script>

<H2>{editing ? 'Edit' : 'Log'} workout</H2>
{@render children(data)}

<ResponsiveDialog cancelLabel="Keep editing" title="Save your changes?" bind:open={leaveDialogOpen}>
	{#snippet description()}
		You changed this workout. Save the changes, or discard them?
	{/snippet}
	<Button disabled={savingEdits} onclick={saveAndLeave}>
		{#if savingEdits}
			<LoaderCircle class="animate-spin" />
		{:else}
			Save changes
		{/if}
	</Button>
	<Button disabled={savingEdits} onclick={discardAndLeave} variant="destructive">Discard changes</Button>
</ResponsiveDialog>
