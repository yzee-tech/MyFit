<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import H2 from '$lib/components/ui/typography/H2.svelte';
	import H3 from '$lib/components/ui/typography/H3.svelte';
	import {
		ExerciseSplitCreateWithoutUserInputSchema,
		ExerciseSplitDayCreateWithoutExerciseSplitInputSchema,
		ExerciseTemplateCreateWithoutExerciseSplitDayInputSchema
	} from '$lib/zodSchemas';
	import { toast } from 'svelte-sonner';
	import { addedMessage, addToMyRoutines } from '../myRoutines';
	import { goto, invalidate } from '$app/navigation';
	import { TRPCClientError } from '@trpc/client';

	let splitFile = $state<File>();

	async function validateAndImportSplit() {
		if (!splitFile) return;

		try {
			const splitData = JSON.parse(await splitFile.text());

			const { exerciseSplitDays, ...split } = splitData;
			ExerciseSplitCreateWithoutUserInputSchema.parse(split);

			exerciseSplitDays.forEach((data: { [x: string]: unknown; exercises: unknown[] }) => {
				const { exercises, ...splitDay } = data;
				ExerciseSplitDayCreateWithoutExerciseSplitInputSchema.parse(splitDay);

				exercises.forEach((data) => {
					ExerciseTemplateCreateWithoutExerciseSplitDayInputSchema.parse(data);
				});
			});

			// The file's routines go straight into My routines, after the ones there ("(2)" for a taken name)
			const count = await addToMyRoutines(exerciseSplitDays);
			toast.success(addedMessage(count));
			await invalidate('exerciseSplits:all');
			await goto('/exercise-splits');
		} catch (error) {
			if (error instanceof TRPCClientError || error instanceof Error) {
				toast.error(error.message);
			}
		}
	}
</script>

<H2>Import</H2>
<H3>Add routines from a file to My routines</H3>

<div class="grid w-full items-center gap-1.5">
	<Label for="picture">Routines JSON file (exported from MyFit)</Label>
	<Input
		id="picture"
		type="file"
		accept=".json"
		onchange={(e) => {
			const file = e.currentTarget.files?.item(0);
			if (file) splitFile = file;
		}}
	/>
</div>

<Button class="mt-auto" onclick={validateAndImportSplit}>Import</Button>
