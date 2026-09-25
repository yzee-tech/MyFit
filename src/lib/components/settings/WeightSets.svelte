<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import { trpc } from '$lib/trpc/client';
	import type { WeightUnit } from '$lib/utils/prismaEnums';
	import { expandRange, formatWeightList, normalizeWeights, type WeightSetLike } from '$lib/utils/weightSets';
	import { unitLabel } from '$lib/utils/weightUnits';
	import { toast } from 'svelte-sonner';
	import AddIcon from 'virtual:icons/lucide/plus';
	import XIcon from 'virtual:icons/lucide/x';

	let { weightSets, homeWeightUnit }: { weightSets: WeightSetLike[]; homeWeightUnit: WeightUnit } = $props();

	type Draft = { id?: string; name: string; unit: WeightUnit; weights: number[] };
	let draft: Draft | null = $state(null);
	let saving = $state(false);

	let rangeFrom: number | undefined = $state();
	let rangeTo: number | undefined = $state();
	let rangeStep: number | undefined = $state();
	let singleWeight: number | undefined = $state();

	function startEditing(weightSet?: WeightSetLike) {
		draft = weightSet
			? { id: weightSet.id, name: weightSet.name, unit: weightSet.unit, weights: [...weightSet.weights] }
			: { name: '', unit: homeWeightUnit, weights: [] };
		rangeFrom = rangeTo = rangeStep = singleWeight = undefined;
	}

	function addRange() {
		if (!draft) return;
		if (rangeFrom === undefined || rangeTo === undefined || rangeStep === undefined) {
			toast.error('Fill in from, to and every');
			return;
		}
		const weights = expandRange(rangeFrom, rangeTo, rangeStep);
		if (weights.length === 0) {
			toast.error('"To" should be at least "from", and "every" more than 0');
			return;
		}
		draft.weights = normalizeWeights([...draft.weights, ...weights]);
		rangeFrom = rangeTo = rangeStep = undefined;
	}

	function addSingleWeight() {
		if (!draft || singleWeight === undefined || !(singleWeight > 0)) return;
		draft.weights = normalizeWeights([...draft.weights, singleWeight]);
		singleWeight = undefined;
	}

	async function saveDraft(e: SubmitEvent) {
		e.preventDefault();
		if (!draft) return;
		if (draft.weights.length === 0) {
			toast.error('Add at least one weight');
			return;
		}
		saving = true;
		try {
			await trpc().weightSets.save.mutate($state.snapshot(draft));
			await invalidate('settings:userSettings');
			toast.success('Weight set saved');
			draft = null;
		} catch (error) {
			console.error('Failed to save weight set:', error);
			toast.error('Failed to save weight set');
		}
		saving = false;
	}

	async function deleteWeightSet(weightSet: WeightSetLike) {
		if (!confirm(`Delete "${weightSet.name}"? Exercises using it go back to standard steps.`)) return;
		try {
			await trpc().weightSets.delete.mutate(weightSet.id);
			await invalidate('settings:userSettings');
			toast.success('Weight set deleted');
		} catch (error) {
			console.error('Failed to delete weight set:', error);
			toast.error('Failed to delete weight set');
		}
	}
</script>

