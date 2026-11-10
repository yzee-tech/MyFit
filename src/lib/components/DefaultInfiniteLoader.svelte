<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import InfiniteLoading, { type InfiniteEvent } from 'svelte-infinite-loading';
	import LoaderCircle from 'virtual:icons/lucide/loader-circle';

	type PropsType = {
		loadMore: (event: InfiniteEvent) => Promise<void>;
		identifier: unknown;
		entityPlural: string;
	};

	let { loadMore, identifier, entityPlural }: PropsType = $props();
</script>

<InfiniteLoading on:infinite={loadMore} {identifier}>
	<div class="flex items-center justify-center gap-2 py-2 text-muted-foreground" slot="noMore">
		<Separator class="w-20" />
		That's all
		<Separator class="w-20" />
	</div>
	<div class="muted-text-box text-left" slot="noResults">No {entityPlural} found</div>
	<!-- A request that failed: said, with a way to try again (never a spinner left turning) -->
	<div class="muted-text-box flex items-center justify-between gap-2 text-left" slot="error" let:attemptLoad>
		<span>Couldn't load {entityPlural}, check your connection</span>
		<Button onclick={attemptLoad} size="sm" variant="outline">Retry</Button>
	</div>
	<div slot="spinner">
		<LoaderCircle class="mx-auto my-2 animate-spin" />
	</div>
</InfiniteLoading>
