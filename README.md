# BobOps

Self-healing CI/CD agent. When a GitHub Actions workflow fails, Bob fetches
the run logs and changed files, asks IBM watsonx.ai (Granite) to localize the
root cause, opens a fix PR, and posts a Slack summary. Every event is
persisted to Cloudflare D1 so the dashboard survives restarts.

## Stack

- Hono on Cloudflare Workers (`wrangler dev`)
- Cloudflare D1 for event persistence (local SQLite file under `.wrangler/state/`)
- IBM watsonx.ai (`ibm/granite-4-h-small`) for root-cause analysis
- GitHub Octokit for log retrieval and PR creation
- Slack Incoming Webhooks for notifications
- Plain HTML/CSS dashboard served from `src/index.ts`

## Getting started

### 1. Configure secrets

Create `.dev.vars` in the project root:

```ini
GITHUB_WEBHOOK_SECRET=replace-me
GITHUB_API_TOKEN=ghp_xxx

# Optional: omit to run Bob in demo-stub mode
WATSONX_API_KEY=
WATSONX_PROJECT_ID=
WATSONX_URL=https://us-south.ml.cloud.ibm.com

# Optional: Slack notifications
SLACK_WEBHOOK_URL=
```

### 2. D1 binding

`wrangler.jsonc` already declares a `DB` binding for a local database named
`bobops-events`. `wrangler dev` creates the SQLite file automatically; the
events table is created on first request.

For Cloudflare deploys, provision a real D1 database and paste the returned
id into `wrangler.jsonc`:

```bash
pnpm wrangler d1 create bobops-events
# copy the database_id into wrangler.jsonc
pnpm wrangler d1 migrations apply bobops-events --remote
```

### 3. Run

```bash
pnpm install
pnpm dev
```

Open `http://localhost:8787` for the dashboard.

## Endpoints

- `GET /` Dashboard UI
- `GET /api/events` JSON list of recent pipeline events (polled at 3s)
- `POST /api/bobops/trigger` Manual trigger from CI. Body: `repo`, `branch`, `commit`, `run_id`
- `POST /api/github/webhook` GitHub `workflow_run` webhook receiver

## Receiving GitHub webhooks locally

Expose `localhost:8787` to the public internet with your tool of choice
(ngrok, VS Code Tunnels, Cloudflare quick tunnel, etc.) and register the
forwarded URL `https://your-tunnel/api/github/webhook` with the repository.
The webhook must send `workflow_run` events and be signed with the
`GITHUB_WEBHOOK_SECRET`.

## How Bob heals a pipeline

1. `workflow_run.completed` webhook arrives with `conclusion = "failure"`.
2. Event is stored in D1 with status `detecting`.
3. `runHealingPipeline` (`src/lib/healer.ts`) fetches logs, changed files,
   and the repository tree from GitHub.
4. `analyzeWithWatsonX` (`src/lib/watsonx.ts`) asks Granite for a structured
   root cause and proposed code change. Bob is instructed to keep output
   professional, with no emojis and no em dashes.
5. If confidence is above 50%, a fix branch is opened and a PR is filed.
   If branch protection allows it, the PR is auto merged.
6. A Slack summary is posted when `SLACK_WEBHOOK_URL` is configured.
7. The dashboard polls `/api/events` and renders the timeline.

## Project layout

```
src/
  api/index.ts             Hono routes (events, trigger, webhook)
  index.ts                 Worker entry + dashboard HTML
  lib/
    healer.ts              Healing pipeline orchestration
    github.ts              Log fetch + PR creation
    watsonx.ts             Granite prompt + response parsing
    slack.ts               Slack block message
    types.ts               PipelineEvent and related types
  middleware/
    githubWebhooksMiddleware.ts
  store.ts                 D1-backed event store
  types.ts                 HonoEnv bindings
migrations/
  0001_create_events.sql   Events table schema
```
