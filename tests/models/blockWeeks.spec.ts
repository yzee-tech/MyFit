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
