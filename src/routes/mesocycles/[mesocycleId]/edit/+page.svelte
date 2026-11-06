<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import H2 from '$lib/components/ui/typography/H2.svelte';
	import H3 from '$lib/components/ui/typography/H3.svelte';
	import { trpc } from '$lib/trpc/client';
	import type { RouterOutputs } from '$lib/trpc/router';
	import { useNow } from '$lib/utils/useNow.svelte';
	import {
		browserTimeZone,
		isBlockPaused,
		isPastPlannedWeeks,
		lockedWeekCount,
		formatWeekEffort
	} from '$lib/utils/workoutUtils';
	import { TRPCClientError } from '@trpc/client';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import LoaderCircle from 'virtual:icons/lucide/loader-circle';
	import LockIcon from 'virtual:icons/lucide/lock';
	import PlusIcon from 'virtual:icons/lucide/plus';
	import DeleteIcon from 'virtual:icons/lucide/trash';
	import ProgressionSettings from '../../(components)/ProgressionSettings.svelte';
	import { effortOption, effortOptions } from '../../manage/effortOptions';

	/** The most weeks a block can have */
	const MAX_WEEKS = 52;

	type Block = NonNullable<RouterOutputs['mesocycles']['findById']>;
	type Draft = {
		name: string;
		weeklyRIR: number[];
		startOverloadPercentage: number;
		lastSetToFailure: boolean;
		forceRIRMatching: boolean;
	};

	const mesocycleId = $page.params.mesocycleId as string;
	const draftKey = `mesocycleEditDraft:${mesocycleId}`;

	let block = $state<Block | null>(null);
	let loadState = $state<'loading' | 'ready' | 'missing' | 'failed'>('loading');
	// All the changes, apart from the block: nothing is saved until Save, and Cancel throws it all away
	let draft = $state<Draft | null>(null);
	let saving = $state(false);
	let saveError = $state<string | null>(null);
	const now = useNow();

	function draftOf(source: Block): Draft {
		return {
			name: source.name,
			weeklyRIR: [...source.weeklyRIR],
			startOverloadPercentage: source.startOverloadPercentage,
			lastSetToFailure: source.lastSetToFailure,
			forceRIRMatching: source.forceRIRMatching
		};
	}

	/** A draft kept for this block when the page was left or reloaded without Save or Cancel */
	function savedDraft(): Draft | null {
		try {
			const saved = JSON.parse(sessionStorage.getItem(draftKey) ?? 'null');
			const valid =
				saved &&
				typeof saved.name === 'string' &&
				Array.isArray(saved.weeklyRIR) &&
				saved.weeklyRIR.length >= 1 &&
				saved.weeklyRIR.length <= MAX_WEEKS &&
				saved.weeklyRIR.every((rir: unknown) => Number.isInteger(rir)) &&
				typeof saved.startOverloadPercentage === 'number' &&
				typeof saved.lastSetToFailure === 'boolean' &&
				typeof saved.forceRIRMatching === 'boolean';
			return valid ? saved : null;
		} catch {
			return null;
		}
	}

	function clearDraft() {
		try {
			sessionStorage.removeItem(draftKey);
		} catch {
			// Nothing was kept
		}
	}

	/** The block as it is now: its weeks and pauses decide which weeks are locked. The draft is left as it is */
	async function loadBlock() {
		try {
			const fresh = await trpc().mesocycles.findById.query(mesocycleId);
			if (!fresh) {
				loadState = 'missing';
				return;
			}
			block = fresh;
			draft ??= savedDraft() ?? draftOf(fresh);
			loadState = 'ready';
		} catch {
			if (loadState === 'loading') loadState = 'failed';
		}
	}

	onMount(loadBlock);

	// Kept while editing, so reloading the page does not lose it
	$effect(() => {
		if (!draft) return;
		try {
			sessionStorage.setItem(draftKey, JSON.stringify($state.snapshot(draft)));
		} catch {
			// Not kept: the page works without
		}
	});

	// Weeks 1 to `locked` are past or in progress: they can't be changed or removed. All of a finished block
	let locked = $derived.by(() => {
		if (!block) return 0;
		if (block.endDate) return block.weeklyRIR.length;
		if (!block.startDate) return 0;
		// Until the phone's clock is up, nothing is open
		if (!now.value) return block.weeklyRIR.length;
		return lockedWeekCount(block.startDate, now.value, browserTimeZone(), block.pauses, block.weeklyRIR.length);
	});
	let finished = $derived(block !== null && block.endDate !== null);
	let paused = $derived(block !== null && isBlockPaused(block.pauses));
	let pastPlan = $derived(
		block !== null &&
			block.startDate !== null &&
			!block.endDate &&
			now.value !== null &&
			isPastPlannedWeeks(block.startDate, now.value, browserTimeZone(), block.pauses, block.weeklyRIR.length)
	);
	let weeks = $derived(draft?.weeklyRIR.length ?? 0);

	function addWeek() {
		if (!draft || draft.weeklyRIR.length >= MAX_WEEKS) return;
		// One more week like the last one (a deload copies as a deload): the weeks already there are never regenerated
		draft.weeklyRIR.push(draft.weeklyRIR[draft.weeklyRIR.length - 1]);
	}

	function deleteWeek(index: number) {
		if (!draft || index < locked || draft.weeklyRIR.length <= 1) return;
		draft.weeklyRIR.splice(index, 1);
	}

	/** A locked week that was changed (or removed) in the draft: Save would be refused, so it is put back as saved */
	function restoreLockedWeeks() {
		if (!block || !draft) return;
		for (let index = 0; index < locked; index++) draft.weeklyRIR[index] = block.weeklyRIR[index];
	}
	let lockedChanged = $derived(
		block !== null && draft !== null && block.weeklyRIR.slice(0, locked).some((rir, i) => draft!.weeklyRIR[i] !== rir)
	);

	async function cancel() {
		// The draft is thrown away; nothing is sent
		clearDraft();
		draft = null;
		await goto(`/mesocycles/${mesocycleId}`);
	}

	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (!block || !draft || saving) return;
		saving = true;
		saveError = null;
		try {
			const response = await trpc().mesocycles.editById.mutate({
				id: mesocycleId,
				timeZone: browserTimeZone(),
				mesocycleData: {
					mesocycle: $state.snapshot(draft),
					// Automatic set increases are no longer used: kept only so an edit doesn't drop stored ones
					mesocycleCyclicSetChanges: block.mesocycleCyclicSetChanges.map(
						({ id: _id, mesocycleId: _mesocycleId, ...setChange }) => setChange
					)
				}
			});
			clearDraft();
			draft = null;
			toast.success(response.message);
			await Promise.all([
				invalidate('mesocycles:all'),
				invalidate(`mesocycles:${mesocycleId}`),
				invalidate('mesocycles:active'),
				invalidate('workouts:start'),
				invalidate('workouts:all')
			]);
			await goto(`/mesocycles/${mesocycleId}`);
		} catch (error) {
			// The whole draft stays, and Save can be tried again; the block is read again, so its locks are as they are now
			// The server's reason when it answered; a network failure (the client wraps it too) has none to give
			saveError =
				error instanceof TRPCClientError && error.data
					? error.message
					: "Couldn't save. Check your connection and try again. Your changes are kept.";
			toast.error(saveError);
			await loadBlock();
		} finally {
			saving = false;
		}
	}
