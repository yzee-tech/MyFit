import { test, expect } from '@playwright/test';
import { exercisesLink } from '../../src/routes/workouts/manage/exercisesLink';

const BASE = '/workouts/manage/exercises?userBodyweight=80';

test('a blank workout links with the bodyweight only, whatever else is asked', () => {
	const blank = { userBodyweight: 80 };
	expect(exercisesLink(blank, { userBodyweightKg: 80 })).toBe(BASE);
	expect(exercisesLink(blank, { userBodyweightKg: 80, welcomeBack: true })).toBe(BASE);
	expect(exercisesLink({ ...blank, sessionWeightUnit: 'LB' }, { userBodyweightKg: 80 })).toBe(BASE);
});

test('a routine of My routines names the routine (encoded); a block routine also asks for the active block', () => {
	expect(exercisesLink({ userBodyweight: 80, routineName: 'Pull A' })).toBe(`${BASE}&routine=Pull%20A`);
	expect(exercisesLink({ userBodyweight: 80, routineName: 'Push & Legs' })).toBe(`${BASE}&routine=Push%20%26%20Legs`);
	expect(exercisesLink({ userBodyweight: 80, routineName: 'Pull A', workoutOfMesocycle: { id: 'x' } })).toBe(
		`${BASE}&routine=Pull%20A&useActiveMesocycle`
	);
});

test('options come in a fixed order: block, keep current, welcome back, then the gym unit and weights', () => {
	const workout = {
		userBodyweight: 80,
		routineName: 'Pull A',
		workoutOfMesocycle: { id: 'x' },
		sessionWeightUnit: 'LB',
		sessionWeightSetId: 'ws1'
	};
	expect(exercisesLink(workout, { keepCurrent: true, welcomeBack: true })).toBe(
		`${BASE}&routine=Pull%20A&useActiveMesocycle&keepCurrent&welcomeBack&sessionUnit=LB&sessionWeightSetId=ws1`
	);
	expect(exercisesLink(workout)).toBe(
		`${BASE}&routine=Pull%20A&useActiveMesocycle&sessionUnit=LB&sessionWeightSetId=ws1`
	);
});

test('the bodyweight in kilograms replaces the workout’s, and resuming uses the workout’s own', () => {
	expect(exercisesLink({ userBodyweight: 176, routineName: 'Pull A' }, { userBodyweightKg: 80 })).toBe(
		`${BASE}&routine=Pull%20A`
	);
	expect(exercisesLink({ userBodyweight: 80, routineName: 'Pull A' }, { keepCurrent: true })).toBe(
		`${BASE}&routine=Pull%20A&keepCurrent`
	);
});
