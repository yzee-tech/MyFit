#!/bin/sh
# Vercel build: apply database migrations, then build the app.
#
# Migrations only run where they can't touch the live database by accident:
#   - production deployments, and
#   - preview deployments when MIGRATE_PREVIEW_DB=1, which should only be set
#     once Neon gives each preview its own database branch.
set -e

if [ "$VERCEL_ENV" = "production" ] || [ "$MIGRATE_PREVIEW_DB" = "1" ]; then
	echo "Applying database migrations ($VERCEL_ENV)"
	# Neon's pooled connection can't run migrations; prefer the direct one.
	DATABASE_URL="${DATABASE_URL_UNPOOLED:-$DATABASE_URL}" pnpm exec prisma migrate deploy
else
	echo "Skipping database migrations ($VERCEL_ENV): set MIGRATE_PREVIEW_DB=1 once previews use their own database branch"
fi

pnpm build
