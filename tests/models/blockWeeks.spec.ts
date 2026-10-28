import { expect, test, type Page } from '../fixtures';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// The phone is in Shanghai: the week is counted in its local days
test.use({ timezoneId: 'Asia/Shanghai' });

/** A 6-week block (the last week a deload); `start` and `end` are instants, null for none */
async function seedBlock(userId: string, start: Date | null, end: Date | null = null) {
	return prisma.mesocycle.create({
		data: {
			userId,
			name: 'Week test block',
			weeklyRIR: [3, 2, 2, 1, 0, -1],
			startDate: start,
			endDate: end,
			startOverloadPercentage: 2.5,
			lastSetToFailure: false,
			forceRIRMatching: false
		}
	});
}

// Started Oct 20 at 18:00 Shanghai: on Oct 27 at 09:00 there it is the 8th day, but under 168 hours
const STARTED = new Date('2026-10-20T10:00:00Z');
const DAY_8 = new Date('2026-10-27T01:00:00Z');

async function openBlock(page: Page, id: string, now: Date) {
	await page.clock.setFixedTime(now);
	await page.goto(`/mesocycles/${id}`);
	await expect(page.getByTestId('mesocycle-weekly-effort')).toBeVisible();
}

test('current week badge: the week of the 8th day is marked, nothing else is, and a deload week is not filled', async ({
	page,
	userData
}) => {
	const block = await seedBlock(userData.userId, STARTED);
	await openBlock(page, block.id, DAY_8);
	const efforts = page.getByTestId('mesocycle-weekly-effort');
	const current = efforts.locator('[data-current]');
	await expect(current).toHaveCount(1);
	await expect(current).toHaveText('W2: 2 RIR');
	await expect(current).toHaveAttribute('aria-current', 'step');
	await expect(current).toHaveClass(/bg-primary/);
	// Other badges carry neither attribute, and the deload week (not current) is as plain as the rest
	await expect(efforts.locator('[aria-current]')).toHaveCount(1);
	const deload = efforts.getByText('W6: Deload');
	await expect(deload).not.toHaveAttribute('data-current', /.*/);
	await expect(deload).not.toHaveClass(/bg-(primary|secondary)/);
	await expect(efforts.getByText('W1: 3 RIR')).not.toHaveClass(/bg-(primary|secondary)/);
});

test('current week badge: when the current week is the deload week it is the filled one and still says Deload', async ({
	page,
	userData
}) => {
	const block = await seedBlock(userData.userId, STARTED);
	// Day 36 is the first day of Week 6
	await openBlock(page, block.id, new Date('2026-11-24T01:00:00Z'));
	const current = page.getByTestId('mesocycle-weekly-effort').locator('[data-current]');
	await expect(current).toHaveCount(1);
	await expect(current).toHaveText('W6: Deload');
	await expect(current).toHaveClass(/bg-primary/);
});

test('current week badge: a finished, an unstarted and a past-planned-length block mark nothing', async ({
	page,
	userData
}) => {
	const finished = await seedBlock(userData.userId, STARTED, new Date('2026-10-25T10:00:00Z'));
	await openBlock(page, finished.id, DAY_8);
	await expect(page.getByTestId('mesocycle-weekly-effort').locator('[data-current], [aria-current]')).toHaveCount(0);

	const unstarted = await seedBlock(userData.userId, null);
	await openBlock(page, unstarted.id, DAY_8);
	await expect(page.getByTestId('mesocycle-weekly-effort').locator('[data-current], [aria-current]')).toHaveCount(0);

	// Week 9 of a 6-week block
	const past = await seedBlock(userData.userId, STARTED);
	await openBlock(page, past.id, new Date('2026-12-15T01:00:00Z'));
	await expect(page.getByTestId('mesocycle-weekly-effort').locator('[data-current], [aria-current]')).toHaveCount(0);
});

/** My routines of a user: the given names, in order */
async function seedRoutines(userId: string, names: string[]) {
	await prisma.exerciseSplit.create({
		data: {
			userId,
			name: 'My routines',
			exerciseSplitDays: { create: names.map((name, dayIndex) => ({ name, dayIndex })) }
		}
	});
}

