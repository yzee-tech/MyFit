<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	let { class: className = undefined, children }: { class?: string; children: Snippet } = $props();
</script>

<h3 class={cn('-mt-2 mb-4 scroll-m-20 text-2xl font-semibold tracking-tight', className)}>
	{@render children()}
</h3>
