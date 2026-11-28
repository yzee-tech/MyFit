<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { cn } from '$lib/utils';
	import { onMount } from 'svelte';
	import DownloadIcon from 'virtual:icons/lucide/download';
	import UpdateIcon from 'virtual:icons/lucide/refresh-cw';
	import { needRefresh, updateDataLossDialog } from './PWAFunctions.svelte';

	let { isMobile }: { isMobile: boolean } = $props();

	// Not standard API yet: the install prompt the browser offers, which can be used once
	type InstallPrompt = Event & { prompt: () => Promise<unknown> | void };
	let deferredPrompt: InstallPrompt | null = null;
	let reloading = $state(false);
	let showInstallButton = $state(false);

	onMount(() => {
		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			deferredPrompt = e as InstallPrompt;
			showInstallButton = true;
		});
		window.addEventListener('appinstalled', () => {
			showInstallButton = false;
			deferredPrompt = null;
		});
	});

	/** Asks to install: the prompt is spent after that, so the button goes (the browser offers it again if it should) */
	function install() {
		const prompt = deferredPrompt;
		deferredPrompt = null;
		showInstallButton = false;
		prompt?.prompt();
	}

	function updateApplication() {
		updateDataLossDialog.open = true;
	}
</script>

{#if isMobile}
	{#if $needRefresh}
		<Button onclick={updateApplication} size="icon" variant="ghost">
			<UpdateIcon class={cn({ 'animate-spin': reloading })} />
		</Button>
	{:else if showInstallButton}
		<Button aria-label="Download" onclick={install} size="icon" variant="ghost">
			<DownloadIcon />
		</Button>
	{/if}
{:else}
	<div class="grow">
		{#if $needRefresh}
			<Button
				class="w-full gap-2 text-base"
				disabled={reloading}
				onclick={updateApplication}
				size="lg"
				variant="outline"
			>
				<UpdateIcon class={cn({ 'animate-spin': reloading })} />
				Reload
			</Button>
		{:else if showInstallButton}
			<Button class="w-full gap-2 text-base" aria-label="Download" onclick={install} size="lg" variant="outline">
				<DownloadIcon /> Download
			</Button>
		{/if}
	</div>
{/if}
