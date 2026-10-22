<script lang="ts">
	import { trpc } from '$lib/trpc/client';
	import { sundayWeek, sundayWeekDay } from '$lib/utils/stats';
	import { onMount } from 'svelte';
	import H3 from '$lib/components/ui/typography/H3.svelte';
	import { SECTION_HEADING } from '../sectionHeading';
	import CheckIcon from 'virtual:icons/lucide/check';

	const letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
	const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	// This week on the phone's calendar, worked out once the page is on the phone: the server's clock
	// and time zone aren't the phone's, so the page drawn on the server shows the strip without days. A
	// page left open past Saturday shows last week until it's opened again
	let week: ReturnType<typeof sundayWeek> | null = $state(null);
	let today = $state(0);
	// Days (0 = Sunday) with a workout; none until they've loaded, or if they can't be
	let doneDays: Set<number> = $state(new Set());

	onMount(async () => {
		const now = new Date();
		const thisWeek = sundayWeek(now);
		week = thisWeek;
		today = now.getDay();
		try {
			const times = await trpc().stats.weekWorkoutTimes.query({ from: thisWeek.from, to: thisWeek.to });
			doneDays = new Set(
				times.map((at) => sundayWeekDay(new Date(at), thisWeek)).filter((day): day is number => day !== null)
			);
		} catch {
			// Just the week, without checks
		}
	});
</script>

<div class="mb-6" data-testid="week-strip">
	<H3 class={SECTION_HEADING}>This week</H3>
	<div class="rounded-lg border bg-card px-2 py-2">
		{#if week}
			<div class="grid grid-cols-7">
				{#each week.days as day, idx}
					{@const done = doneDays.has(idx)}
					{@const isToday = idx === today}
					<div
						class="flex flex-col items-center gap-0.5"
						aria-label="{names[idx]} {day.getDate()}{done ? ', workout done' : ''}{isToday ? ', today' : ''}"
						data-done={done}
						data-testid="week-day-{idx}"
						data-today={isToday}
						role="img"
					>
						<span class="text-[11px] {isToday ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'}">
							{letters[idx]}
						</span>
						{#if done}
							<span class="flex h-7 w-7 items-center justify-center rounded-full bg-green-600 text-white">
								<CheckIcon class="h-4 w-4" />
							</span>
						{:else}
							<span
								class="flex h-7 w-7 items-center justify-center rounded-full text-xs text-muted-foreground {isToday
									? 'border-2 border-primary'
									: 'border'} {idx > today ? 'opacity-50' : ''}"
							>
								{day.getDate()}
							</span>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<!-- Same height as the days, so nothing moves when they appear -->
			<div class="h-12"></div>
		{/if}
	</div>
</div>
