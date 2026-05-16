# Testing BobOps

A short checklist for verifying the worker, the D1-backed event store, and the
healing pipeline. Run these against `pnpm dev` (port 8787) unless noted.

## Prerequisites

```bash
pnpm install
cp .dev.vars.example .dev.vars   # then fill in the values below
pnpm dev
```

Minimum `.dev.vars`:

```ini
GITHUB_WEBHOOK_SECRET=any-string-for-local-testing
GITHUB_API_TOKEN=ghp_xxx
```

Optional (without these, Bob falls back to a demo analysis stub):

```ini
WATSONX_API_KEY=
WATSONX_PROJECT_ID=
WATSONX_URL=https://us-south.ml.cloud.ibm.com
SLACK_WEBHOOK_URL=
```

## 1. Dashboard loads

Open `http://localhost:8787`. Expect the dashboard shell, the sidebar filters,
and an "All pipelines healthy" empty state.

## 2. Events endpoint returns JSON

```bash
curl http://localhost:8787/api/events
```

Expect `[]` on a fresh database. A 500 here usually means the D1 binding is
missing; see `wrangler.jsonc` for the `DB` entry.

## 3. Manual trigger creates an event

```bash
curl -X POST http://localhost:8787/api/bobops/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "repo": "your-user/test-repo",
    "branch": "main",
    "commit": "abc123def456",
    "run_id": "12345"
  }'
```

Expect `{ "ok": true, "eventId": "..." }`. Refresh the dashboard: the new
event should appear in Recent Activity. Click the row to inspect the timeline
in the Event Detail card.

## 4. Webhook endpoint responds quickly

```bash
curl -X POST http://localhost:8787/api/github/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: workflow_run" \
  -H "X-GitHub-Delivery: test-delivery-123" \
  -H "X-Hub-Signature-256: sha256=invalid" \
  -d '{"action":"completed"}'
```

Expect a 400 (signature verification fails as designed). The request must
return immediately, not hang.

## 5. Events persist across restarts

1. Run test 3 to create an event.
2. Stop `pnpm dev` and start it again.
3. `curl http://localhost:8787/api/events` should still list the event.

The local SQLite file lives under `.wrangler/state/v3/d1/`. Delete that
directory to start with a clean database.

## 6. Demo failing test

```bash
cd demo
node --test broken_code.test.js
```

The middle case (null user) fails with a TypeError. That is the failure Bob
is designed to localize and patch.

## 7. End-to-end healing (requires WatsonX credentials and a real repo)

1. Fill in `WATSONX_API_KEY` and `WATSONX_PROJECT_ID` in `.dev.vars`.
2. Trigger via curl using a repo your `GITHUB_API_TOKEN` can write to:

   ```bash
   curl -X POST http://localhost:8787/api/bobops/trigger \
     -H "Content-Type: application/json" \
     -d '{"repo":"your-user/your-repo","branch":"main","commit":"<sha>","run_id":"<id>"}'
   ```

3. Watch the dashboard cycle through `detecting`, `analyzing`, `fixing`, then
   `pr_created` or `auto_merged`.
4. Confirm a PR appears on GitHub. If Slack is configured, confirm the post.

## 8. Static checks

```bash
pnpm type-check
pnpm lint
```

Both should exit with no output.

## Troubleshooting

- **`/api/events` returns 500.** The `DB` D1 binding is missing. Confirm
  `wrangler.jsonc` has the `d1_databases` entry and restart `pnpm dev`.
- **Webhook hangs.** Confirm `src/api/index.ts` returns `c.text(...)` from the
  POST handler.
- **Dashboard shows "Connection error".** The dev server is not running or
  the port is occupied.
- **`atob is not defined`.** The base64 path in `src/lib/github.ts` uses
  `Buffer`, which requires the `nodejs_compat` flag in `wrangler.jsonc`.

## Deploy

```bash
pnpm wrangler d1 create bobops-events   # one time; paste id into wrangler.jsonc
pnpm wrangler d1 migrations apply bobops-events --remote
pnpm deploy
```

Register the worker URL with the GitHub repository at
Settings > Webhooks. Payload path: `/api/github/webhook`. Content type:
`application/json`. Secret: your `GITHUB_WEBHOOK_SECRET`. Event: workflow
runs.
