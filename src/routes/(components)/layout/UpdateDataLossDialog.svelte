<script lang="ts">
	import ResponsiveDialog from '$lib/components/ResponsiveDialog.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { clearStorageForUpdate } from '$lib/utils/clearForUpdate';
	import LoaderCircle from 'virtual:icons/lucide/loader-circle';
	import { toast } from 'svelte-sonner';
	import { updateDataLossDialog, updateServiceWorker } from './PWAFunctions.svelte';

	let updating = $state(false);

	function updateApp() {
		updating = true;
		// A workout in progress, a routine being edited and the workouts waiting to be sent are kept: losing them is the worst case of an update
		try {
			clearStorageForUpdate(localStorage);
		} catch {
			// Nothing kept was touched; updating on top of half-cleaned storage could still lose the rest
			toast.error("Couldn't clear the old data, so the update didn't run. Nothing was lost, try again");
			updating = false;
			return;
		}

		updateServiceWorker!(true);
	}
</script>

<ResponsiveDialog title="Update app?" bind:open={updateDataLossDialog.open}>
	{#snippet description()}
		<p>A workout in progress and a routine you're editing are kept. An unsaved mesocycle will be lost.</p>
	{/snippet}
	<Button disabled={updating} onclick={updateApp} class="gap-2">
		{#if updating}
			<LoaderCircle class="animate-spin" />
		{:else}
			Update
		{/if}
	</Button>
</ResponsiveDialog>
