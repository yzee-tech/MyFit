<script lang="ts">
	import { page } from '$app/stores';
	import * as Card from '$lib/components/ui/card';
	import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte';
	import H2 from '$lib/components/ui/typography/H2.svelte';
	import WorkoutActivityGraph from './WorkoutActivityGraph.svelte';

	let { data } = $props();
	function formatNumber(num: number) {
		if (num >= 100000) {
			return (num / 1000).toFixed(0) + 'k';
		} else if (num >= 10000) {
			return (num / 1000).toFixed(1) + 'k';
		}
		return num.toString();
	}
</script>

<H2>Profile</H2>

<div class="mb-4 flex flex-col gap-4">
	<div class="flex flex-col">
		<span class="text-sm text-muted-foreground">Email</span>
		<span>{$page.data.session?.user?.email}</span>
	</div>

	<div class="flex flex-col">
		<span class="text-sm text-muted-foreground">Username</span>
		<span>{$page.data.session?.user?.name}</span>
	</div>
</div>

<div class="mb-4 grid grid-cols-3 gap-2">
	<Card.Root class="bg-background">
		<Card.Header class="flex p-4">
			<Card.Title class="text-center text-sm font-medium">Workouts</Card.Title>
		</Card.Header>
		<Card.Content class="p-4 pt-0 text-center text-2xl font-bold">
			{#await data.userCounts.workouts}
				<Skeleton class="h-8 w-full" />
			{:then userCounts}
				{formatNumber(userCounts)}
			{/await}
		</Card.Content>
	</Card.Root>
	<Card.Root class="bg-background">
		<Card.Header class="flex p-4">
			<Card.Title class="text-center text-sm font-medium">Exercises</Card.Title>
		</Card.Header>
		<Card.Content class="p-4 pt-0 text-center text-2xl font-bold">
			{#await data.userCounts.exercises}
				<Skeleton class="h-8 w-full" />
			{:then userCounts}
				{formatNumber(userCounts)}
			{/await}
		</Card.Content>
	</Card.Root>
	<Card.Root class="bg-background">
		<Card.Header class="flex p-4">
			<Card.Title class="text-center text-sm font-medium">Sets</Card.Title>
		</Card.Header>
		<Card.Content class="p-4 pt-0 text-center text-2xl font-bold">
			{#await data.userCounts.sets}
				<Skeleton class="h-8 w-full" />
			{:then userCounts}
				{formatNumber(userCounts)}
			{/await}
		</Card.Content>
	</Card.Root>
</div>

{#await data.workoutsForGraph}
	<Skeleton class="h-40 w-full" />
{:then workouts}
	<Card.Root class="mb-4 bg-background">
		<Card.Content class="p-4">
			<WorkoutActivityGraph {workouts} />
		</Card.Content>
	</Card.Root>
{/await}
