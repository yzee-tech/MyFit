<svelte:options runes={true} />

<script lang="ts">
	import { formatRoutineCount } from '$lib/utils/mesocycleUtils';
	import H2 from '$lib/components/ui/typography/H2.svelte';
	import H3 from '$lib/components/ui/typography/H3.svelte';
	import ExternalLink from 'virtual:icons/lucide/external-link';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { exerciseSplitTemplates } from '$lib/common/exerciseSplitTemplates';
	import { addedMessage, addToMyRoutines, type FullExerciseSplitWithoutIdsOrIndex } from '../myRoutines';
	import { goto, invalidate } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { TRPCClientError } from '@trpc/client';

	let adding = $state(false);

	/** The template's routines go straight into My routines, after the ones there ("(2)" for a taken name) */
	async function addTemplate(exerciseSplit: FullExerciseSplitWithoutIdsOrIndex) {
		if (adding) return;
		adding = true;
		try {
			const count = await addToMyRoutines(exerciseSplit.exerciseSplitDays);
			toast.success(addedMessage(count));
			await invalidate('exerciseSplits:all');
			await goto('/exercise-splits');
		} catch (error) {
			toast.error(error instanceof TRPCClientError ? error.message : "Couldn't add the template, try again");
		}
		adding = false;
	}
</script>

<H2>Templates</H2>
<H3>Add a template’s routines to My routines</H3>

{#each exerciseSplitTemplates as { description, exerciseSplit }}
	<Button
		class="mb-1 flex h-fit flex-col rounded-md border bg-card p-2"
		disabled={adding}
		onclick={() => addTemplate(exerciseSplit)}
		variant="outline"
	>
		<div class="pointer-events-none flex w-full items-center justify-between">
			<span class="text-lg font-semibold">{exerciseSplit.name}</span>
			<Badge>{formatRoutineCount(exerciseSplit.exerciseSplitDays)}</Badge>
		</div>
		<span class="pointer-events-none w-full text-wrap text-left text-muted-foreground">
			{description}
		</span>
	</Button>
{/each}

<Button variant="secondary" class="gap-2" href="https://github.com/WhyAsh5114/MyFit/discussions/173" target="_blank">
	Community-made splits <ExternalLink />
</Button>
