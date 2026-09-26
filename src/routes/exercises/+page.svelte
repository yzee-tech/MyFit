<script lang="ts">
	import ExerciseForm, { type ExerciseFormDetails } from '$lib/components/exercises/ExerciseForm.svelte';
	import ResponsiveDialog from '$lib/components/ResponsiveDialog.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import H2 from '$lib/components/ui/typography/H2.svelte';
	import { trpc } from '$lib/trpc/client';
	import type { RouterOutputs } from '$lib/trpc/router';
	import { convertCamelCaseToNormal } from '$lib/utils';
	import { goto } from '$app/navigation';
	import { TRPCClientError } from '@trpc/client';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import AddIcon from 'virtual:icons/lucide/plus';

	type ExerciseRow = RouterOutputs['exercises']['list'][number];

	let exercises = $state<ExerciseRow[] | 'loading'>('loading');
	let search = $state('');
	let newExerciseOpen = $state(false);

	onMount(async () => {
		exercises = await trpc().exercises.list.query();
	});

	const muscleGroupOf = (exercise: ExerciseRow) =>
		exercise.customMuscleGroup ?? convertCamelCaseToNormal(exercise.targetMuscleGroup);

	let filtered = $derived(
		exercises === 'loading'
			? []
			: exercises.filter((exercise) => exercise.name.toLowerCase().includes(search.trim().toLowerCase()))
	);
	let groups = $derived(
		Object.entries(
			Object.groupBy(
				filtered.filter((exercise) => !exercise.archived),
				muscleGroupOf
			)
		).sort(([a], [b]) => a.localeCompare(b))
	);
	let pastOnly = $derived(filtered.filter((exercise) => exercise.archived));

	function usage(exercise: ExerciseRow) {
		const parts: string[] = [];
		if (exercise.routineCount > 0) {
			parts.push(`${exercise.routineCount} ${exercise.routineCount === 1 ? 'routine' : 'routines'}`);
		}
		if (exercise.workoutCount > 0) {
			parts.push(`${exercise.workoutCount} ${exercise.workoutCount === 1 ? 'workout' : 'workouts'}`);
		}
		return parts.length > 0 ? parts.join(' · ') : 'Not in a routine yet';
	}

	async function createExercise(details: ExerciseFormDetails) {
		try {
			const created = await trpc().exercises.create.mutate(details);
			toast.success('Exercise created');
			newExerciseOpen = false;
			await goto(`/exercises/${created.id}`);
		} catch (error) {
			toast.error(error instanceof TRPCClientError ? error.message : 'Failed to create exercise');
		}
	}
</script>

<H2>Exercises</H2>

<div class="mb-2 flex gap-2">
	<Input aria-label="Search exercises" placeholder="Search" bind:value={search} />
	<ResponsiveDialog
		title="New exercise"
		triggerButtonAriaLabel="New exercise"
		triggerButtonVariant="default"
		bind:open={newExerciseOpen}
	>
		{#snippet triggerButtonContent()}
			<AddIcon /> New
		{/snippet}
		{#snippet description()}
			Its name, muscle group, bodyweight and note are the same in every routine. Sets and reps are set per routine.
		{/snippet}
		<ExerciseForm
			existingNames={exercises === 'loading' ? [] : exercises.map((exercise) => exercise.name)}
			onSubmit={createExercise}
			submitLabel="Create exercise"
		/>
	</ResponsiveDialog>
</div>

{#if exercises === 'loading'}
	<div class="flex flex-col gap-1">
		{#each Array(6) as _}
			<Skeleton class="h-14 w-full" />
		{/each}
	</div>
{:else if exercises.length === 0}
	<div class="rounded-md bg-muted/50 p-4 text-center text-sm text-muted-foreground">
		No exercises yet. Tap <span class="font-semibold">New</span> to create your first, then add it to routines.
	</div>
{:else}
	<div class="flex flex-col gap-4 overflow-y-auto pb-4">
		{#each groups as [group, groupExercises] (group)}
			<section>
				<h3 class="mb-1 text-sm font-semibold text-muted-foreground">{group}</h3>
				<ul class="flex flex-col gap-1">
					{#each groupExercises ?? [] as exercise (exercise.id)}
						<li>
							<a class="flex flex-col rounded-md border bg-card p-3 hover:bg-accent" href="/exercises/{exercise.id}">
								<span class="font-medium">{exercise.name}</span>
								<span class="text-sm text-muted-foreground">{usage(exercise)}</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/each}
		{#if pastOnly.length > 0}
			<section>
				<h3 class="mb-1 text-sm font-semibold text-muted-foreground">Only in past workouts</h3>
				<ul class="flex flex-col gap-1">
					{#each pastOnly as exercise (exercise.id)}
						<li>
							<a class="flex flex-col rounded-md border p-3 hover:bg-accent" href="/exercises/{exercise.id}">
								<span class="font-medium text-muted-foreground">{exercise.name}</span>
								<span class="text-sm text-muted-foreground">{usage(exercise)}</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
		{#if filtered.length === 0}
			<div class="rounded-md bg-muted/50 p-4 text-center text-sm text-muted-foreground">No exercises match</div>
		{/if}
	</div>
{/if}
