<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import H3 from '$lib/components/ui/typography/H3.svelte';

	import { goto } from '$app/navigation';
	import { DELOAD_WEEK, suggestWeeklyRIR } from '$lib/utils/workoutUtils';
	import { mesocycleRunes } from '../mesocycleRunes.svelte';

	const MAX_WEEKS = 20;
	const effortOptions = [
		{ value: 4, label: '4 RIR' },
		{ value: 3, label: '3 RIR' },
		{ value: 2, label: '2 RIR' },
		{ value: 1, label: '1 RIR' },
		{ value: 0, label: '0 RIR (failure)' },
		{ value: DELOAD_WEEK, label: 'Deload' }
	];

	let weeklyRIR = $state(structuredClone($state.snapshot(mesocycleRunes.mesocycle.weeklyRIR)));
	let totalWeeks = $state(weeklyRIR.length);

	function getOption(value: number) {
		return effortOptions.find((option) => option.value === value) ?? effortOptions[1];
	}

	/** A new length starts from the suggested plan, which can then be adjusted week by week */
	function changeLength(weeks: number) {
		if (isNaN(weeks) || weeks < 1 || weeks > MAX_WEEKS) return;
		weeklyRIR = suggestWeeklyRIR(weeks);
	}

	function saveBasics(e: SubmitEvent) {
		e.preventDefault();
		mesocycleRunes.mesocycle.weeklyRIR = $state.snapshot(weeklyRIR);
		mesocycleRunes.saveStoresToLocalStorage();
		goto('/mesocycles/manage/progression');
	}
</script>

<H3>Basics</H3>

<form class="flex grow flex-col gap-2" onsubmit={saveBasics}>
	<div class="flex w-full flex-col gap-1.5">
		<Label for="mesocycle-name">Mesocycle name</Label>
		<Input id="mesocycle-name" placeholder="Type here" required bind:value={mesocycleRunes.mesocycle.name} />
	</div>

	<div class="flex w-full flex-col gap-1.5">
		<Label for="mesocycle-duration">Mesocycle duration (weeks)</Label>
		<Input
			id="mesocycle-duration"
			max={MAX_WEEKS}
			min={1}
			oninput={(e) => {
				totalWeeks = e.currentTarget.valueAsNumber;
				changeLength(totalWeeks);
			}}
			placeholder="Type here"
			required
			type="number"
			value={totalWeeks}
		/>
	</div>

	<div class="flex items-center justify-between">
		<span class="text-sm font-medium leading-none">Weekly effort</span>
		<Button
			class="h-auto p-0"
			onclick={() => (weeklyRIR = suggestWeeklyRIR(weeklyRIR.length))}
			type="button"
			variant="link"
		>
			Use suggested
		</Button>
	</div>
	<p class="text-sm text-muted-foreground">
		How many reps to keep in reserve (RIR) each week. A deload week keeps last week's weights with half the sets.
	</p>
	<ol class="flex flex-col gap-1">
		{#each weeklyRIR as rir, idx}
			<li class="flex items-center justify-between gap-2 rounded-lg border bg-card px-4 py-2">
				<span class="font-medium">Week {idx + 1}</span>
				<Select.Root
					onSelectedChange={(selected) => {
						if (selected) weeklyRIR[idx] = selected.value;
					}}
					selected={getOption(rir)}
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
			</li>
		{/each}
	</ol>

	<Button class="mt-auto" type="submit">Next</Button>
</form>
