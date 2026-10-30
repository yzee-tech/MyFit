<script lang="ts">
	import { setTypeLabel } from '$lib/utils/setTypes';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import { convertCamelCaseToNormal } from '$lib/utils';
	import type { Prisma } from '@prisma/client';
	import MiniSetIcon from 'virtual:icons/lucide/arrow-down-right';
	import { fromKg, isLevelUnit, loadLabel, roundWeight } from '$lib/utils/weightUnits';
	import { page } from '$app/stores';
	import { intervalsLabel, isCardioMeasure, savedRowMeasure } from '$lib/utils/measure';
	import { distanceUnitLabel, formatDuration, formatPace, fromMeters, roundDistance } from '$lib/utils/distanceUnits';

	type PropsType = {
		exercise: Prisma.WorkoutExerciseGetPayload<{
			include: { sets: { include: { miniSets: true } } };
		}>;
		date?: Date;
	};
	let { exercise, date }: PropsType = $props();

	// Stored in kg; shown in the unit the weights were lifted in
	const showLoad = (kg: number) => roundWeight(fromKg(kg, exercise.weightUnit));

	// A cardio row shows what it logged: its time, its distance (in the exercise's unit now) and, on a
	// machine with levels, its level; never its zero-filled reps, weight and RIR
	let measure = $derived(savedRowMeasure(exercise.name, exercise.sets, $page.data.cardioExercises));
	let isCardio = $derived(isCardioMeasure(measure.measure));
	let isDistance = $derived(measure.measure === 'DistanceTime');
	let distanceUnit = $derived(measure.distanceUnit ?? 'KM');
	let isLevels = $derived(isLevelUnit(exercise.weightUnit));
	const showDistance = (meters: number | null) =>
		meters === null ? '–' : roundDistance(fromMeters(meters, distanceUnit)).toString();
	const showTime = (seconds: number | null) => (seconds === null ? '–' : formatDuration(seconds));
	let cardioColumns = $derived((isLevels ? 1 : 0) + (isDistance ? 2 : 1));
</script>

<div class="flex flex-col gap-0.5 rounded-md border bg-card/50 p-2 backdrop-blur-sm">
	<div class="flex items-center justify-between">
		<span class="truncate">{exercise.name}</span>
		{#if date}
			<span class="text-sm text-muted-foreground">
				{new Date(date).toLocaleDateString()}
			</span>
		{/if}
	</div>
	<div class="flex items-center gap-0.5">
		<span class="mr-auto text-sm lowercase text-muted-foreground">
			{#if isCardio}
				{intervalsLabel(exercise.sets.length)}
			{:else}
				{exercise.sets.length}
				{setTypeLabel(exercise.setType)} sets of
				{exercise.repRangeStart} to {exercise.repRangeEnd} reps
			{/if}
		</span>
		{#if exercise.bodyweightFraction && !isLevelUnit(exercise.weightUnit) && !isCardio}
			<Badge variant="outline">BW</Badge>
		{/if}
		<Badge class="whitespace-nowrap" variant="secondary">
			{exercise.targetMuscleGroup === 'Custom'
				? exercise.customMuscleGroup
				: convertCamelCaseToNormal(exercise.targetMuscleGroup)}
		</Badge>
	</div>
	{#if exercise.exerciseNote}
		<div class="mt-1 flex items-center bg-secondary px-1 py-0.5 text-sm" data-testid="{exercise.name}-exercise-note">
			{exercise.exerciseNote}
		</div>
	{/if}
	{#if exercise.note}
		<div class="mt-1 flex items-center bg-secondary/60 px-1 py-0.5 text-sm" data-testid="{exercise.name}-routine-note">
			{exercise.note}
		</div>
	{/if}
	{#if isCardio}
		<Table.Root class="mt-1" data-testid="{exercise.name}-cardio-sets">
			<Table.Header>
				<Table.Row class="h-2 border-none bg-secondary">
					<Table.Head class="h-7 w-5"></Table.Head>
					<!-- Same order as the workout screen: level, distance, time -->
					{#if isLevels}
						<Table.Head class="h-7 text-center text-foreground">Level</Table.Head>
					{/if}
					{#if isDistance}
						<Table.Head class="h-7 text-center text-foreground">{distanceUnitLabel(distanceUnit)}</Table.Head>
					{/if}
					<Table.Head class="h-7 text-center text-foreground">Time</Table.Head>
					{#if isDistance}
						<Table.Head class="h-7 text-center text-foreground">Pace</Table.Head>
					{/if}
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each exercise.sets as set}
					<Table.Row class="border-none">
						<Table.Cell class="px-1 py-1.5 font-medium">{set.setIndex + 1}</Table.Cell>
						{#if !set.skipped}
							{#if isLevels}
								<Table.Cell class="px-1 py-1.5 text-center font-light">{showLoad(set.load)}</Table.Cell>
							{/if}
							{#if isDistance}
								<Table.Cell class="px-1 py-1.5 text-center font-light">{showDistance(set.distanceMeters)}</Table.Cell>
							{/if}
							<Table.Cell class="px-1 py-1.5 text-center font-light">{showTime(set.timeSeconds)}</Table.Cell>
							{#if isDistance}
								<Table.Cell class="px-1 py-1.5 text-center font-light">
									{formatPace(set.timeSeconds, set.distanceMeters, distanceUnit) ?? '–'}
								</Table.Cell>
							{/if}
						{:else}
							<Table.Cell
								colspan={cardioColumns + (isDistance ? 1 : 0)}
								class="px-1 py-1.5 text-center italic text-muted-foreground"
							>
								<span>uncompleted</span>
							</Table.Cell>
						{/if}
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	{:else}
		<Table.Root class="mt-1">
			<Table.Header>
				<Table.Row class="h-2 border-none bg-secondary">
					<Table.Head class="h-7 w-5"></Table.Head>
					<!-- Same order as the workout screen: weight, reps, RIR -->
					<Table.Head class="h-7 text-center text-foreground">{loadLabel(exercise.weightUnit)}</Table.Head>
					<Table.Head class="h-7 text-center text-foreground">Reps</Table.Head>
					<Table.Head class="h-7 text-center text-foreground">RIR</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each exercise.sets as set}
					<Table.Row class="border-none">
						<Table.Cell class="px-1 py-1.5 font-medium">{set.setIndex + 1}</Table.Cell>
						{#if !set.skipped}
							<Table.Cell class="px-1 py-1.5 text-center font-light">{showLoad(set.load)}</Table.Cell>
							<Table.Cell class="px-1 py-1.5 text-center font-light">{set.reps}</Table.Cell>
							<Table.Cell class="px-1 py-1.5 text-center font-light">{set.RIR}</Table.Cell>
						{:else}
							<Table.Cell colspan={3} class="px-1 py-1.5 text-center italic text-muted-foreground">
								<span>uncompleted</span>
							</Table.Cell>
						{/if}
					</Table.Row>
					{#each set.miniSets as miniSet}
						<Table.Row class="border-none bg-muted/50">
							<Table.Cell class="flex items-center px-1 py-1.5 font-medium">
								<MiniSetIcon />
								{miniSet.miniSetIndex + 1}
							</Table.Cell>
							<Table.Cell class="px-1 py-1.5 text-center font-light">{showLoad(miniSet.load)}</Table.Cell>
							<Table.Cell class="px-1 py-1.5 text-center font-light">{miniSet.reps}</Table.Cell>
							<Table.Cell class="px-1 py-1.5 text-center font-light">{miniSet.RIR}</Table.Cell>
						</Table.Row>
					{/each}
				{/each}
			</Table.Body>
		</Table.Root>
	{/if}
</div>
