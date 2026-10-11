<script lang="ts">
	import ResponsiveDialog from '$lib/components/ResponsiveDialog.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import LoaderCircle from 'virtual:icons/lucide/loader-circle';
	import { updateDataLossDialog, updateServiceWorker } from './PWAFunctions.svelte';

	let updating = $state(false);

	function updateApp() {
		updating = true;
		// A workout in progress and a routine being edited are kept: losing them is the worst case of an update
		const fieldsToKeep = [
			'myfit_terms_accepted',
			'discord-dismiss',
			'domain-move-dismiss',
			'last-used-auth-provider',
			'workoutRunes',
			'workoutRunes:backup',
			'routineEditor'
		];
		const preservedValues: Record<string, string | null> = {};

		fieldsToKeep.forEach((field) => {
			preservedValues[field] = localStorage.getItem(field);
		});

		localStorage.clear();

		fieldsToKeep.forEach((field) => {
			if (preservedValues[field] !== null) {
				localStorage.setItem(field, preservedValues[field]!);
			}
		});

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
