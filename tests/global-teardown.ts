import { config } from 'dotenv';
config();
import { prisma } from '../src/lib/prisma';
import { deleteTestUsers } from './deleteTestUsers';
import type { UserData } from './global-setup';

export default async function globalTeardown() {
	const testUsersData: UserData[] = JSON.parse(process.env.TEST_USERS_DATA as string);

	await deleteTestUsers(prisma, { id: { in: testUsersData.map(({ userId }) => userId) } });

	await deleteTestUsers(prisma, {
		email: {
			startsWith: 'test-user-',
			endsWith: '@myfit.com'
		}
	});
}
