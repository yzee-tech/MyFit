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
	// A failing test is tried again twice instead of three times, so a persistent failure shows up sooner
	retries: 2,
	// A test that needs a retry to pass fails the run on GitHub: the retry (and its trace) says what went wrong, it does not excuse it
	failOnFlakyTests: !!process.env.CI,
	globalSetup: './tests/global-setup',
	globalTeardown: './tests/global-teardown',
	// Two on GitHub (each has its own test user, see global-setup); one on a person's machine
	workers: process.env.CI ? 2 : 1,
	reporter: process.env.CI ? [['list'], ['./tests/diagnostics/reporter.cjs']] : 'html',
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
