<script lang="ts">
	import InfoPopover from '$lib/components/InfoPopover.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import Label from '$lib/components/ui/label/label.svelte';
	import { Slider } from '$lib/components/ui/slider/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';

	/** A block's progression settings: shared by the new-block steps and the editor of a block that exists */
	let {
		lastSetToFailure = $bindable(),
		forceRIRMatching = $bindable(),
		startOverloadPercentage = $bindable(),
		disabled = false
	}: {
		lastSetToFailure: boolean;
		forceRIRMatching: boolean;
		startOverloadPercentage: number;
		disabled?: boolean;
	} = $props();
</script>

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
				{disabled}
				bind:checked={lastSetToFailure}
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
				for="mesocycle-force-RIR-matching"
			>
				Force RIR matching
			</Label>
			<Switch
				id="mesocycle-force-RIR-matching"
				name="mesocycle-force-RIR-matching"
				{disabled}
				bind:checked={forceRIRMatching}
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
					{startOverloadPercentage}%
				</span>
			</div>
			<Slider
				{disabled}
				max={10}
				min={0}
				onValueChange={(value) => (startOverloadPercentage = value[0])}
				step={0.25}
				value={[startOverloadPercentage]}
			/>
		</div>
	</Card.Content>
</Card.Root>
