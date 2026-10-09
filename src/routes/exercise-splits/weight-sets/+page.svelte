<script lang="ts">
	import { page } from '$app/stores';
	import WeightSets from '$lib/components/settings/WeightSets.svelte';
	import { pickableWeightSets } from '$lib/utils/weightSets';
	import BackIcon from 'virtual:icons/lucide/chevron-left';

	// From a routine being edited: back to it (its edits are kept); from Exercises: back there; else
	// to My routines
	let back = $derived.by(() => {
		const from = $page.url.searchParams.get('back');
		if (from?.startsWith('/exercise-splits/edit')) return { href: from, label: 'Back to the routine' };
		if (from === '/exercises') return { href: from, label: 'Exercises' };
		return { href: '/exercise-splits', label: 'My routines' };
	});
</script>

<!-- Set up once per gym, then picked for exercises in My routines: so it lives with them -->
<a
	class="mb-2 flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline"
	href={back.href}
>
	<BackIcon class="h-4 w-4" />
	{back.label}
</a>
<h2 class="mb-1 text-3xl font-semibold tracking-tight">Weight sets</h2>
<p class="mb-4 text-sm text-muted-foreground">
	Dumbbells, plates or a machine's settings at a gym. Exercises using one get suggestions that match the weights it has.
	A machine that shows levels has them set on its exercise instead.
</p>
<WeightSets homeWeightUnit={$page.data.homeWeightUnit} weightSets={pickableWeightSets($page.data.weightSets ?? [])} />
