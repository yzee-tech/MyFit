import { test, expect } from '@playwright/test';
import {
	sortBlockNames,
	sortGroupHeadings,
	sortMesocycles,
	sortMuscleGroups,
	sortRoutineNames
} from '../../src/lib/utils/listOrder';

test('muscle groups: A to Z by the name shown, Custom last', () => {
	expect(
		sortMuscleGroups([
			'Chest',
			'FrontDelts',
			'SideDelts',
			'RearDelts',
			'Lats',
			'Traps',
			'Triceps',
			'Biceps',
			'Forearms',
			'Quads',
			'Hamstrings',
			'Glutes',
			'Calves',
			'Abs',
			'Neck',
			'Adductors',
			'Abductors',
			'Cardio',
			'Custom'
		])
	).toEqual([
		'Abductors',
		'Abs',
		'Adductors',
		'Biceps',
		'Calves',
		'Cardio',
		'Chest',
		'Forearms',
		'FrontDelts',
		'Glutes',
		'Hamstrings',
		'Lats',
		'Neck',
		'Quads',
		'RearDelts',
		'SideDelts',
		'Traps',
		'Triceps',
		'Custom'
	]);
	// A list of some of them, in any order, comes out the same way; the input is not changed
	const some = ['Traps', 'Custom', 'Chest', 'Biceps'] as const;
	expect(sortMuscleGroups(some)).toEqual(['Biceps', 'Chest', 'Traps', 'Custom']);
	expect(some).toEqual(['Traps', 'Custom', 'Chest', 'Biceps']);
});

test('headings, block names and blocks: A to Z, the outside-a-block entry first, same-name blocks newest first', () => {
	expect(sortGroupHeadings(['Triceps', 'Soleus', 'Front delts', 'Chest'])).toEqual([
		'Chest',
		'Front delts',
		'Soleus',
		'Triceps'
	]);
	expect(sortBlockNames(['Zeta', null, 'alpha', 'Beta'])).toEqual([null, 'alpha', 'Beta', 'Zeta']);
	const blocks = [
		{ id: 'z', name: 'Zeta', startDate: new Date(2026, 0, 1) },
		{ id: 'a-old', name: 'Alpha', startDate: new Date(2026, 2, 2) },
		{ id: 'a-new', name: 'Alpha', startDate: new Date(2026, 2, 12) },
		{ id: 'a-none', name: 'Alpha', startDate: null }
	];
	expect(sortMesocycles(blocks).map((block) => block.id)).toEqual(['a-none', 'a-new', 'a-old', 'z']);
});

test('routine names of a block: a running block follows My routines, the rest A to Z; a finished block A to Z', () => {
	const done = ['Legs A', 'Old name', 'Pull A', 'Another old', 'Push A'];
	expect(sortRoutineNames(done, ['Pull A', 'Push A', 'Legs A'])).toEqual([
		'Pull A',
		'Push A',
		'Legs A',
		'Another old',
		'Old name'
	]);
	expect(sortRoutineNames(done, null)).toEqual(['Another old', 'Legs A', 'Old name', 'Pull A', 'Push A']);
	// Two current routines of one name: the first one counts
	expect(sortRoutineNames(['B', 'A'], ['B', 'A', 'B'])).toEqual(['B', 'A']);
});
