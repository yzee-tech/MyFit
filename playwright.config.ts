import { devices, type PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
	webServer: {
		command: 'pnpm build && pnpm preview',
		port: 4173,
		// The build alone takes about a minute
		timeout: 180000,
		reuseExistingServer: !process.env.CI
	},
	testDir: 'tests',
	testMatch: /(.+\.)?(test|spec)\.[jt]s/,
	fullyParallel: true,
	// A failing test is tried again twice, so a flaky one shows up as a retry and is not hidden behind three
	retries: 2,
	globalSetup: './tests/global-setup',
	globalTeardown: './tests/global-teardown',
	// Two on GitHub (each has its own test user, see global-setup); one on a person's machine
	workers: process.env.CI ? 2 : 1,
	reporter: process.env.CI ? 'list' : 'html',
	use: {
		baseURL: 'http://localhost:4173',
		trace: 'on-first-retry',
		video: 'retain-on-failure',
		locale: 'en-US'
	},
	timeout: 30000,
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
};

export default config;
