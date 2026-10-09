<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { trpc } from '$lib/trpc/client';
	import { TRPCClientError } from '@trpc/client';
	import { toast } from 'svelte-sonner';
	import LoaderCircle from 'virtual:icons/lucide/loader-circle';
	import InfoPopover from '$lib/components/InfoPopover.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card/index.js';
	import Label from '$lib/components/ui/label/label.svelte';
	import { Slider } from '$lib/components/ui/slider/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import H3 from '$lib/components/ui/typography/H3.svelte';
	import { mesocycleRunes } from '../mesocycleRunes.svelte';

	let { data } = $props();

	let savingMesocycle = $state(false);
	let startImmediately = $state(false);

	// The last step: saves the new mesocycle (or the edits)
	async function createOrEditMesocycle() {
		mesocycleRunes.saveStoresToLocalStorage();
		savingMesocycle = true;
		const mesocycleCyclicSetChanges = $state.snapshot(mesocycleRunes.mesocycleCyclicSetChanges);
		const mesocycle = $state.snapshot(mesocycleRunes.mesocycle);
		try {
			const response = mesocycleRunes.editingMesocycleId
				? await trpc().mesocycles.editById.mutate({
						id: mesocycleRunes.editingMesocycleId,
						mesocycleData: { mesocycle, mesocycleCyclicSetChanges }
					})
				: await trpc().mesocycles.create.mutate({ mesocycle, mesocycleCyclicSetChanges, startImmediately });
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
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center justify-between">
					<span>Progression settings</span>
				</Card.Title>
			</Card.Header>
			<Card.Content class="grid grid-cols-1 gap-5 md:grid-cols-2">
				<div class="relative flex items-center justify-between rounded-md border p-2">
					<Label
						class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
						for="mesocycle-last-set-to-failure"
					>
						Take last set to failure
					</Label>
					<Switch
						id="mesocycle-last-set-to-failure"
						name="mesocycle-last-set-to-failure"
						bind:checked={mesocycleRunes.mesocycle.lastSetToFailure}
					/>
					<InfoPopover
						ariaLabel="mesocycle-last-set-to-failure-info"
						triggerClasses="absolute -right-0.5 -top-2.5 focus:outline-none"
					>
						Take the last set of each exercise to 0 RIR
					</InfoPopover>
				</div>
				<div class="relative flex items-center justify-between rounded-md border p-2">
					<Label
						class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
						for="mesocycle-last-set-to-failure"
					>
						Force RIR matching
					</Label>
					<Switch
						id="mesocycle-force-RIR-matching"
						name="mesocycle-force-RIR-matching"
						bind:checked={mesocycleRunes.mesocycle.forceRIRMatching}
					/>
					<InfoPopover
						ariaLabel="mesocycle-force-RIR-matching-info"
						triggerClasses="absolute -right-0.5 -top-2.5 focus:outline-none"
					>
						Whether or not to reduce reps/load to match planned RIR
					</InfoPopover>
				</div>
				<div class="flex flex-col gap-2 md:col-span-2">
					<div class="flex items-center justify-between text-sm font-medium">
						<span>Start overload percentage</span>
						<span class="text-muted-foreground">
							{mesocycleRunes.mesocycle.startOverloadPercentage}%
						</span>
					</div>
					<Slider
						max={10}
						min={0}
						onValueChange={(value) => (mesocycleRunes.mesocycle.startOverloadPercentage = value[0])}
						step={0.25}
						value={[mesocycleRunes.mesocycle.startOverloadPercentage]}
					/>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	{#if mesocycleRunes.editingMesocycleId === null}
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
	{/if}

	<div class="grid grid-cols-2 gap-1">
		<Button href="./basics" variant="secondary">Previous</Button>
		<Button disabled={savingMesocycle} onclick={createOrEditMesocycle}>
			{#if savingMesocycle}
				<LoaderCircle class="animate-spin" />
			{:else}
				Save
			{/if}
		</Button>
	</div>
</div>
