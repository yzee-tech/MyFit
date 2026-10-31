<script lang="ts">
	import { Command as CommandPrimitive } from 'cmdk-sv';
	import Search from 'virtual:icons/lucide/search';
	import XIcon from 'virtual:icons/lucide/x';
	import { cn } from '$lib/utils.js';

	type $$Props = CommandPrimitive.InputProps & { class?: string | null | undefined; clearable?: boolean };

	let className: string | undefined | null = undefined;
	export { className as class };
	export let value: string = '';
	/** A button to empty the box; its room is kept when the box is empty, so nothing shifts */
	export let clearable = false;
	let wrapper: HTMLDivElement;

	function clear() {
		value = '';
		wrapper.querySelector('input')?.focus();
	}
</script>

<div bind:this={wrapper} class="flex items-center border-b px-2" data-cmdk-input-wrapper="">
	<Search class="mr-2 h-4 w-4 shrink-0 opacity-50" />
	<CommandPrimitive.Input
		class={cn(
			'flex h-11 w-full rounded-md bg-transparent py-3 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
			className
		)}
		{...$$restProps}
		bind:value
	/>
	{#if clearable}
		<button
			class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent {value
				? ''
				: 'invisible'}"
			aria-hidden={!value}
			aria-label="Clear search"
			disabled={!value}
			on:click={clear}
			on:mousedown|preventDefault
			tabindex={value ? 0 : -1}
			type="button"
		>
			<XIcon class="h-4 w-4" />
		</button>
	{/if}
</div>
