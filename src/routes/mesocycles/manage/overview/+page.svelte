<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { toast } from 'svelte-sonner';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { Button } from '$lib/components/ui/button';
	import LoaderCircle from 'virtual:icons/lucide/loader-circle';
	import H3 from '$lib/components/ui/typography/H3.svelte';
	import { mesocycleRunes } from '../mesocycleRunes.svelte';
	import { trpc } from '$lib/trpc/client';
	import { invalidate, goto } from '$app/navigation';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { TRPCClientError } from '@trpc/client';

	let { data } = $props();

	let savingMesocycle = $state(false);
	let startImmediately = $state(false);

	async function createOrEditMesocycle() {
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

<H3>Overview</H3>

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

{#if mesocycleRunes.editingMesocycleId === null}
	<Card.Root class="my-2 p-4" data-testid="block-uses-my-routines">
		{#await data.myRoutineNames then names}
			<p class="mb-1 text-sm font-medium">
				Uses My routines{names.length > 0 ? ` (${names.length} ${names.length === 1 ? 'routine' : 'routines'})` : ''}
			</p>
			<p class="text-sm text-muted-foreground">
				{names.length > 0 ? names.join(', ') : 'No routines yet: create them in My routines. Blank workouts work too.'}
			</p>
		{/await}
		<p class="mt-1 text-sm text-muted-foreground">Edits to My routines show up in this mesocycle straight away.</p>
	</Card.Root>
{/if}

<div class="mt-auto grid grid-cols-2 gap-1">
	<Button onclick={() => window.history.back()} variant="secondary">Previous</Button>
	<Button disabled={savingMesocycle} onclick={createOrEditMesocycle}>
		{#if savingMesocycle}
			<LoaderCircle class="animate-spin" />
		{:else}
			Save
		{/if}
	</Button>
</div>
