<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
	import DownloadIcon from 'virtual:icons/lucide/download';
	import LoaderCircleIcon from 'virtual:icons/lucide/loader-circle';

	type Format = 'json' | 'csv';

	let downloading = $state<Format | null>(null);

	/** The server's refusals (413, 429) carry a plain-text reason; anything else gets a generic message */
	async function failureMessage(response: Response): Promise<string> {
		if (response.status === 413 || response.status === 429) {
			const text = (await response.text()).trim();
			if (text) return text;
		}
		if (response.status === 401) return 'Your session has expired. Sign in again to export.';
		return `The export failed (${response.status}). Try again in a moment.`;
	}

	async function download(format: Format) {
		if (downloading) return;
		downloading = format;
		try {
			const response = await fetch(`/settings/export?format=${format}`);
			if (!response.ok) {
				toast.error(await failureMessage(response));
				return;
			}
			const blob = await response.blob();
			const fileName =
				/filename="([^"]+)"/.exec(response.headers.get('Content-Disposition') ?? '')?.[1] ?? `myfit-export.${format}`;
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = fileName;
			document.body.appendChild(link);
			link.click();
			link.remove();
			setTimeout(() => URL.revokeObjectURL(url), 10_000);
		} catch {
			toast.error("Couldn't reach the server. Check your connection and try again.");
		} finally {
			downloading = null;
		}
	}
</script>

<Card.Root class="w-full">
	<Card.Header>
		<Card.Title>Your data</Card.Title>
		<Card.Description>
			Download everything MyFit stores about you. Exports are read-only and can't be imported back.
		</Card.Description>
	</Card.Header>
	<Card.Content class="flex flex-col gap-2 sm:flex-row">
		<Button class="gap-2" disabled={downloading !== null} onclick={() => download('json')}>
			{#if downloading === 'json'}<LoaderCircleIcon class="animate-spin" />{:else}<DownloadIcon />{/if}
			Download JSON
		</Button>
		<Button variant="outline" class="gap-2" disabled={downloading !== null} onclick={() => download('csv')}>
			{#if downloading === 'csv'}<LoaderCircleIcon class="animate-spin" />{:else}<DownloadIcon />{/if}
			Download CSV
		</Button>
	</Card.Content>
	<Card.Footer>
		<p class="text-sm text-muted-foreground">
			Reading the CSV: weights are always kg in <code>loadKg</code>; machine levels are separate in
			<code>machineLevel</code>. A negative load means an assisted machine helped you. <code>setIndex</code> counts sets
			from 0 and <code>setNumber</code> from 1. Text that a spreadsheet could read as a formula is prefixed with a single
			quote so it opens as text; the JSON keeps the original.
		</p>
	</Card.Footer>
</Card.Root>