/** A finished workout, in a block or not */
async function seedWorkout(userId: string, startedAt: Date, routineName: string | null, mesocycleId?: string) {
	return prisma.workout.create({
		data: {
			userId,
			userBodyweight: 80,
			startedAt,
			endedAt: new Date(startedAt.getTime() + 3600000),
			routineName,
			...(mesocycleId ? { workoutOfMesocycle: { create: { mesocycleId } } } : {})
		}
	});
}

test('past workout: Week N from the day it was done, counted in local days; none outside a block or without a start date', async ({
	page,
	userData
}) => {
	const block = await seedBlock(userData.userId, STARTED);
	const sameDay = await seedWorkout(userData.userId, new Date('2026-10-20T15:00:00Z'), null, block.id);
	const dayEight = await seedWorkout(userData.userId, DAY_8, null, block.id);
	const ninthWeek = await seedWorkout(userData.userId, new Date('2026-12-15T01:00:00Z'), null, block.id);
	const noBlock = await seedWorkout(userData.userId, DAY_8, null);
	const notStarted = await seedBlock(userData.userId, null);
	const noStart = await seedWorkout(userData.userId, DAY_8, null, notStarted.id);

	const week = page.getByTestId('workout-mesocycle-week');
	for (const [workout, text] of [
		[sameDay, 'Week 1'],
		[dayEight, 'Week 2'],
		// Past the planned 6 weeks: not capped
		[ninthWeek, 'Week 9']
	] as const) {
		await page.goto(`/workouts/${workout.id}`);
		await expect(page.getByRole('link', { name: 'Week test block' })).toBeVisible();
		await expect(week).toHaveText(text);
	}
	await page.goto(`/workouts/${noBlock.id}`);
	await expect(page.getByText('No mesocycle')).toBeVisible();
	await expect(week).toHaveCount(0);
	await page.goto(`/workouts/${noStart.id}`);
	await expect(page.getByRole('link', { name: 'Week test block' })).toBeVisible();
	await expect(week).toHaveCount(0);
});

test('past workout: the mesocycle name is a link without an underline; the routine is a link when My routines still has it, also outside a block', async ({
	page,
	userData
}) => {
	await seedRoutines(userData.userId, ['Pull A', 'Push & Legs']);
	const block = await seedBlock(userData.userId, STARTED);
	const inBlock = await seedWorkout(userData.userId, DAY_8, 'Push & Legs', block.id);
	const outsideBlock = await seedWorkout(userData.userId, DAY_8, 'Pull A');
	const deleted = await seedWorkout(userData.userId, DAY_8, 'Deleted routine', block.id);

	await page.goto(`/workouts/${inBlock.id}`);
	const mesocycleLink = page.getByRole('link', { name: 'Week test block' });
	await expect(mesocycleLink).toHaveAttribute('href', `/mesocycles/${block.id}`);
	await expect(mesocycleLink).not.toHaveClass(/underline/);
	await expect(page.getByTestId('workout-routine-link')).toHaveAttribute(
		'href',
		`/exercise-splits?routine=${encodeURIComponent('Push & Legs')}`
	);

	await page.goto(`/workouts/${outsideBlock.id}`);
	await expect(page.getByTestId('workout-routine-link')).toHaveAttribute('href', '/exercise-splits?routine=Pull%20A');

	// The routine was deleted or renamed since: a plain badge, as before
	await page.goto(`/workouts/${deleted.id}`);
	await expect(page.getByTestId('workout-routine-badge')).toHaveText('Deleted routine');
	await expect(page.getByTestId('workout-routine-link')).toHaveCount(0);
});

