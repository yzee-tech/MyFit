<script lang="ts">
	import { trpc } from '$lib/trpc/client';
	import { sundayWeek, sundayWeekDay } from '$lib/utils/stats';
	import { onMount } from 'svelte';
	import CheckIcon from 'virtual:icons/lucide/check';

	// This week on the phone's calendar, as the page opens (a page left open past Saturday shows last
	// week until it's opened again)
	const now = new Date();
	const week = sundayWeek(now);
	const today = now.getDay();
	const letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
	const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	// Days (0 = Sunday) with a workout; none until they've loaded, or if they can't be
	let doneDays: Set<number> = $state(new Set());
	let request = 0;

	onMount(async () => {
		const thisRequest = ++request;
		try {
			const times = await trpc().stats.weekWorkoutTimes.query({ from: week.from, to: week.to });
			// A newer request's answer wins
			if (thisRequest !== request) return;
			doneDays = new Set(
				times.map((at) => sundayWeekDay(new Date(at), week)).filter((day): day is number => day !== null)
			);
		} catch {
			// Just the week, without checks
		}
	});
</script>

<div class="mb-6 rounded-lg border bg-card px-2 py-2.5" data-testid="week-strip">
	<span class="mx-1 mb-2 block text-sm font-semibold">This week</span>
	<div class="grid grid-cols-7">
		{#each week.days as day, idx}
			{@const done = doneDays.has(idx)}
			{@const isToday = idx === today}
			<div
				class="flex flex-col items-center gap-1"
				aria-label="{names[idx]} {day.getDate()}{done ? ', workout done' : ''}{isToday ? ', today' : ''}"
				data-done={done}
				data-testid="week-day-{idx}"
				data-today={isToday}
				role="img"
			>
				<span class="text-xs {isToday ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'}">
					{letters[idx]}
				</span>
				{#if done}
					<span class="flex h-9 w-9 items-center justify-center rounded-full bg-green-600 text-white">
						<CheckIcon class="h-5 w-5" />
					</span>
				{:else}
					<span
						class="flex h-9 w-9 items-center justify-center rounded-full text-sm text-muted-foreground {isToday
							? 'border-2 border-primary'
							: 'border'} {idx > today ? 'opacity-50' : ''}"
					>
						{day.getDate()}
					</span>
				{/if}
			</div>
		{/each}
	</div>
</div>
