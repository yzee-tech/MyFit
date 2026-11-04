<script lang="ts">
	import RoutineCard from '$lib/components/mesocycleAndExerciseSplit/RoutineCard.svelte';
	import type { RouterOutputs } from '$lib/trpc/router';

	let { mesocycle }: { mesocycle: NonNullable<RouterOutputs['mesocycles']['findById']> } = $props();

	// Read-only, like My routines' cards without their menu: a mesocycle that isn't finished uses My routines,
	// edited there (each opened routine has its Edit button)
	const routines = mesocycle.routines ?? [];
	/** Routines showing their exercises: none to start with */
	let shown: string[] = $state([]);

	function toggleShown(name: string) {
		shown = shown.includes(name) ? shown.filter((other) => other !== name) : [...shown, name];
	}
</script>

{#if routines.length > 0}
	<div class="flex flex-col gap-2 overflow-y-auto pb-2">
		{#each routines as routine (routine.id)}
			<RoutineCard
				editHref="/exercise-splits/edit?routine={encodeURIComponent(routine.name)}"
				{routine}
				ontoggle={() => toggleShown(routine.name)}
				shown={shown.includes(routine.name)}
			/>
		{/each}
	</div>
{:else}
	<div class="muted-text-box">
		No routines yet. Create them in <a class="underline" href="/exercise-splits">My routines</a>, or train with a blank
		workout.
	</div>
{/if}
