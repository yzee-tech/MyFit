<script lang="ts">
	import { page } from '$app/stores';
	import WeightSets from '$lib/components/settings/WeightSets.svelte';
	import BackIcon from 'virtual:icons/lucide/chevron-left';

	// From a routine being edited: back to it (its edits are kept), else to My routines
	let back = $derived.by(() => {
		const from = $page.url.searchParams.get('back');
		return from?.startsWith('/exercise-splits/edit') ? from : null;
	});
</script>

<!-- Set up once per gym, then picked for exercises in My routines: so it lives with them -->
<a
	class="mb-2 flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline"
	href={back ?? '/exercise-splits'}
>
	<BackIcon class="h-4 w-4" />
	{back ? 'Back to the routine' : 'My routines'}
</a>
<h2 class="mb-1 text-3xl font-semibold tracking-tight">Weight sets</h2>
<p class="mb-4 text-sm text-muted-foreground">
	Dumbbells, plates or a machine's settings at a gym. Exercises using one get suggestions that match the weights it has.
</p>
<WeightSets homeWeightUnit={$page.data.homeWeightUnit} weightSets={$page.data.weightSets} />