<Card.Root class="w-full">
	<Card.Header>
		<Card.Title>Weight sets</Card.Title>
		<Card.Description>
			The weights a gym actually has, e.g. dumbbells 5–10 kg by 1, then 14 and 20. Link one to an exercise in a routine,
			and suggestions only use those weights. Without one, weights go up by 2.5 kg or 5 lb.
		</Card.Description>
	</Card.Header>
	<Card.Content class="grid gap-2">
		{#each weightSets as weightSet (weightSet.id)}
			<div class="flex items-center gap-2 rounded-md border p-3" data-testid="weight-set-{weightSet.name}">
				<div class="mr-auto flex min-w-0 flex-col">
					<span class="font-medium">{weightSet.name}</span>
					<span class="text-sm text-muted-foreground">
						{formatWeightList(weightSet.weights)}
						{unitLabel(weightSet.unit)}
					</span>
				</div>
				<Button onclick={() => startEditing(weightSet)} size="sm" variant="outline">Edit</Button>
				<Button
					aria-label="Delete {weightSet.name}"
					onclick={() => deleteWeightSet(weightSet)}
					size="icon"
					variant="ghost"
				>
					<XIcon />
				</Button>
			</div>
		{:else}
			{#if !draft}
				<div class="rounded-md bg-muted/50 p-4 text-center text-sm text-muted-foreground">No weight sets yet</div>
			{/if}
		{/each}

		{#if draft}
			<form class="mt-2 grid gap-4 rounded-md border p-4" onsubmit={saveDraft}>
				<div class="grid gap-1.5">
					<Label for="weight-set-name">Name</Label>
					<Input
						id="weight-set-name"
						maxlength={60}
						placeholder="e.g. Building – Dumbbells"
						required
						bind:value={draft.name}
					/>
				</div>
				<div class="flex items-center justify-between gap-4">
					<span class="text-sm font-medium" id="weight-set-unit-label">Unit</span>
					<ToggleGroup.Root
						aria-labelledby="weight-set-unit-label"
						onValueChange={(value) => {
							if (draft && (value === 'KG' || value === 'LB')) draft.unit = value;
						}}
						type="single"
						value={draft.unit}
						variant="outline"
					>
						<ToggleGroup.Item aria-label="Weight set in kilograms" value="KG">kg</ToggleGroup.Item>
						<ToggleGroup.Item aria-label="Weight set in pounds" value="LB">lb</ToggleGroup.Item>
					</ToggleGroup.Root>
				</div>

				<div class="grid gap-1.5">
					<span class="text-sm font-medium">Add a range</span>
					<div class="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
						<div class="grid gap-1">
							<Label class="text-xs text-muted-foreground" for="weight-set-range-from">From</Label>
							<Input id="weight-set-range-from" min={0} step="any" type="number" bind:value={rangeFrom} />
						</div>
						<div class="grid gap-1">
							<Label class="text-xs text-muted-foreground" for="weight-set-range-to">To</Label>
							<Input id="weight-set-range-to" min={0} step="any" type="number" bind:value={rangeTo} />
						</div>
						<div class="grid gap-1">
							<Label class="text-xs text-muted-foreground" for="weight-set-range-step">Every</Label>
							<Input id="weight-set-range-step" min={0} step="any" type="number" bind:value={rangeStep} />
						</div>
						<Button aria-label="Add range" onclick={addRange} size="icon" type="button" variant="secondary">
							<AddIcon />
						</Button>
					</div>
				</div>
				<div class="grid gap-1.5">
					<Label for="weight-set-single">Add one weight</Label>
					<div class="flex gap-2">
						<Input
							id="weight-set-single"
							min={0}
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									addSingleWeight();
								}
							}}
							step="any"
							type="number"
							bind:value={singleWeight}
						/>
						<Button aria-label="Add weight" onclick={addSingleWeight} size="icon" type="button" variant="secondary">
							<AddIcon />
						</Button>
					</div>
				</div>

				<div class="grid gap-1.5">
					<span class="text-sm font-medium">Weights ({unitLabel(draft.unit)})</span>
					<div class="flex flex-wrap gap-1" data-testid="weight-set-draft-weights">
						{#each draft.weights as weight (weight)}
							<Button
								aria-label="Remove {weight}"
								class="h-7 gap-1 px-2"
								onclick={() => {
									if (draft) draft.weights = draft.weights.filter((w) => w !== weight);
								}}
								size="sm"
								type="button"
								variant="outline"
							>
								{weight}
								<XIcon class="h-3 w-3" />
							</Button>
						{:else}
							<span class="text-sm text-muted-foreground">None yet: add a range or single weights above</span>
						{/each}
					</div>
				</div>

				<div class="flex justify-end gap-2">
					<Button onclick={() => (draft = null)} type="button" variant="outline">Cancel</Button>
					<Button disabled={saving} type="submit">Save weight set</Button>
				</div>
			</form>
		{/if}
	</Card.Content>
	{#if !draft}
		<Card.Footer>
			<Button class="w-full gap-2" onclick={() => startEditing()} variant="secondary">
				<AddIcon /> Add weight set
			</Button>
		</Card.Footer>
	{/if}
</Card.Root>
