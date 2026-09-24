<script lang="ts">
	import { page } from '$app/stores';
	import ResponsiveDialog from '$lib/components/ResponsiveDialog.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import H2 from '$lib/components/ui/typography/H2.svelte';
	import type { RouterOutputs } from '$lib/trpc/router';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import MesocycleBasicsTab from './(components)/MesocycleBasicsTab.svelte';
	import MesocycleExerciseSplitStats from './(components)/MesocycleExerciseSplitStats.svelte';
	import MesocycleSkeleton from './(components)/MesocycleSkeleton.svelte';
	import MesocycleSplitTab from './(components)/MesocycleSplitTab.svelte';
	import MesocycleStats from './(components)/MesocycleStats.svelte';
	import MesocycleWorkoutsCharts from './(components)/MesocycleWorkoutsCharts.svelte';
	import MesocycleWorkoutsTab from './(components)/MesocycleWorkoutsTab.svelte';

	let { data } = $props();
	let mesocycle: NonNullable<RouterOutputs['mesocycles']['findById']> | 'loading' = $state('loading');
	let selectedTabValue = $state('basics');
	let chartMode = $state(false);
	const completion = $page.url.searchParams.has('completion');

	onMount(async () => {
		const serverMesocycle = await data.mesocycle;
		if (serverMesocycle) {
			mesocycle = serverMesocycle;
		} else {
			toast.error('Mesocycle not found');
		}
	});
</script>

<H2 showChartIcon bind:chartMode>View mesocycle</H2>

{#if mesocycle === 'loading'}
	<MesocycleSkeleton />
{:else}
	<Tabs.Root class="flex w-full grow flex-col" bind:value={selectedTabValue}>
		<Tabs.List class="grid grid-cols-3">
			<Tabs.Trigger value="basics">Basics</Tabs.Trigger>
			<Tabs.Trigger value="split">Routines</Tabs.Trigger>
			<Tabs.Trigger value="workouts">Workouts</Tabs.Trigger>
		</Tabs.List>
		<Tabs.Content value="basics">
			{#if !chartMode}
				<MesocycleBasicsTab {mesocycle} />
			{:else}
				<MesocycleStats {mesocycle} />
			{/if}
		</Tabs.Content>
		<Tabs.Content value="split">
			{#if !chartMode}
				<MesocycleSplitTab {mesocycle} />
			{:else}
				<MesocycleExerciseSplitStats
					splitExercises={mesocycle.mesocycleExerciseSplitDays.map((splitDay) => splitDay.mesocycleSplitDayExercises)}
				/>
			{/if}
		</Tabs.Content>
		<Tabs.Content class="grow" value="workouts">
			{#if !chartMode}
				<MesocycleWorkoutsTab {mesocycle} />
			{:else}
				<MesocycleWorkoutsCharts {mesocycle} />
			{/if}
		</Tabs.Content>
	</Tabs.Root>
{/if}

<ResponsiveDialog open={completion} title="Congratulations! 🎉">
	{#snippet description()}
		You have successfully completed this mesocycle
	{/snippet}
</ResponsiveDialog>
