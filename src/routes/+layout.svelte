<script lang="ts">
	import { Toaster } from '$lib/components/ui/sonner';
	import { ModeWatcher } from 'mode-watcher';
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { updated } from '$app/stores';
	import { pwaInfo } from 'virtual:pwa-info';
	import '../app.pcss';
	import DesktopLayout from './(components)/layout/DesktopLayout.svelte';
	import MobileLayout from './(components)/layout/MobileLayout.svelte';
	import UpdateDataLossDialog from './(components)/layout/UpdateDataLossDialog.svelte';
	import TermsOfServiceDialog from '$lib/components/TermsOfServiceDialog.svelte';
	import WorkoutPanel from '$lib/components/workouts/WorkoutPanel.svelte';

	import { overrideItemIdKeyNameBeforeInitialisingDndZones } from 'svelte-dnd-action';
	overrideItemIdKeyNameBeforeInitialisingDndZones('name');

	const { children } = $props();
	const webManifestLink = pwaInfo ? pwaInfo.webManifest.linkTag : '';
	let isMobile: undefined | boolean = $state(undefined);

	// A newer version is live: once a page change has gone through (guards included), reload into it.
	// A plain reload keeps everything saved on this device, like a workout in progress: this must
	// never clear storage (that's only the old "Update app" dialog, which keeps the workout too)
	afterNavigate(({ type }) => {
		if (type !== 'enter' && $updated) location.reload();
	});

	onMount(() => {
		isMobile = window.innerWidth < 1024;
		window.addEventListener('resize', () => {
			isMobile = window.innerWidth < 1024;
		});
	});
</script>

<svelte:head>
	<!-- eslint-disable -->
	{@html webManifestLink}
</svelte:head>

<ModeWatcher />
<Toaster />

<UpdateDataLossDialog />
<TermsOfServiceDialog />

{#snippet footer()}
	<WorkoutPanel />
{/snippet}

{#if isMobile === true}
	<MobileLayout {footer}>{@render children()}</MobileLayout>
{:else if isMobile === false}
	<DesktopLayout {footer}>{@render children()}</DesktopLayout>
{/if}
