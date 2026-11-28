<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import type { Component } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import CheckIcon from 'virtual:icons/lucide/check';

	/**
	 * An icon button that turns a mode on and off (reordering, comparing). Off, it shows its own icon; on, it
	 * shows a tick in a blue ring: tap the tick to leave the mode. Label, disabled and the rest pass through
	 */
	type PropsType = HTMLButtonAttributes & {
		active: boolean;
		// An icon from virtual:icons: a component that draws an svg
		icon: Component;
	};
	let { active, icon: Icon, class: className, ...rest }: PropsType = $props();
</script>

<Button
	class={cn(
		active &&
			'border-2 border-primary bg-primary/15 text-primary hover:bg-primary/25 hover:text-primary dark:text-blue-300 dark:hover:text-blue-300',
		className
	)}
	size="icon"
	variant="outline"
	{...rest}
>
	{#if active}
		<CheckIcon />
	{:else}
		<Icon />
	{/if}
</Button>
