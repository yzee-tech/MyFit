<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Button } from '../button';
	import ChartIcon from 'virtual:icons/lucide/bar-chart-big';
	import TextIcon from 'virtual:icons/lucide/text';

	type PropsType = {
		showChartIcon?: boolean;
		chartMode?: boolean;
		children: Snippet;
		/** A button at the right end of the heading, e.g. Hide calendar */
		action?: Snippet;
	};
	let { showChartIcon = false, children, action, chartMode = $bindable(false) }: PropsType = $props();
</script>

<h2
	class="mb-4 flex h-10 scroll-m-20 items-end justify-between gap-2 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0"
>
	{@render children()}
	{@render action?.()}
	{#if showChartIcon}
		<!-- Labelled, so the charts are easy to find -->
		<Button class="shrink-0 gap-1.5" onclick={() => (chartMode = !chartMode)} size="sm" variant="outline">
			{#if !chartMode}
				<ChartIcon class="h-4 w-4" /> Stats
			{:else}
				<TextIcon class="h-4 w-4" /> Details
			{/if}
		</Button>
	{/if}
</h2>
