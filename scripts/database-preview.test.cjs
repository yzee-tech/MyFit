/* eslint-disable @typescript-eslint/no-require-imports -- Node CLI tests use CommonJS. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { run, changesDatabase } = require('./database-preview.cjs');

function pull(overrides = {}) {
	return {
		number: 68,
		state: 'open',
		draft: false,
		author_association: 'OWNER',
		changed_files: 1,
		head: { ref: 'feat/schema-change', sha: 'a'.repeat(40), repo: { full_name: 'yzee-tech/MyFit', id: 1384966326 } },
		base: { ref: 'main', sha: 'b'.repeat(40), repo: { full_name: 'yzee-tech/MyFit' } },
		...overrides
	};
}
function harness({
	pr = pull(),
	files = [{ filename: 'prisma/schema/workout.prisma' }],
	latest = pr,
	current = pr,
	existing = [],
	token = 'VERCEL_SENTINEL',
	failAt,
	deploy = {}
} = {}) {
	const calls = [],
		logs = [];
	const env = {
		GITHUB_EVENT_NAME: 'pull_request_target',
		GITHUB_REPOSITORY: 'yzee-tech/MyFit',
		GITHUB_TOKEN: 'GITHUB_SENTINEL',
		VERCEL_DATABASE_PREVIEW_TOKEN: token
	};
	let reads = 0;
	const fetchImpl = async (url, options) => {
		calls.push({ url, options });
		if (calls.length === failAt) return { ok: false, status: 403, json: async () => ({ secret: token }) };
		let data;
		if (url.includes('/files?')) {
			const page = Number(new URL(url).searchParams.get('page'));
			data = files.slice((page - 1) * 100, page * 100);
		} else if (url.startsWith('https://api.github.com/')) data = ++reads === 1 ? current : latest;
		else if (options.method === 'GET') data = { deployments: existing };
		else data = { id: 'dpl_ABC123', target: null, gitSource: { sha: pr.head.sha }, ...deploy };
		return { ok: true, status: 200, json: async () => data };
	};
	return {
		calls,
		logs,
		env,
		execute: () => run({ event: { pull_request: pr }, env, fetchImpl, log: (line) => logs.push(line) })
	};
}

test('classifies only schema/migrations, including renames and deletions', () => {
	for (const filename of ['prisma/schema/exercise.prisma', 'prisma/migrations/123/migration.sql']) {
		assert(changesDatabase([{ filename }]));
		assert(changesDatabase([{ filename, status: 'removed' }]));
		assert(changesDatabase([{ filename: 'archive/old.sql', previous_filename: filename, status: 'renamed' }]));
	}
	assert(
		!changesDatabase(
			[
				'src/lib/server/query.ts',
				'tests/cardio.spec.ts',
				'docs/database.md',
				'prisma2/schema/x',
				'prisma/schema-not/x',
				'scripts/vercel-build.sh',
				'package.json'
			].map((filename) => ({ filename }))
		)
	);
	assert.throws(() => changesDatabase([{}]), /Invalid/);
});

test('test/app/docs-only PR skips without needing a Vercel secret or calling Vercel', async () => {
	const h = harness({ files: [{ filename: 'tests/quickAdd.spec.ts' }], token: '' });
	await h.execute();
	assert(h.logs[0].includes('no database'));
	assert(!h.calls.some((c) => c.url.startsWith('https://api.vercel.com')));
});

test('full mixed PR diff deploys exact head SHA to fixed project, Preview only', async () => {
	const h = harness({
		pr: pull({ changed_files: 2 }),
		files: [{ filename: 'src/foo.ts' }, { filename: 'prisma/schema/foo.prisma' }]
	});
	await h.execute();
	const sent = h.calls.find((c) => c.options.method === 'POST');
	const body = JSON.parse(sent.options.body);
	assert.equal(body.gitSource.sha, 'a'.repeat(40));
	assert.equal(body.gitSource.repoId, 1384966326);
	assert.equal(body.project, 'prj_NRUC6ApWK4DH37TYiO0dLfxdgRKl');
	assert(!('target' in body));
	assert(!JSON.stringify(h.logs).includes('SENTINEL'));
	assert.equal(sent.options.redirect, 'error');
	assert(
		h.calls
			.filter((c) => c.url.startsWith('https://api.github.com'))
			.every((c) => c.options.headers.Authorization === 'Bearer GITHUB_SENTINEL')
	);
});

test('database file on a later page of the full PR is included', async () => {
	const files = Array.from({ length: 101 }, (_, i) => ({ filename: `tests/${i}.ts` }));
	files[100] = { filename: 'prisma/migrations/new/migration.sql' };
	const h = harness({ pr: pull({ changed_files: 101 }), files });
	await h.execute();
	assert(h.calls.some((c) => c.options.method === 'POST'));
});

test('forks, untrusted authors, drafts, closed PRs and main heads never use credentials', async () => {
	const invalid = [
		pull({ author_association: 'CONTRIBUTOR' }),
		pull({ draft: true }),
		pull({ state: 'closed' }),
		pull({ head: { ...pull().head, repo: { full_name: 'attacker/MyFit', id: 1 } } }),
		pull({ head: { ...pull().head, ref: 'main' } }),
		pull({ base: { ...pull().base, ref: 'production' } })
	];
	for (const pr of invalid) {
		const h = harness({ pr });
		await h.execute();
		assert.equal(h.calls.length, 0);
	}
});

test('wrong workflow context fails without network', async () => {
	for (const [key, value] of [
		['GITHUB_EVENT_NAME', 'pull_request'],
		['GITHUB_REPOSITORY', 'attacker/MyFit']
	]) {
		const h = harness();
		h.env[key] = value;
		await assert.rejects(h.execute, /trusted repository/);
		assert.equal(h.calls.length, 0);
	}
});

test('missing, truncated or over-limit diff fails closed before deployment', async () => {
	for (const [pr, files] of [
		[pull({ changed_files: 2 }), [{ filename: 'tests/x.ts' }]],
		[pull({ changed_files: 3001 }), []],
		[pull({ changed_files: undefined }), []]
	]) {
		const h = harness({ pr, files });
		await assert.rejects(h.execute, /diff/);
		assert(!h.calls.some((c) => c.url.startsWith('https://api.vercel.com')));
	}
});

test('stale event, head race and base race do not deploy', async () => {
	for (const options of [
		{ current: pull({ head: { ...pull().head, sha: 'c'.repeat(40) } }) },
		{ latest: pull({ head: { ...pull().head, sha: 'c'.repeat(40) } }) },
		{ latest: pull({ base: { ...pull().base, sha: 'c'.repeat(40) } }) }
	]) {
		const h = harness(options);
		await h.execute();
		assert(!h.calls.some((c) => c.url.startsWith('https://api.vercel.com')));
	}
});

test('missing deploy secret is a clear error only for DB PRs', async () => {
	const h = harness({ token: '' });
	await assert.rejects(h.execute, /VERCEL_DATABASE_PREVIEW_TOKEN/);
	assert(!h.calls.some((c) => c.url.startsWith('https://api.vercel.com')));
});

test('provider failure is not treated as a safe skip or retried POST', async () => {
	for (const failAt of [1, 2, 3, 4, 5]) {
		const h = harness({ failAt });
		await assert.rejects(h.execute, /HTTP 403/);
		assert(h.calls.filter((c) => c.options.method === 'POST').length <= 1);
		assert(!JSON.stringify(h.logs).includes('SENTINEL'));
	}
});

test('successful or in-flight exact-SHA Preview is idempotent; failed Preview may retry', async () => {
	for (const state of ['READY', 'QUEUED', 'INITIALIZING', 'BUILDING']) {
		const h = harness({ existing: [{ state, target: null, meta: { githubCommitSha: 'a'.repeat(40) } }] });
		await h.execute();
		assert(!h.calls.some((c) => c.options.method === 'POST'));
	}
	const h = harness({ existing: [{ state: 'ERROR', meta: { githubCommitSha: 'a'.repeat(40) } }] });
	await h.execute();
	assert(h.calls.some((c) => c.options.method === 'POST'));
});

test('unexpected production or wrong-SHA response fails visibly, never issues another POST', async () => {
	for (const deploy of [{ target: 'production' }, { gitSource: { sha: 'c'.repeat(40) } }]) {
		const h = harness({ deploy });
		await assert.rejects(h.execute, /Unexpected deployment/);
		assert.equal(h.calls.filter((c) => c.options.method === 'POST').length, 1);
	}
});

test('untrusted branch text stays JSON data, never shell or workflow expressions', async () => {
	const ref = 'feat/$(echo-SENTINEL)';
	const h = harness({ pr: pull({ head: { ...pull().head, ref } }) });
	await h.execute();
	assert.equal(JSON.parse(h.calls.find((c) => c.options.method === 'POST').options.body).gitSource.ref, ref);
	assert(!JSON.stringify(h.logs).includes('echo-SENTINEL'));
});

test('workflow uses trusted base, read-only permissions and no PR code execution; production remains allowed', () => {
	const workflow = readFileSync(`${__dirname}/../.github/workflows/database-preview.yml`, 'utf8');
	assert.match(workflow, /pull_request_target:/);
	assert.match(workflow, /ref: \$\{\{ github.event.pull_request.base.sha \}\}/);
	assert.match(workflow, /persist-credentials: false/);
	assert.match(workflow, /contents: read/);
	assert.match(workflow, /pull-requests: read/);
	assert(!workflow.includes('pull_request.head.sha'));
	assert(!workflow.includes('npm install') && !workflow.includes('pnpm'));
	const config = JSON.parse(readFileSync(`${__dirname}/../vercel.json`, 'utf8'));
	assert.deepEqual(config.git.deploymentEnabled, { '**': false, main: true });
	assert.equal(config.buildCommand, 'sh scripts/vercel-build.sh');
	assert.equal(config.installCommand, 'pnpm install --frozen-lockfile');
});