</script>

<H2>Edit mesocycle</H2>

{#if loadState === 'loading'}
	<Skeleton class="h-10 w-full" />
	<Skeleton class="mt-2 h-60 w-full" />
{:else if loadState === 'missing'}
	<p class="text-sm" role="alert">This mesocycle was not found.</p>
	<Button class="mt-2" href="/mesocycles" variant="secondary">Back to mesocycles</Button>
{:else if loadState === 'failed'}
	<p class="text-sm" role="alert">Couldn't open the block for editing. Check your connection and try again.</p>
	<div class="mt-2 grid grid-cols-2 gap-1">
		<Button href="/mesocycles/{mesocycleId}" variant="secondary">Back</Button>
		<Button
			onclick={() => {
				loadState = 'loading';
				loadBlock();
			}}>Try again</Button
		>
	</div>
{:else if block && draft}
	{#if finished}
		<p class="text-sm text-muted-foreground" data-testid="edit-finished">
			A finished mesocycle is what was done: it can't be changed.
		</p>
		<Button class="mt-2" href="/mesocycles/{mesocycleId}" variant="secondary">Back</Button>
	{:else}
		<form class="flex grow flex-col gap-2" onsubmit={save}>
			{#if pastPlan}
				<p class="rounded-lg border bg-card p-3 text-sm" data-testid="edit-past-plan">
					It has run all its {block.weeklyRIR.length} planned weeks. Add the weeks you want, then Save.
					{#if paused}Saving does not resume it: Resume is a separate step.{/if}
				</p>
			{:else if paused}
				<p class="rounded-lg border bg-card p-3 text-sm" data-testid="edit-paused">
					It is paused. Saving does not resume it.
				</p>
			{/if}

			<div class="flex w-full flex-col gap-1.5">
				<Label for="mesocycle-name">Mesocycle name</Label>
				<Input id="mesocycle-name" placeholder="Type here" required bind:value={draft.name} />
			</div>

			<H3>Weekly effort</H3>
			<p class="text-sm text-muted-foreground">
				How many reps to keep in reserve (RIR) each week. A deload week keeps last week's weights with half the sets.
				{#if locked > 0}
					{locked === 1 ? 'Week 1 is' : `Weeks 1 to ${locked} are`} past or in progress, so
					{locked === 1 ? 'it' : 'they'} can't be changed.
				{/if}
			</p>
			<ol class="flex flex-col gap-1" data-testid="edit-weeks">
				{#each draft.weeklyRIR as rir, idx}
					{@const isLocked = idx < locked}
					<li
						class="flex items-center justify-between gap-2 rounded-lg border bg-card px-4 py-2"
						data-locked={isLocked}
					>
						<span class="flex items-center gap-1.5 font-medium">
							Week {idx + 1}
							{#if isLocked}<LockIcon
									class="size-3.5 text-muted-foreground"
									aria-label="Week {idx + 1} is locked"
								/>{/if}
						</span>
						<div class="flex items-center gap-1">
							{#if isLocked && block.weeklyRIR[idx] !== rir}
								<Button
									aria-label="Restore week {idx + 1}"
									class="h-auto p-0"
									onclick={() => (draft!.weeklyRIR[idx] = block!.weeklyRIR[idx])}
									type="button"
									variant="link"
								>
									Restore {formatWeekEffort(block.weeklyRIR, idx + 1)}
								</Button>
							{/if}
							<Select.Root
								disabled={isLocked}
								onSelectedChange={(selected) => {
									if (selected && !isLocked) draft!.weeklyRIR[idx] = selected.value;
								}}
								selected={effortOption(rir)}
							>
								<Select.Trigger class="w-40" aria-label="Week {idx + 1} effort">
									<Select.Value />
								</Select.Trigger>
								<Select.Content>
									{#each effortOptions as option}
										<Select.Item value={option.value}>{option.label}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
							{#if !isLocked && weeks > 1}
								<Button
									aria-label="Delete week {idx + 1}"
									onclick={() => deleteWeek(idx)}
									size="icon"
									type="button"
									variant="ghost"
								>
									<DeleteIcon class="size-4" />
								</Button>
							{/if}
						</div>
					</li>
				{/each}
			</ol>
			<Button class="gap-1.5" disabled={weeks >= MAX_WEEKS} onclick={addWeek} type="button" variant="secondary">
				<PlusIcon class="size-4" /> Add week
			</Button>
			{#if weeks >= MAX_WEEKS}
				<p class="text-sm text-muted-foreground">A mesocycle can have up to {MAX_WEEKS} weeks.</p>
			{/if}

			<ProgressionSettings
				bind:lastSetToFailure={draft.lastSetToFailure}
				bind:forceRIRMatching={draft.forceRIRMatching}
				bind:startOverloadPercentage={draft.startOverloadPercentage}
			/>

			{#if saveError}
				<p class="rounded-lg border border-destructive p-3 text-sm" data-testid="edit-save-error" role="alert">
					{saveError}
					{#if lockedChanged}
						<Button class="h-auto p-0" onclick={restoreLockedWeeks} type="button" variant="link">
							Put the locked weeks back
						</Button>
					{/if}
				</p>
			{/if}

			<div class="mt-auto grid grid-cols-2 gap-1">
				<Button disabled={saving} onclick={cancel} type="button" variant="secondary">Cancel</Button>
				<Button disabled={saving} type="submit">
					{#if saving}
						<LoaderCircle class="animate-spin" />
					{:else}
						Save
					{/if}
				</Button>
			</div>
		</form>
	{/if}
{/if}
