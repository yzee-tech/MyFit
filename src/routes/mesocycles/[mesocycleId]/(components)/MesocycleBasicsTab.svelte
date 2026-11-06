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
	import PauseIcon from 'virtual:icons/lucide/pause';
	import PlayIcon from 'virtual:icons/lucide/play';
	import StopIcon from 'virtual:icons/lucide/square';

	import LoaderCircle from 'virtual:icons/lucide/loader-circle';
	import { trpc } from '$lib/trpc/client';
	import {
		browserTimeZone,
		formatWeekEffort,
		getBlockWeekHere,
		isBlockPaused,
		isPastPlannedWeeks
	} from '$lib/utils/workoutUtils';
	import { reconcileEndOfPlanHere } from '$lib/utils/reconcileEndOfPlanHere';
	import { useNow } from '$lib/utils/useNow.svelte';
	import { toast } from 'svelte-sonner';
	import { goto, invalidate } from '$app/navigation';
	import { fullMesocycleWithoutIds, mesocycleRunes } from '../../manage/mesocycleRunes.svelte';
	import { TRPCClientError } from '@trpc/client';
	import type { RouterOutputs } from '$lib/trpc/router';

	let { mesocycle }: { mesocycle: NonNullable<RouterOutputs['mesocycles']['findById']> } = $props();
	let deleteConfirmDrawerOpen = $state(false);
	let callingDeleteEndpoint = $state(false);
	let callingPatchEndpoint = $state(false);

	// The week of an active block, in the phone's days; none for a block not started or finished, or past its length
	const now = useNow();
	let weekNow = $derived(
		!mesocycle.startDate || mesocycle.endDate || !now.value
			? null
			: getBlockWeekHere(mesocycle.startDate, now.value, mesocycle.pauses)
	);
	let currentWeek = $derived(weekNow !== null && weekNow <= mesocycle.weeklyRIR.length ? weekNow : null);
	// A paused block's week stands still until it is resumed
	let paused = $derived(isBlockPaused(mesocycle.pauses));
	// The pause the screen shows open: a tap made on an old screen is refused rather than closing a newer one
	let openPauseId = $derived(mesocycle.pauses.find((pause) => pause.resumedAt === null)?.id ?? null);
	// All its planned weeks have run (a paused block stands where its plan ended until it is given another week)
	let pastPlan = $derived(
		!!mesocycle.startDate &&
			!mesocycle.endDate &&
			!!now.value &&
			isPastPlannedWeeks(
				mesocycle.startDate,
				now.value,
				browserTimeZone(),
				mesocycle.pauses,
				mesocycle.weeklyRIR.length
			)
	);
	let pausingOrResuming = $state(false);
	let stopConfirmOpen = $state(false);

	/** The block as the server has it now: its weeks, dates and pauses */
	async function refreshMesocycle() {
		try {
			const fresh = await trpc().mesocycles.findById.query(mesocycle.id);
			if (!fresh) return;
			mesocycle.weeklyRIR = fresh.weeklyRIR;
			mesocycle.startDate = fresh.startDate;
			mesocycle.endDate = fresh.endDate;
			mesocycle.pauses = fresh.pauses;
		} catch {
			// Offline: the screen stays as it was
		}
	}

	// A block past its planned weeks is paused where its plan ended, on the phone's days
	let reconcileTried = false;
	$effect(() => {
		if (reconcileTried || paused || !pastPlan) return;
		reconcileTried = true;
		reconcileEndOfPlanHere().then(async (created) => {
			if (!created) return;
			await refreshMesocycle();
			await invalidate('mesocycles:active');
		});
	});

	async function pauseOrResume() {
		pausingOrResuming = true;
		try {
			const timeZone = browserTimeZone();
			const { message } = await (paused
				? trpc().mesocycles.resume.mutate({ id: mesocycle.id, timeZone, openPauseId })
				: trpc().mesocycles.pause.mutate({ id: mesocycle.id, timeZone }));
			await refreshMesocycle();
			await invalidate('mesocycles:active');
			toast.success(message);
		} catch (error) {
			if (error instanceof TRPCClientError) {
				toast.error(error.message);
				await refreshMesocycle();
			}
		}
		pausingOrResuming = false;
	}

	/** Edit and Extend are one page, with a draft of its own; Clone starts a new block from this one's settings */
	function loadMesocycle(mode: 'edit' | 'clone') {
		if (mode === 'edit') {
			goto(`/mesocycles/${mesocycle.id}/edit`);
			return;
		}
		mesocycleRunes.loadMesocycle({ ...fullMesocycleWithoutIds(mesocycle), startDate: null, endDate: null });
		goto(`/mesocycles/manage/basics`);
	}

	async function progressMesocycle() {
		callingPatchEndpoint = true;
		stopConfirmOpen = false;
		try {
			const response = await trpc().mesocycles.progressToNextStage.mutate({
				id: mesocycle.id,
				startDate: mesocycle.startDate,
				endDate: mesocycle.endDate,
				// Finishing: only the pause this screen shows open (none, if it shows none) is ended with the block
				...(mesocycle.startDate && !mesocycle.endDate ? { openPauseId, timeZone: browserTimeZone() } : {})
			});
			mesocycle.startDate = response.startDate;
			mesocycle.endDate = response.endDate;
			// Stopping closes a pause still open
			if (response.endDate)
				mesocycle.pauses = mesocycle.pauses.map((pause) => ({
					...pause,
					resumedAt: pause.resumedAt ?? response.endDate
				}));
			await invalidate('mesocycles:active');
			toast.success(response.message);
		} catch (error) {
			if (error instanceof TRPCClientError) {
				toast.error(error.message);
				await refreshMesocycle();
			}
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
						{#if !mesocycle.endDate}
							<DropdownMenu.Item class="gap-2" onclick={() => loadMesocycle('edit')}>
								<EditIcon /> Edit
							</DropdownMenu.Item>
						{/if}
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
					<div class="flex gap-1">
						{#if paused}<Badge variant="secondary" data-testid="mesocycle-paused-badge">Paused</Badge>{/if}
						<Badge>Active</Badge>
					</div>
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
			{#if pastPlan}
				<span class="text-sm" data-testid="mesocycle-past-plan">
					Past its planned weeks: it can be extended with more weeks, or finished.
				</span>
			{/if}
			{#if paused && weekNow !== null}
				<!-- Past the planned weeks too: it is still paused in that week -->
				<span class="text-sm" data-testid="mesocycle-paused-week">Week {weekNow} - paused</span>
			{/if}
			<div class="flex flex-wrap gap-1" data-testid="mesocycle-weekly-effort">
				{#each mesocycle.weeklyRIR as _, idx}
					<Badge
						variant={currentWeek === idx + 1 ? 'default' : 'outline'}
						aria-current={currentWeek === idx + 1 ? 'step' : undefined}
						data-current={currentWeek === idx + 1 ? 'true' : undefined}
					>
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
		<Card.Footer class="justify-end gap-2">
			{#if mesocycle.startDate}
				{#if paused && pastPlan}
					<!-- Resume waits for another week: it would only be paused again -->
					<Button class="h-[30px] gap-1.5" size="sm" href="/mesocycles/{mesocycle.id}/edit" variant="secondary">
						<EditIcon class="shrink-0" /> Extend
					</Button>
				{:else}
					<Button
						class="h-[30px] w-[92px] gap-1.5"
						size="sm"
						disabled={pausingOrResuming}
						onclick={pauseOrResume}
						variant="secondary"
					>
						{#if pausingOrResuming}
							<LoaderCircle class="animate-spin" />
						{:else if paused}
							<PlayIcon class="shrink-0" /> Resume
						{:else}
							<PauseIcon class="shrink-0" /> Pause
						{/if}
					</Button>
				{/if}
			{/if}
			<Button
				class={mesocycle.startDate ? `h-[30px] gap-1.5 ${pastPlan ? '' : 'w-[92px]'}` : 'gap-1.5'}
				size="sm"
				disabled={callingPatchEndpoint}
				onclick={() => (mesocycle.startDate && paused ? (stopConfirmOpen = true) : progressMesocycle())}
			>
				{#if callingPatchEndpoint}
					<LoaderCircle class="animate-spin" />
				{:else if !mesocycle.startDate}
					Start mesocycle
				{:else}
					<StopIcon class="shrink-0" /> {pastPlan ? 'Finish block' : 'Stop'}
				{/if}
			</Button>
		</Card.Footer>
	{/if}
</Card.Root>

<ResponsiveDialog title={pastPlan ? 'Finish block?' : 'Stop mesocycle?'} bind:open={stopConfirmOpen}>
	{#snippet description()}
		{pastPlan ? 'Finishing' : 'Stopping'} ends the block and closes the pause.
	{/snippet}
	<Button class="gap-2" disabled={callingPatchEndpoint} onclick={progressMesocycle}
		>{pastPlan ? 'Finish block' : 'Stop mesocycle'}</Button
	>
</ResponsiveDialog>

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
