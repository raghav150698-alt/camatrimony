# Local review

Open http://localhost:3000/login and choose **Continue as Arjun**. No OTP or password is needed. The review database contains ten fictional candidate profiles and a sample subscription. Photos are stock images.

The current review runs on ports 3000 (website) and 8787 (API). Nothing was deployed remotely.

## Configuration

`apps/web/.env.local`:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8787/v1
NEXT_PUBLIC_LOCAL_REVIEW=true
```

`apps/api/.dev.vars`:
```
LOCAL_REVIEW_AUTH="true"
```

Review login requires development mode, a loopback host and the explicit flags. The API only accepts the seeded review user, checks its active status and grants no admin role. Production builds cannot show or use the browser review login. Keep the API flag disabled outside local review.

## Restart

From the project root in PowerShell:
```powershell
$env:npm_config_manage_package_manager_versions='false'
$env:WRANGLER_SEND_METRICS='false'
$env:XDG_CONFIG_HOME='D:\Ca Matrimony\.local-config'
pnpm --filter './packages/*' build
```

API terminal:
```powershell
cd apps/api
pnpm exec wrangler dev --local --ip 127.0.0.1 --port 8787
```

Website terminal:
```powershell
cd apps/web
pnpm exec next dev --hostname 127.0.0.1 --port 3000
```

Set the PowerShell environment values in each new terminal if required by the local setup.

To initialize another local database, run these from `apps/api` before starting the API:
```powershell
pnpm exec wrangler d1 migrations apply camatrimony-db --local
pnpm exec wrangler d1 execute camatrimony-db --local --file=../../scripts/seed-local-review.sql
```
The seed is repeatable and preserves existing review profile edits. Never execute the review seed remotely.

## Ranking

Saved preferences determine fit: age 35, community 25, minimum annual income 25, education 15. Only configured preferences enter the denominator. Open preferences are neutral; unavailable candidate information earns no points and is labelled “Not shared.” For income ranges, the lower bound must meet the minimum. Scores represent preference fit, not a probability of relationship success.

Recommended results exclude the viewer and profiles blocked in either direction, use the opposite gender by default within the existing product model, and retain active-account and search filters. Explicit search filters can narrow or change the pool. Scoring happens before pagination. Equal scores use verification, featured status and a stable ID tie-break.

Member and admin ranking share the same scorer. Candidate preferences and private contact/KYC fields are not exposed in ranking responses. Existing contact-unlock and messaging permissions remain in the API.

The current implementation scores the full filtered pool in the Worker. For a large production catalogue, move this to indexed, normalized matching fields or a materialized recommendation store before scaling traffic.

## Checks

```powershell
node --test scripts/matching.test.mjs
node scripts/review-api.test.mjs
pnpm --filter @camatrimony/web exec tsc --noEmit
pnpm --filter @camatrimony/api exec tsc --noEmit
```

The API integration checks require the seeded local API and restore changed preferences. Browser review covered dummy login, preference edits and immediate reranking, plus responsive layouts at 1440px and 390px. Captures are in `review-artifacts`.
