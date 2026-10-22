<script lang="ts">
	import {
		addMonths,
		compareMonths,
		localDayKey,
		monthStart,
		parseLocalDay,
		type CalendarMonth
	} from '$lib/utils/calendarDays';
	import ChevronLeftIcon from 'virtual:icons/lucide/chevron-left';
	import ChevronRightIcon from 'virtual:icons/lucide/chevron-right';

	type PropsType = {
		/** The month shown; null until it's known on the phone (a same-size placeholder until then) */
		month: CalendarMonth | null;
		/** Workouts done, by local day (YYYY-MM-DD): their short names (calendarDayNames) */
		days: Map<string, string[]>;
		/** The days picked (YYYY-MM-DD, first and last), if any */
		picked: { from: string; to: string } | null;
		onMonthChange: (month: CalendarMonth) => void;
		/** A day (from = to), a range, or null to clear */
		onPick: (picked: { from: string; to: string } | null) => void;
		minMonth?: CalendarMonth;
		maxMonth?: CalendarMonth;
	};
	let { month, days, picked, onMonthChange, onPick, minMonth, maxMonth }: PropsType = $props();

	const letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
	// Long enough not to fire on a quick tap or the start of a scroll
	const HOLD_MS = 450;
	const HOLD_MOVE_PX = 10;

	// Six weeks always, so the calendar is the same height every month (and as its placeholder)
	let cells = $derived.by(() => {
		if (!month) return Array.from({ length: 42 }, () => null);
		const first = monthStart(month);
		const daysInMonth = new Date(month.year, month.month + 1, 0).getDate();
		return Array.from({ length: 42 }, (_, idx) => {
			const day = idx - first.getDay() + 1;
			return day >= 1 && day <= daysInMonth ? new Date(month.year, month.month, day) : null;
		});
	});
	let title = $derived(
		month ? monthStart(month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : ''
	);
	let canGoBack = $derived(!!month && (!minMonth || compareMonths(month, minMonth) > 0));
	let canGoForward = $derived(!!month && (!maxMonth || compareMonths(month, maxMonth) < 0));
	let todayKey = $state('');
	$effect(() => {
		todayKey = localDayKey(new Date());
	});

	// Held to start a range: the next tap picks its other end
	let rangeStart: string | null = $state(null);
	let holdTimer: ReturnType<typeof setTimeout> | undefined;
	let holdFrom: { x: number; y: number } | null = null;
	let held = false;

	function pointerDown(event: PointerEvent, key: string) {
		held = false;
		holdFrom = { x: event.clientX, y: event.clientY };
		clearTimeout(holdTimer);
		holdTimer = setTimeout(() => {
			held = true;
			rangeStart = key;
		}, HOLD_MS);
	}
	function pointerMove(event: PointerEvent) {
		if (!holdFrom) return;
		if (Math.hypot(event.clientX - holdFrom.x, event.clientY - holdFrom.y) > HOLD_MOVE_PX) cancelHold();
	}
	function cancelHold() {
		clearTimeout(holdTimer);
		holdFrom = null;
	}

	function tap(key: string) {
		cancelHold();
		// The hold itself already started the range
		if (held) {
			held = false;
			return;
		}
		if (rangeStart) {
			// In either order; the same day again is just that day
			const [from, to] = [rangeStart, key].sort();
			rangeStart = null;
			onPick({ from, to });
			return;
		}
		// The day picked, tapped again: cleared
		if (picked && picked.from === key && picked.to === key) onPick(null);
		else onPick({ from: key, to: key });
	}

	const inPick = (key: string) => !!picked && key >= picked.from && key <= picked.to;
	const isEnd = (key: string) => !!picked && (key === picked.from || key === picked.to);

	function label(date: Date, names: string[] | undefined) {
		const day = date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
		return names?.length ? `${day}, ${names.join(', ')}` : day;
	}
</script>

<div class="rounded-lg border bg-card px-1.5 pb-0.5 pt-1.5" data-testid="workout-calendar">
	<div class="mb-1 flex items-center justify-between">
		<button
			class="flex h-7 w-7 items-center justify-center rounded-md border disabled:opacity-30"
			aria-label="Previous month"
			disabled={!canGoBack}
			onclick={() => month && onMonthChange(addMonths(month, -1))}
			type="button"
		>
			<ChevronLeftIcon class="h-4 w-4" />
		</button>
		<span class="text-sm font-semibold" data-testid="calendar-month">{title}</span>
		<button
			class="flex h-7 w-7 items-center justify-center rounded-md border disabled:opacity-30"
			aria-label="Next month"
			disabled={!canGoForward}
			onclick={() => month && onMonthChange(addMonths(month, 1))}
			type="button"
		>
			<ChevronRightIcon class="h-4 w-4" />
		</button>
	</div>
	<div class="grid grid-cols-7">
		{#each letters as letter}
			<span class="pb-0.5 text-center text-[10px] text-muted-foreground">{letter}</span>
		{/each}
		{#each cells as date}
			{#if date}
				{@const key = localDayKey(date)}
				{@const names = days.get(key)}
				{@const done = !!names?.length}
				{@const isToday = key === todayKey}
				{@const isPicked = inPick(key)}
				<button
					class="flex select-none flex-col items-center border-t pb-px pt-[3px] [-webkit-touch-callout:none] {isPicked &&
					!isEnd(key)
						? 'bg-primary/10'
						: ''}"
					aria-label={label(date, names)}
					aria-pressed={isPicked}
					data-done={done}
					data-picked={isPicked}
					data-range-start={rangeStart === key}
					data-testid="calendar-day-{date.getDate()}"
					data-today={isToday}
					oncontextmenu={(event) => event.preventDefault()}
					onclick={() => tap(key)}
					onpointercancel={cancelHold}
					onpointerdown={(event) => pointerDown(event, key)}
					onpointerleave={cancelHold}
					onpointermove={pointerMove}
					type="button"
				>
					<span
						class="flex h-[26px] w-[26px] items-center justify-center rounded-full text-[12.5px]
						{done ? 'bg-primary font-semibold text-primary-foreground' : ''}
						{!done && isToday ? 'border-[1.5px] border-primary font-semibold' : ''}
						{isEnd(key) || rangeStart === key ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}"
					>
						{date.getDate()}
					</span>
					<span class="h-[11px] max-w-full truncate px-0.5 text-[8.5px] leading-[11px] text-muted-foreground">
						{#if names?.length}
							{names[0]}{names.length > 1 ? ` +${names.length - 1}` : ''}
						{/if}
					</span>
				</button>
			{:else}
				<span class="border-t pb-px pt-[3px]"
					><span class="block h-[26px]"></span><span class="block h-[11px]"></span></span
				>
			{/if}
		{/each}
	</div>
	<p class="py-1 text-center text-[11px] text-muted-foreground" data-testid="calendar-hint">
		{rangeStart
			? `From ${parseLocalDay(rangeStart)?.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: now tap the last day`
			: 'Hold a day to pick a range'}
	</p>
</div>
