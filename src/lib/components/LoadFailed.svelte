<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';

	type PropsType = {
		/** What didn't load, e.g. "your exercises" */
		what: string;
		retry: () => void;
	};
	let { what, retry }: PropsType = $props();
</script>

<!-- A request that failed: said, with a way to try again (never a skeleton left for ever) -->
<div class="muted-text-box flex items-center justify-between gap-2 text-left" data-testid="load-failed">
	<span>Couldn't load {what}, check your connection</span>
	<Button onclick={retry} size="sm" variant="outline">Retry</Button>
</div>
