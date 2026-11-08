# Database-only previews

Production still deploys from `main` through Vercel's Git integration. The existing production build and migration commands, domains and CI jobs are unchanged.

Automatic previews are requested only for open, non-draft, same-repository PRs to `main`, authored by an owner, member or collaborator, whose **full PR diff** changes `prisma/schema/**` or `prisma/migrations/**`. Renames out of these paths and deletions count. A mixed app/database PR counts. Ordinary app, test, docs and query-only changes do not. Changes to database tooling or configuration need review of this path rule; do not assume that changing a query is a schema change.

`vercel.json` disables native automatic Git deployments on all branches except `main`, including slash-containing branch names. A trusted `pull_request_target` workflow reads the current PR file list and asks Vercel to build the exact head commit in **Preview**, using the existing Neon integration. It never checks out or runs PR code on the secret-bearing runner. The token is sent only to `api.vercel.com`, not to the deployed app. Forks and untrusted authors are skipped before any credentials are used. The separate policy-test workflow has no deployment secret.

The gate fails visibly for incomplete diffs, provider failures or missing credentials. It skips stale events and checks the head/base again after reading the files. It avoids duplicate requests when the exact SHA already has an active or ready Preview: the duplicate check uses Vercel's documented server-side `sha` filter with `target=preview`, so the 100-deployment page limit only ever spans that commit's previews, and the client-side SHA re-check stays as a guard. Provider failure is not retried automatically. If a create request's result is uncertain, inspect Vercel before a manual rerun. Vercel's own deployment check tracks the build after the request is accepted.

## Setup and activation

Before merging this policy:

1. Set up `VERCEL_DATABASE_PREVIEW_TOKEN` as a GitHub Actions repository secret for this repository using an owner-approved Vercel token, with the narrowest supported team/access scope and an explicit expiry. Never paste it in chat, source, logs or an artifact. This credential is separate from the GitHub push token. Do not set it as an app environment variable.
2. Review and run the offline policy tests: `node --test scripts/database-preview.test.cjs`. Existing lint, typecheck and Playwright CI still must pass on the updated head.
3. Verify the Vercel Git source API and native Neon branch provisioning against a controlled database-change fixture before calling the new workflow operational. The trusted workflow is only available after it lands on `main`; a green offline test does not prove post-merge activation.
4. After approved merge, validate one database-change PR and one ordinary non-database PR. The former should create an isolated Preview/Neon branch at its exact SHA, and the latter should not request a deployment or branch. Check `main` is still enabled without forcing an unnecessary production deploy.

A policy commit on this PR may itself stop this branch's native automatic Preview before merge. That is not proof that the trusted database gate has activated. Any older ready preview belongs to its old SHA, not the updated PR head.

The Ignored Build Step is deliberately not used: it runs during `BUILDING`, after this project's integration provisioning. Skipping the build there would not establish that Neon branch capacity was saved.

The workflow is intentionally tied to `yzee-tech/MyFit`, Vercel project `my-fit` in team `yz-ebbc`, and production branch `main`. Revalidate those identifiers before reusing it elsewhere. Preview DB migrations still follow the existing `scripts/vercel-build.sh` rule (`MIGRATE_PREVIEW_DB=1` for an isolated preview); this policy does not change migration settings or production data.

No automatic branch cleanup, paid upgrade, production deploy, merge, security-setting change or new token is performed by this code. Token expiry causes database previews to fail visibly; renew it through the same approved secret setup process.
