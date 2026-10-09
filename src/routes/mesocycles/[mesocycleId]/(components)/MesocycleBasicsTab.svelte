<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Switch } from '$lib/components/ui/switch';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import ResponsiveDialog from '$lib/components/ResponsiveDialog.svelte';

	import CloneIcon from 'virtual:icons/clarity/clone-line';
	import DeleteIcon from 'virtual:icons/lucide/trash';
	import MenuIcon from 'virtual:icons/lucide/menu';
	import EditIcon from 'virtual:icons/lucide/pencil';

	import LoaderCircle from 'virtual:icons/lucide/loader-circle';
	import { trpc } from '$lib/trpc/client';
	import { formatWeekEffort, isDeloadWeek } from '$lib/utils/workoutUtils';
	import { toast } from 'svelte-sonner';
	import { goto, invalidate } from '$app/navigation';
	import { mesocycleRunes, type FullMesocycleWithoutIds } from '../../manage/mesocycleRunes.svelte';
	import { TRPCClientError } from '@trpc/client';
	import type { RouterOutputs } from '$lib/trpc/router';

	let { mesocycle }: { mesocycle: NonNullable<RouterOutputs['mesocycles']['findById']> } = $props();
	let deleteConfirmDrawerOpen = $state(false);
	let callingDeleteEndpoint = $state(false);
	let callingPatchEndpoint = $state(false);

	function loadMesocycle(mode: 'edit' | 'clone') {
		if (mode === 'edit') {
			mesocycleRunes.loadMesocycle(getMesocycleWithoutIds(), mesocycle.id);
		} else if (mode === 'clone') {
			mesocycleRunes.loadMesocycle({ ...getMesocycleWithoutIds(), startDate: null, endDate: null });
		}
		goto(`/mesocycles/manage/basics`);
	}

	/** The block's own settings, to edit or clone: its routines are My routines */
	function getMesocycleWithoutIds(): FullMesocycleWithoutIds {
		return {
			name: mesocycle.name,
			weeklyRIR: mesocycle.weeklyRIR,
			startDate: mesocycle.startDate,
			endDate: mesocycle.endDate,
			startOverloadPercentage: mesocycle.startOverloadPercentage,
			lastSetToFailure: mesocycle.lastSetToFailure,
			forceRIRMatching: mesocycle.forceRIRMatching,
			mesocycleCyclicSetChanges: mesocycle.mesocycleCyclicSetChanges.map(({ id, mesocycleId, ...rest }) => rest)
		};
	}

	async function progressMesocycle() {
		callingPatchEndpoint = true;
		try {
			const response = await trpc().mesocycles.progressToNextStage.mutate({
				id: mesocycle.id,
				startDate: mesocycle.startDate,
				endDate: mesocycle.endDate
			});
			mesocycle.startDate = response.startDate;
			mesocycle.endDate = response.endDate;
			await invalidate('mesocycles:active');
			toast.success(response.message);
		} catch (error) {
			if (error instanceof TRPCClientError) toast.error(error.message);
		}
		callingPatchEndpoint = false;
	}

	async function deleteMesocycle() {
		callingDeleteEndpoint = true;
		try {
			const { message } = await trpc().mesocycles.deleteById.mutate(mesocycle.id);
			toast.success(message);
			await invalidate('mesocycles:all');
			await goto('/mesocycles');
		} catch (error) {
			if (error instanceof TRPCClientError) toast.error(error.message);
		}
		callingDeleteEndpoint = false;
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex justify-between">
			{mesocycle.name}
			<DropdownMenu.Root>
				<DropdownMenu.Trigger aria-label="mesocycle-options">
					<MenuIcon />
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end">
					<DropdownMenu.Group>
						<DropdownMenu.Item class="gap-2" onclick={() => loadMesocycle('edit')}>
							<EditIcon /> Edit
						</DropdownMenu.Item>
						<DropdownMenu.Item class="gap-2" onclick={() => loadMesocycle('clone')}>
							<CloneIcon /> Clone
						</DropdownMenu.Item>
						<DropdownMenu.Item class="gap-2 text-red-500" on:click={() => (deleteConfirmDrawerOpen = true)}>
							<DeleteIcon /> Delete
						</DropdownMenu.Item>
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</Card.Title>
		<Card.Description>
			<div class="flex justify-between">
				<p>
					{#if mesocycle.startDate}
						<span>{mesocycle.startDate.toLocaleDateString()}</span>
					{:else}
						No dates available
					{/if}
					{#if mesocycle.endDate}
						to <span>{mesocycle.endDate.toLocaleDateString()}</span>
					{/if}
				</p>
				{#if !mesocycle.startDate}
					<Badge variant="secondary">Unused</Badge>
				{:else if !mesocycle.endDate}
					<Badge>Active</Badge>
				{:else}
					<Badge variant="outline">Completed</Badge>
				{/if}
			</div>
		</Card.Description>
	</Card.Header>
	<Card.Content class="flex flex-col gap-3">
		<div class="flex flex-col gap-1">
			<div class="flex justify-between">
				<span class="text-sm text-muted-foreground">Weekly effort</span>
				<Badge variant="outline">{mesocycle.weeklyRIR.length} weeks</Badge>
			</div>
			<div class="flex flex-wrap gap-1" data-testid="mesocycle-weekly-effort">
				{#each mesocycle.weeklyRIR as _, idx}
					<Badge variant={isDeloadWeek(mesocycle.weeklyRIR, idx + 1) ? 'secondary' : 'outline'}>
						W{idx + 1}: {formatWeekEffort(mesocycle.weeklyRIR, idx + 1)}
					</Badge>
				{/each}
			</div>
		</div>
		<div class="flex flex-col">
			<span class="text-sm text-muted-foreground">Start overload percentage</span>
			<span class="font-semibold capitalize">
				{mesocycle.startOverloadPercentage}%
			</span>
		</div>
		<div class="flex flex-col gap-1">
			<span id="last-set-to-failure-label" class="text-sm text-muted-foreground"> Last set to failure </span>
			<Switch
				name="mesocycle-last-set-to-failure"
				aria-labelledby="last-set-to-failure-label"
				checked={mesocycle.lastSetToFailure}
				disabled
			/>
		</div>
		<div class="flex flex-col gap-1">
			<span id="force-RIR-matching-label" class="text-sm text-muted-foreground"> Force RIR matching </span>
			<Switch
				name="mesocycle-force-RIR-matching"
				aria-labelledby="force-RIR-matching-label"
				checked={mesocycle.forceRIRMatching}
				disabled
			/>
		</div>
	</Card.Content>
	{#if !mesocycle.endDate}
		<Card.Footer class="justify-end">
			<Button class="w-36" disabled={callingPatchEndpoint} onclick={progressMesocycle}>
				{#if callingPatchEndpoint}
					<LoaderCircle class="animate-spin" />
				{:else}
					{!mesocycle.startDate ? 'Start mesocycle' : 'Stop mesocycle'}
				{/if}
			</Button>
		</Card.Footer>
	{/if}
</Card.Root>

<ResponsiveDialog title="Delete mesocycle?" bind:open={deleteConfirmDrawerOpen}>
	{#snippet description()}
		This action cannot be undone.
	{/snippet}
	<Button class="gap-2" disabled={callingDeleteEndpoint} onclick={deleteMesocycle} variant="destructive">
		{#if callingDeleteEndpoint}
			<LoaderCircle class="animate-spin" />
		{:else}
			Yes, delete
		{/if}
	</Button>
</ResponsiveDialog>
