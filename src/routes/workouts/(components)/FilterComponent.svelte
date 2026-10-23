<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import * as Select from '$lib/components/ui/select';
	import type { RouterInputs, RouterOutputs } from '$lib/trpc/router';
	import { dateToCalendarDate } from '$lib/utils';
	import type { DateRange, Selected } from 'bits-ui';
	import { onMount } from 'svelte';
	import FilterIcon from 'virtual:icons/lucide/filter';
	import DateRangePicker from './DateRangePicker.svelte';

	type PropsType = {
		currentFilters: Exclude<RouterInputs['workouts']['load']['filters'], undefined>;
		filterData: NonNullable<RouterOutputs['workouts']['getFilterData']>;
		setFilters: (selectedDateRange: DateRange, selectedMesocycleIds: (string | null)[]) => void;
	};
	let { currentFilters, filterData, setFilters }: PropsType = $props();

	let open = $state(false);
	let selectedDateRange: DateRange = $state({ start: undefined, end: undefined });
	let selectedMesocycles: Selected<string | null>[] = $state([]);

	onMount(() => {
		if (currentFilters.startDate) {
			selectedDateRange.start = dateToCalendarDate(new Date(currentFilters.startDate));
		}
		if (currentFilters.endBefore) {
			// The filter's last day: the day before the midnight it ends at
			const lastDay = new Date(currentFilters.endBefore);
			lastDay.setDate(lastDay.getDate() - 1);
			selectedDateRange.end = dateToCalendarDate(lastDay);
		}
		// Picked by id, or by name in a link from before ids (every block of that name)
		const ids =
			currentFilters.selectedMesocycleIds ??
			currentFilters.selectedMesocycles?.flatMap((name) =>
				name === null
					? [null]
					: filterData.allMesocycles.filter((mesocycle) => mesocycle.name === name).map(({ id }) => id)
			);
		if (ids) {
			selectedMesocycles = ids.flatMap((id): Selected<string | null>[] => {
				if (id === null) return [{ value: null, label: NOT_IN_A_BLOCK }];
				const mesocycle = filterData.allMesocycles.find((mesocycle) => mesocycle.id === id);
				return mesocycle ? [{ value: id, label: mesocycleLabel(mesocycle) }] : [];
			});
		}
	});

	const NOT_IN_A_BLOCK = 'Non-meso workouts';

	/** Its name; with its start date too when another block has the same name (one restarted in the same month too) */
	function mesocycleLabel(mesocycle: (typeof filterData.allMesocycles)[number]) {
		const sameName = filterData.allMesocycles.filter((other) => other.name === mesocycle.name).length > 1;
		if (!sameName) return mesocycle.name;
		const started = mesocycle.startDate
			? mesocycle.startDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
			: 'Not started';
		return `${mesocycle.name} · ${started}`;
	}

	function applyFilters() {
		setFilters(
			selectedDateRange,
			selectedMesocycles.map((s) => s.value)
		);
		open = false;
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger asChild let:builder>
		<Button class="w-full gap-2" aria-label="search" builders={[builder]} variant="secondary">
			Filters <FilterIcon />
		</Button>
	</Popover.Trigger>
	<Popover.Content class="flex w-11/12 max-w-xl flex-col gap-1">
		<span class="text-sm font-semibold">Date range</span>
		<DateRangePicker bind:value={selectedDateRange} {...filterData} />

		<span class="mt-2 text-sm font-semibold">Mesocycles</span>
		<Select.Root multiple bind:selected={selectedMesocycles}>
			<Select.Trigger class="w-full">
				<Select.Value placeholder="Select a value" />
			</Select.Trigger>
			<Select.Content>
				<Select.Item class="italic" value={null}>{NOT_IN_A_BLOCK}</Select.Item>
				{#each filterData.allMesocycles as mesocycle}
					{@const isActive = mesocycle.startDate && mesocycle.endDate === null}
					<Select.Item class="flex items-center justify-between" label={mesocycleLabel(mesocycle)} value={mesocycle.id}>
						{mesocycleLabel(mesocycle)}
						{#if isActive}
							<div class="h-2 w-2 rounded-full bg-primary"></div>
						{/if}
					</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>

		<Button class="mt-2" onclick={applyFilters}>Apply</Button>
	</Popover.Content>
</Popover.Root>
