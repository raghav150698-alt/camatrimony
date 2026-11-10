#!/bin/sh
set -eu
export WRANGLER_SEND_METRICS=false NEXT_TELEMETRY_DISABLED=1 CI=true
pnpm install --frozen-lockfile
pnpm test:platform
pnpm --filter @camatrimony/api exec tsc --noEmit
pnpm --filter @camatrimony/web build:cloudflare
node scripts/seo-check.mjs
pnpm --filter @camatrimony/web exec wrangler deploy --dry-run
pnpm --filter @camatrimony/admin build:cloudflare
pnpm --filter @camatrimony/admin exec wrangler deploy --dry-run
pnpm build:api
