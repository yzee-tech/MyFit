#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports -- Node CLI entry points use CommonJS. */
// Runs only from the trusted base checkout, never from a pull request's code.
const { readFileSync } = require('node:fs');

const REPOSITORY = 'yzee-tech/MyFit';
const REPOSITORY_ID = 1384966326;
const PROJECT = 'prj_NRUC6ApWK4DH37TYiO0dLfxdgRKl';
const TEAM = 'yz-ebbc';
const TRUSTED = new Set(['OWNER', 'MEMBER', 'COLLABORATOR']);
const SHA = /^[a-f0-9]{40}$/;
const DATABASE_PATH = /^prisma\/(schema|migrations)\//;

function validatePullRequest(pr) {
	if (!pr || pr.state !== 'open' || pr.draft) return false;
	if (pr.base?.repo?.full_name !== REPOSITORY || pr.base.ref !== 'main') return false;
	if (pr.head?.repo?.full_name !== REPOSITORY || pr.head.repo.id !== REPOSITORY_ID) return false;
	if (!TRUSTED.has(pr.author_association) || pr.head.ref === 'main') return false;
	if (!SHA.test(pr.head.sha) || !SHA.test(pr.base.sha)) throw new Error('Invalid commit metadata');
	if (!Number.isSafeInteger(pr.number) || pr.number < 1) throw new Error('Invalid PR number');
	return true;
}

function changesDatabase(files) {
	return files.some((file) => {
		if (typeof file.filename !== 'string') throw new Error('Invalid changed-file metadata');
		return (
			DATABASE_PATH.test(file.filename) ||
			(typeof file.previous_filename === 'string' && DATABASE_PATH.test(file.previous_filename))
		);
	});
}

async function run({ event, env, fetchImpl = fetch, log = console.log }) {
	if (env.GITHUB_REPOSITORY !== REPOSITORY || env.GITHUB_EVENT_NAME !== 'pull_request_target') {
		throw new Error('Only the trusted repository PR-target workflow may deploy');
	}
	const requested = event.pull_request;
	if (!validatePullRequest(requested)) return log('Preview skipped: PR is not eligible');
	if (!env.GITHUB_TOKEN) throw new Error('Missing GitHub read token');
	const github = `https://api.github.com/repos/${REPOSITORY}`;
	async function request(url, token, body) {
		const response = await fetchImpl(url, {
			method: body ? 'POST' : 'GET',
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: 'application/json',
				'Content-Type': 'application/json',
				'X-GitHub-Api-Version': '2022-11-28'
			},
			...(body ? { body: JSON.stringify(body) } : {}),
			redirect: 'error',
			signal: AbortSignal.timeout(30000)
		});
		// Never echo provider bodies, request headers, credentials, or PR-controlled text.
		if (!response.ok) throw new Error(`Provider request failed (HTTP ${response.status})`);
		return response.json();
	}
	const current = await request(`${github}/pulls/${requested.number}`, env.GITHUB_TOKEN);
	if (
		!validatePullRequest(current) ||
		current.head.sha !== requested.head.sha ||
		current.base.sha !== requested.base.sha
	)
		return log('Preview skipped: PR changed since this event');
	if (!Number.isSafeInteger(current.changed_files) || current.changed_files < 0 || current.changed_files > 3000)
		throw new Error('Cannot safely enumerate the full PR diff');
	const files = [];
	for (let page = 1; page <= Math.max(1, Math.ceil(current.changed_files / 100)); page++) {
		const batch = await request(`${github}/pulls/${current.number}/files?per_page=100&page=${page}`, env.GITHUB_TOKEN);
		if (!Array.isArray(batch) || batch.length > 100) throw new Error('Invalid file-list response');
		files.push(...batch);
	}
	if (files.length !== current.changed_files) throw new Error('Incomplete PR diff; no deployment requested');
	if (!changesDatabase(files)) return log('Preview skipped: no database schema or migration changes');
	const latest = await request(`${github}/pulls/${current.number}`, env.GITHUB_TOKEN);
	if (
		!validatePullRequest(latest) ||
		latest.head.sha !== current.head.sha ||
		latest.base.sha !== current.base.sha ||
		latest.changed_files !== current.changed_files
	) {
		return log('Preview skipped: PR changed while reading the diff');
	}
	if (!env.VERCEL_DATABASE_PREVIEW_TOKEN) {
		throw new Error('Database preview requires the VERCEL_DATABASE_PREVIEW_TOKEN repository secret');
	}
	const token = env.VERCEL_DATABASE_PREVIEW_TOKEN;
	const existing = await request(
		`https://api.vercel.com/v7/deployments?projectId=${PROJECT}&slug=${TEAM}&sha=${current.head.sha}&target=preview&limit=100`,
		token
	);
	if (!Array.isArray(existing.deployments)) throw new Error('Invalid deployment-list response');
	if (
		existing.deployments.some(
			(deployment) =>
				deployment.target !== 'production' &&
				deployment.meta?.githubCommitSha === current.head.sha &&
				['QUEUED', 'INITIALIZING', 'BUILDING', 'READY'].includes(deployment.state || deployment.readyState)
		)
	) {
		return log('Preview already exists for this exact commit');
	}
	const deployment = await request(`https://api.vercel.com/v13/deployments?slug=${TEAM}`, token, {
		name: 'my-fit',
		project: PROJECT,
		// No production target. Vercel defaults this API request to Preview.
		gitSource: { type: 'github', repoId: REPOSITORY_ID, ref: current.head.ref, sha: current.head.sha }
	});
	if (
		deployment.target === 'production' ||
		deployment.gitSource?.sha !== current.head.sha ||
		!/^dpl_[a-zA-Z0-9]+$/.test(deployment.id || '')
	) {
		throw new Error('Unexpected deployment identity; inspect Vercel before retrying');
	}
	log(`Database preview requested for commit ${current.head.sha}; deployment ${deployment.id}`);
}

module.exports = { validatePullRequest, changesDatabase, run };
if (require.main === module) {
	Promise.resolve()
		.then(() =>
			run({
				event: JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')),
				env: process.env
			})
		)
		.catch((error) => {
			// Only our fixed errors are printed. A fetch/provider exception may include sensitive data.
			const safe =
				/^(Only the trusted|Invalid |Missing |Cannot safely|Incomplete PR|Database preview requires|Provider request failed|Unexpected deployment)/;
			console.error(
				safe.test(error.message)
					? error.message
					: 'Database preview failed; inspect provider status without logging credentials'
			);
			process.exitCode = 1;
		});
}