test('My routines ?routine=: the routine opens, scrolls into view and takes focus; an unknown name opens nothing; a refresh does not scroll again', async ({
	page,
	userData
}) => {
	const names = Array.from({ length: 14 }, (_, idx) => `Routine ${idx + 1}`);
	await seedRoutines(userData.userId, names);
	const card = (name: string) => page.getByRole('button', { name: `Show the exercises of ${name}`, exact: true });
	const opened = (name: string) => page.getByRole('button', { name: `Hide the exercises of ${name}` });

	await page.goto('/exercise-splits?routine=Routine%2012');
	await expect(opened('Routine 12')).toBeVisible();
	await expect(opened('Routine 12')).toBeInViewport();
	await expect(opened('Routine 12')).toBeFocused();
	await expect(page.locator('[aria-expanded="true"]')).toHaveCount(1);
	await expect(page.locator('[id^="routine-"]')).toHaveCount(14);

	// A change to the list refreshes it: no scroll back to the routine
	await page.evaluate(() => window.scrollTo(0, 0));
	await page.getByLabel('Routine Routine 2 options', { exact: true }).click();
	await page.getByRole('menuitem', { name: 'Duplicate' }).click();
	await expect(page.getByTestId('my-routines-count')).toContainText('15');
	expect(await page.evaluate(() => window.scrollY)).toBeLessThan(200);

	// A link to another routine while on the page opens that one too
	await page.evaluate(() => {
		const link = document.createElement('a');
		link.href = '/exercise-splits?routine=Routine%205';
		document.body.appendChild(link);
		link.click();
	});
	await expect(opened('Routine 5')).toBeFocused();

	await page.goto('/exercise-splits?routine=No%20such%20routine');
	await expect(card('Routine 1')).toBeVisible();
	await expect(page.locator('[aria-expanded="true"]')).toHaveCount(0);
});

test('My routines respects reduced motion: opens and focuses the target with a non-smooth scroll', async ({
	page,
	userData
}) => {
	await seedRoutines(
		userData.userId,
		Array.from({ length: 14 }, (_, idx) => `Routine ${idx + 1}`)
	);
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.addInitScript(() => {
		const original = Element.prototype.scrollIntoView;
		(window as unknown as { routineScrolls: unknown[] }).routineScrolls = [];
		Element.prototype.scrollIntoView = function (options) {
			if (this.id.startsWith('routine-')) {
				(window as unknown as { routineScrolls: unknown[] }).routineScrolls.push(options);
			}
			return original.call(this, options);
		};
	});
	await page.goto('/exercise-splits?routine=Routine%2012');
	const target = page.getByRole('button', { name: 'Hide the exercises of Routine 12', exact: true });
	await expect(target).toBeFocused();
	await expect(target).toBeInViewport();
	const scrolls = await page.evaluate(() => (window as unknown as { routineScrolls: unknown[] }).routineScrolls);
	expect(scrolls).toEqual([{ block: 'center', behavior: 'auto' }]);
});

test('MesocycleStats counts local weeks with a faked clock, ends at endDate and caps at planned weeks', async ({
	page,
	userData
}) => {
	const block = await seedBlock(userData.userId, STARTED);
	await prisma.workout.create({
		data: {
			userId: userData.userId,
			userBodyweight: 80,
			startedAt: STARTED,
			endedAt: new Date(STARTED.getTime() + 3600000),
			routineName: 'Pull A',
			workoutOfMesocycle: { create: { mesocycleId: block.id } },
			workoutExercises: {
				create: [
					{
						exerciseIndex: 0,
						name: 'Rows',
						targetMuscleGroup: 'Traps',
						setType: 'Straight',
						repRangeStart: 8,
						repRangeEnd: 12,
						sets: { create: [{ setIndex: 0, load: 60, reps: 10, RIR: 2, skipped: false }] }
					}
				]
			}
		}
	});
	await page.clock.install({ time: DAY_8 });
	await page.goto(`/mesocycles/${block.id}`);
	await page.getByRole('button', { name: 'Stats', exact: true }).click();
	await expect(page.getByText('Week 2 of 6', { exact: true })).toBeVisible();
	await expect(page.getByText('33%', { exact: true })).toBeVisible();
	await expect(page.getByText('0.5 per week', { exact: true })).toBeVisible();
	await page.clock.setFixedTime(new Date('2026-11-03T01:00:00Z'));
	await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
	await expect(page.getByText('Week 3 of 6', { exact: true })).toBeVisible();
	await page.clock.setFixedTime(new Date('2026-12-15T01:00:00Z'));
	await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
	await expect(page.getByText('Week 6 of 6', { exact: true })).toBeVisible();
	// A finished block uses its end instant, not the later phone clock.
	await prisma.mesocycle.update({ where: { id: block.id }, data: { endDate: DAY_8 } });
	await page.reload();
	await page.getByRole('button', { name: 'Stats', exact: true }).click();
	await expect(page.getByText('Week 2 of 6', { exact: true })).toBeVisible();
	await expect(page.getByText('0.5 per week', { exact: true })).toBeVisible();
});
