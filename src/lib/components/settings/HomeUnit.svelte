<script lang="ts">
	import { invalidate } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import { trpc } from '$lib/trpc/client';
	import type { WeightUnit } from '$lib/utils/prismaEnums';
	import type { MassUnit } from '$lib/utils/weightUnits';
	import { toast } from 'svelte-sonner';

	let { homeWeightUnit }: { homeWeightUnit: WeightUnit } = $props();
	let selected = $state(homeWeightUnit);

	async function save(unit: MassUnit) {
		selected = unit;
		try {
			await trpc().users.updateUserSettings.mutate({ homeWeightUnit: unit });
			await invalidate('settings:userSettings');
		} catch (error) {
			console.error('Failed to update settings:', error);
			toast.error('Failed to update settings');
		}
	}
</script>

<Card.Root class="w-full">
	<Card.Header>
		<Card.Title>Home unit</Card.Title>
		<Card.Description>
			Used for bodyweight, charts and stats. Each routine can still use kg, lb, or ask at the start of a workout.
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<ToggleGroup.Root
			aria-label="Home unit"
			class="justify-start"
			onValueChange={(value) => {
				if (value === 'KG' || value === 'LB') save(value);
			}}
			type="single"
			value={selected}
			variant="outline"
		>
			<ToggleGroup.Item aria-label="Home unit kilograms" value="KG">kg</ToggleGroup.Item>
			<ToggleGroup.Item aria-label="Home unit pounds" value="LB">lb</ToggleGroup.Item>
		</ToggleGroup.Root>
	</Card.Content>
</Card.Root>
