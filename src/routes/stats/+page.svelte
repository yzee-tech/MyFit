<script lang="ts">
	import { page } from '$app/stores';
	import * as Tabs from '$lib/components/ui/tabs';
	import H2 from '$lib/components/ui/typography/H2.svelte';
	import ExerciseStats from './ExerciseStats.svelte';
	import StatsOverview from './(components)/StatsOverview.svelte';

	let { data } = $props();

	// A link to an exercise's stats (or ?tab=exercises) opens the Exercises tab; else the overview
	const params = $page.url.searchParams;
	let tab = $state(params.has('exercise') || params.get('tab') === 'exercises' ? 'exercises' : 'overview');
</script>

<H2>Stats</H2>

<Tabs.Root class="flex w-full grow flex-col" bind:value={tab}>
	<Tabs.List class="mb-2 grid grid-cols-2">
		<Tabs.Trigger value="overview">Overview</Tabs.Trigger>
		<Tabs.Trigger value="exercises">Exercises</Tabs.Trigger>
	</Tabs.List>
	<Tabs.Content value="overview">
		<StatsOverview />
	</Tabs.Content>
	<Tabs.Content value="exercises">
		<ExerciseStats {data} />
	</Tabs.Content>
</Tabs.Root>
