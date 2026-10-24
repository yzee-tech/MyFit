<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Drawer from '$lib/components/ui/drawer/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { onMount, type Snippet } from 'svelte';

	type PropsType = {
		title: string;
		description?: Snippet;
		open: boolean;
		dismissible?: boolean;
		triggerButtonVariant?: Button['$$prop_def']['variant'];
		triggerButtonSize?: Button['$$prop_def']['size'];
		triggerButtonAriaLabel?: string;
		triggerButtonContent?: Snippet;
		cancelButtonVariant?: Button['$$prop_def']['variant'];
		/** A close button with this label on desktop too (the phone drawer always has one, "Cancel") */
		cancelLabel?: string;
		children?: Snippet;
		/** Content that can be taller than the screen (e.g. the exercise form): it scrolls inside, so its buttons
		 * stay reachable */
		long?: boolean;
	};

	let {
		title,
		description,
		open = $bindable(false),
		dismissible = true,
		triggerButtonVariant = 'outline',
		triggerButtonSize = 'default',
		triggerButtonAriaLabel = '',
		triggerButtonContent,
		cancelButtonVariant = 'outline',
		cancelLabel,
		children,
		long = false
	}: PropsType = $props();

	let isDesktop = $state(false);
	onMount(() => (isDesktop = window.matchMedia('(min-width: 768px)').matches));
</script>

{#if isDesktop}
	<Dialog.Root bind:open>
		{#if triggerButtonContent}
			<Dialog.Trigger asChild let:builder>
				<Button
					aria-label={triggerButtonAriaLabel}
					builders={[builder]}
					size={triggerButtonSize}
					variant={triggerButtonVariant}
				>
					{@render triggerButtonContent()}
				</Button>
			</Dialog.Trigger>
		{/if}
		<Dialog.Content class="sm:max-w-[425px] {long ? 'max-h-[90dvh] overflow-y-auto' : ''}">
			<Dialog.Header>
				<Dialog.Title>{title}</Dialog.Title>
				{#if description}
					<Dialog.Description>
						{@render description()}
					</Dialog.Description>
				{/if}
			</Dialog.Header>
			{#if children}
				{@render children()}
			{/if}
			{#if cancelLabel}
				<Button onclick={() => (open = false)} variant={cancelButtonVariant}>{cancelLabel}</Button>
			{/if}
		</Dialog.Content>
	</Dialog.Root>
{:else}
	<Drawer.Root {dismissible} bind:open>
		{#if triggerButtonContent}
			<Drawer.Trigger asChild let:builder>
				<Button
					aria-label={triggerButtonAriaLabel}
					builders={[builder]}
					size={triggerButtonSize}
					variant={triggerButtonVariant}
				>
					{@render triggerButtonContent()}
				</Button>
			</Drawer.Trigger>
		{/if}
		<Drawer.Content class="h-fit {long ? 'max-h-[92dvh]' : ''}">
			<Drawer.Header>
				<Drawer.Title>{title}</Drawer.Title>
				{#if description}
					<Drawer.Description>
						{@render description()}
					</Drawer.Description>
				{/if}
			</Drawer.Header>
			<div class="flex flex-col gap-2 px-4 {long ? 'min-h-0 overflow-y-auto' : ''}">
				{#if children}
					{@render children()}
				{/if}
			</div>
			<Drawer.Footer class="my-0 shrink pt-2">
				<Drawer.Close asChild let:builder>
					<Button builders={[builder]} variant={cancelButtonVariant}>{cancelLabel ?? 'Cancel'}</Button>
				</Drawer.Close>
			</Drawer.Footer>
		</Drawer.Content>
	</Drawer.Root>
{/if}
