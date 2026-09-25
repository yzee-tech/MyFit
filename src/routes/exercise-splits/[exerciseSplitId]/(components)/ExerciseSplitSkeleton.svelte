<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
</script>

<div class="mb-4 flex flex-col gap-1 border-b pb-2">
	<Skeleton class="h-9 w-48 rounded-md" />
	<Skeleton class="h-4 w-36 rounded-md" />
</div>
<Skeleton class="h-10 w-full rounded-md" />
<div class="mt-2 flex flex-col gap-1">
	<Skeleton class="mb-1 h-6 w-32" />
	{#each Array(4) as _}
		<Skeleton class="h-24 w-full" />
	{/each}
</div>
