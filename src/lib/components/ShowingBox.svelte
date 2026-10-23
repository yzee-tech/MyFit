<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';

	type PropsType = {
		/** What the list is limited to, e.g. "Fri, Oct 16" or "Oct 1 – 19" */
		showing: string;
		/** A second, smaller line (pickHint), if any */
		hint?: string | null;
		/** Show all: clears the days picked (and anything waiting) or the filters */
		onClear: () => void;
	};
	let { showing, hint = null, onClear }: PropsType = $props();
</script>

<div class="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1 text-sm" data-testid="showing">
	<div class="flex min-w-0 flex-col">
		<span class="truncate">Showing <span class="font-semibold">{showing}</span></span>
		{#if hint}
			<span class="text-xs text-muted-foreground" data-testid="calendar-hint">{hint}</span>
		{/if}
	</div>
	<Button class="h-7 shrink-0 px-1" onclick={onClear} variant="link">Show all ✕</Button>
</div>
