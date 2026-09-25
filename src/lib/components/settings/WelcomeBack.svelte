<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { trpc } from '$lib/trpc/client';
	import { toast } from 'svelte-sonner';

	type PropsType = { welcomeBackEnabled: boolean; welcomeBackAfterDays: number };
	let props: PropsType = $props();

	let enabled = $state(props.welcomeBackEnabled);
	let afterDays = $state(props.welcomeBackAfterDays);

	async function save(update: Partial<PropsType>) {
		try {
			await trpc().users.updateUserSettings.mutate(update);
		} catch (error) {
			console.error('Failed to update settings:', error);
			toast.error('Failed to update settings');
		}
	}
</script>

<Card.Root class="w-full">
	<Card.Header>
		<Card.Title>Welcome back</Card.Title>
		<Card.Description>
			After a break from training, the next workout repeats your last numbers with 1 extra rep in reserve, instead of
			trying to beat them.
		</Card.Description>
	</Card.Header>
	<Card.Content class="grid gap-4">
		<div class="flex items-center justify-between gap-4 rounded-md border p-4">
			<Label for="welcome-back-enabled">Take it easy after a break</Label>
			<Switch
				id="welcome-back-enabled"
				bind:checked={enabled}
				onCheckedChange={(checked) => save({ welcomeBackEnabled: checked })}
			/>
		</div>
		<div class="flex items-center justify-between gap-4 rounded-md border p-4">
			<Label for="welcome-back-after-days">Days without a workout</Label>
			<Input
				id="welcome-back-after-days"
				class="w-20"
				disabled={!enabled}
				max={60}
				min={1}
				onchange={() => {
					if (Number.isInteger(afterDays) && afterDays >= 1 && afterDays <= 60) {
						save({ welcomeBackAfterDays: afterDays });
					} else toast.error('Enter a number of days from 1 to 60');
				}}
				type="number"
				bind:value={afterDays}
			/>
		</div>
	</Card.Content>
</Card.Root>
