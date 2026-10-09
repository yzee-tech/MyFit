<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { formatWorkoutLength, workoutMinutes } from '$lib/utils/workoutLength';
	import { fromKg, roundWeight, toKg, unitLabel } from '$lib/utils/weightUnits';
	import EditIcon from 'virtual:icons/lucide/pencil';
	import { workoutRunes } from '../../workoutRunes.svelte';

	/** Open from the start, e.g. from "check times?" */
	let { open = false }: { open?: boolean } = $props();
	let editing = $state(open);

	const homeUnit = $page.data.homeWeightUnit ?? 'KG';
	const pad = (value: number) => String(value).padStart(2, '0');
	const timeOf = (date: Date) => date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

	// A past workout's time as a date, a start time and a length; it's still kept as a start and end
	let details = $derived.by(() => {
		const startedAt = new Date(workoutRunes.workoutData?.startedAt ?? Date.now());
		const endedAt = new Date(workoutRunes.workoutData?.endedAt ?? startedAt);
		const bodyweight = workoutRunes.workoutData?.userBodyweight;
		return {
			startedAt,
			endedAt,
			date: `${startedAt.getFullYear()}-${pad(startedAt.getMonth() + 1)}-${pad(startedAt.getDate())}`,
			time: `${pad(startedAt.getHours())}:${pad(startedAt.getMinutes())}`,
			minutes: workoutMinutes(startedAt, endedAt),
			bodyweight: typeof bodyweight === 'number' ? roundWeight(fromKg(bodyweight, homeUnit)) : undefined,
			inFuture: startedAt.getTime() > Date.now()
		};
	});

	function setTime(change: { date?: string; time?: string; minutes?: number }) {
		if (!workoutRunes.workoutData) return;
		const startedAt = new Date(`${change.date ?? details.date}T${change.time ?? details.time}`);
		const minutes = change.minutes ?? details.minutes;
		// A cleared or half-typed box keeps what was there
		if (Number.isNaN(startedAt.getTime()) || !Number.isFinite(minutes)) return;
		// 0 is fine: a workout saved straight after it started
		const length = Math.min(Math.max(Math.round(minutes), 0), 600);
		workoutRunes.workoutData.startedAt = startedAt;
		workoutRunes.workoutData.endedAt = new Date(startedAt.getTime() + length * 60000);
		workoutRunes.saveStoresToLocalStorage();
	}

	function setBodyweight(value: number) {
		if (!workoutRunes.workoutData || !(value > 0)) return;
		workoutRunes.workoutData.userBodyweight = toKg(value, homeUnit);
		workoutRunes.saveStoresToLocalStorage();
	}
</script>

<div class="mb-2 rounded-lg border bg-card p-3" data-testid="edit-workout-details">
	{#if !editing}
		<div class="flex items-center gap-2">
			<div class="flex min-w-0 grow flex-col text-sm">
				<span class="font-medium" data-testid="edit-workout-summary">
					{details.startedAt.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
					· {timeOf(details.startedAt)}–{timeOf(details.endedAt)} · {formatWorkoutLength(
						details.startedAt,
						details.endedAt
					)}
				</span>
				<span class="text-muted-foreground">
					Bodyweight {details.bodyweight ?? '–'}
					{unitLabel(homeUnit)}
				</span>
			</div>
			<Button aria-label="Edit date, time and bodyweight" onclick={() => (editing = true)} size="icon" variant="ghost">
				<EditIcon />
			</Button>
		</div>
	{:else}
		<div class="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2">
			<Label for="workout-date">Date</Label>
			<Input
				id="workout-date"
				onchange={(e) => setTime({ date: e.currentTarget.value })}
				required
				type="date"
				value={details.date}
			/>
			<Label for="workout-start-time">Start time</Label>
			<Input
				id="workout-start-time"
				onchange={(e) => setTime({ time: e.currentTarget.value })}
				required
				type="time"
				value={details.time}
			/>
			<Label for="workout-length-minutes">Length (min)</Label>
			<Input
				id="workout-length-minutes"
				max={600}
				min={0}
				onchange={(e) => setTime({ minutes: e.currentTarget.valueAsNumber })}
				step={1}
				type="number"
				value={details.minutes}
			/>
			<span></span>
			<span class="text-sm text-muted-foreground" data-testid="workout-ended-at">Ended {timeOf(details.endedAt)}</span>
			<Label for="workout-bodyweight">Bodyweight ({unitLabel(homeUnit)})</Label>
			<Input
				id="workout-bodyweight"
				min={1}
				onchange={(e) => setBodyweight(e.currentTarget.valueAsNumber)}
				step={0.01}
				type="number"
				value={details.bodyweight}
			/>
		</div>
		{#if details.inFuture}
			<p class="mt-2 text-sm text-destructive" data-testid="workout-in-future">This is in the future</p>
		{/if}
		<div class="mt-2 flex justify-end">
			<Button onclick={() => (editing = false)} size="sm" variant="secondary">Done</Button>
		</div>
	{/if}
</div>
