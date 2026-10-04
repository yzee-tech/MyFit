<script lang="ts">
	import { goto } from '$app/navigation';
	import InfoPopover from '$lib/components/InfoPopover.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card/index.js';
	import Label from '$lib/components/ui/label/label.svelte';
	import { Slider } from '$lib/components/ui/slider/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import H3 from '$lib/components/ui/typography/H3.svelte';
	import { mesocycleRunes } from '../mesocycleRunes.svelte';

	function saveProgression() {
		mesocycleRunes.saveStoresToLocalStorage();
		goto('./overview');
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

	<div class="grid grid-cols-2 gap-1">
		<Button variant="secondary">
			<a class="w-full" href="./basics">Previous</a>
		</Button>
		<Button onclick={saveProgression}>Next</Button>
	</div>
</div>
