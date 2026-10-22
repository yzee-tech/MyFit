<script lang="ts">
	import H2 from '$lib/components/ui/typography/H2.svelte';
	import H3 from '$lib/components/ui/typography/H3.svelte';
	import type { RouterOutputs } from '$lib/trpc/router';
	import { onMount } from 'svelte';
	import GetStartedComponent from './(components)/GetStartedComponent.svelte';
	import TodaysWorkoutCard from './(components)/TodaysWorkoutCard.svelte';
	import WeekStrip from './(components)/WeekStrip.svelte';
	import { SECTION_HEADING } from './sectionHeading';

	let { data } = $props();
	let entityCounts: RouterOutputs['users']['getEntityCounts'] | undefined = $state(undefined);

	onMount(async () => {
		if (data.entityCounts === undefined) {
			entityCounts = null;
			return;
		}
		entityCounts = await data.entityCounts;
	});
</script>

<H2>Dashboard</H2>
<!-- Get started first while it isn't done, then the week, then the block -->
<GetStartedComponent {entityCounts} />
<WeekStrip />

<H3 class={SECTION_HEADING}>Active mesocycle block</H3>
<TodaysWorkoutCard {...data} />
