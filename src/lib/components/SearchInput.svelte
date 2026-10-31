<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { Input } from '$lib/components/ui/input';
	import { cn } from '$lib/utils';
	import XIcon from 'virtual:icons/lucide/x';

	type PropsType = Omit<HTMLInputAttributes, 'value' | 'class'> & {
		value?: string;
		class?: string;
		/** Runs after the box is emptied, e.g. to drop the search from the link */
		onclear?: () => void | Promise<void>;
	};
	let { value = $bindable(''), onclear, class: className, ...rest }: PropsType = $props();
	let wrapper: HTMLDivElement | undefined = $state();

	function clear() {
		value = '';
		onclear?.();
		// So the next name can be typed straight away
		wrapper?.querySelector('input')?.focus();
	}
</script>

<div bind:this={wrapper} class={cn('relative grow', className)}>
	<!-- Room for the button always, so the text doesn't shift when it appears. The browser's own clear button on a type="search" box is hidden -->
	<Input class="pr-10 [&::-webkit-search-cancel-button]:hidden" bind:value {...rest} />
	{#if value}
		<button
			class="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
			aria-label="Clear search"
			onclick={clear}
			onmousedown={(event) => event.preventDefault()}
			type="button"
		>
			<XIcon class="h-4 w-4" />
		</button>
	{/if}
</div>
