<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { trpc } from '$lib/trpc/client';
	import { TRPCClientError } from '@trpc/client';
	import { toast } from 'svelte-sonner';
	import LoaderCircle from 'virtual:icons/lucide/loader-circle';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card/index.js';
	import Label from '$lib/components/ui/label/label.svelte';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import H3 from '$lib/components/ui/typography/H3.svelte';
	import ProgressionSettings from '../../(components)/ProgressionSettings.svelte';
	import { mesocycleRunes } from '../mesocycleRunes.svelte';

	let { data } = $props();

	let savingMesocycle = $state(false);
	let startImmediately = $state(false);

	// The last step: saves the new mesocycle (a block that exists is edited on its own page)
	async function createMesocycle() {
		mesocycleRunes.saveStoresToLocalStorage();
		savingMesocycle = true;
		const mesocycleCyclicSetChanges = $state.snapshot(mesocycleRunes.mesocycleCyclicSetChanges);
		const mesocycle = $state.snapshot(mesocycleRunes.mesocycle);
		try {
			const response = await trpc().mesocycles.create.mutate({
				mesocycle,
				mesocycleCyclicSetChanges,
				startImmediately
			});
			toast.success(response.message);
			await invalidate('mesocycles:all');
			await goto('/mesocycles');
			mesocycleRunes.resetStores();
		} catch (error) {
			if (error instanceof TRPCClientError) toast.error(error.message);
		}
		savingMesocycle = false;
	}
</script>

<H3>Progression</H3>

<div class="flex grow flex-col justify-between gap-2">
	<div class="h-px grow overflow-y-auto">
		<ProgressionSettings
			bind:lastSetToFailure={mesocycleRunes.mesocycle.lastSetToFailure}
			bind:forceRIRMatching={mesocycleRunes.mesocycle.forceRIRMatching}
			bind:startOverloadPercentage={mesocycleRunes.mesocycle.startOverloadPercentage}
		/>
	</div>

	<Card.Root class="p-4">
		<div class="grid grid-cols-2">
			<div class="flex items-center">
				<Label for="start-mesocycle-immediately">Start immediately</Label>
			</div>
			{#await data.activeMesocycle}
				<Skeleton class="switch-skeleton" />
			{:then activeMesocycle}
				<Switch
					id="start-mesocycle-immediately"
					name="start-mesocycle-immediately"
					class="place-self-end"
					disabled={activeMesocycle !== null}
					bind:checked={startImmediately}
				/>
				{#if activeMesocycle !== null}
					<span class="col-span-2 text-sm text-muted-foreground">
						<b>{activeMesocycle.name}</b> is already active
					</span>
				{/if}
			{/await}
		</div>
	</Card.Root>

	<div class="grid grid-cols-2 gap-1">
		<Button href="./basics" variant="secondary">Previous</Button>
		<Button disabled={savingMesocycle} onclick={createMesocycle}>
			{#if savingMesocycle}
				<LoaderCircle class="animate-spin" />
			{:else}
				Save
			{/if}
		</Button>
	</div>
</div>
