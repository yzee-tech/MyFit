<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { buttonVariants } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import DownloadIcon from 'virtual:icons/lucide/download';
</script>

<Card.Root class="w-full">
	<Card.Header>
		<Card.Title>Your data</Card.Title>
		<Card.Description>
			Download everything MyFit stores about you. Exports are read-only and can't be imported back.
		</Card.Description>
	</Card.Header>
	<Card.Content class="flex flex-col gap-2 sm:flex-row">
		<a class={cn(buttonVariants(), 'gap-2')} href="/settings/export?format=json" download>
			<DownloadIcon /> Download JSON
		</a>
		<a class={cn(buttonVariants({ variant: 'outline' }), 'gap-2')} href="/settings/export?format=csv" download>
			<DownloadIcon /> Download CSV
		</a>
	</Card.Content>
	<Card.Footer>
		<p class="text-sm text-muted-foreground">
			Reading the CSV: weights are always kg in <code>loadKg</code>; machine levels are separate in
			<code>machineLevel</code>. A negative load means an assisted machine helped you. Text that a spreadsheet could
			read as a formula is prefixed with a single quote so it opens as text; the JSON keeps the original.
		</p>
	</Card.Footer>
</Card.Root>
