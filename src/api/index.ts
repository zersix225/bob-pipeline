import { Hono } from "hono";

import type { HealerEnv } from "../lib/healer";
import { runHealingPipeline } from "../lib/healer";
import type { PipelineEvent } from "../lib/types";
import { githubWebhooksMiddleware } from "../middleware";
import { addEvent, getEvents, updateEvent } from "../store";
import type { HonoEnv } from "../types";

const api = new Hono<HonoEnv>();

// Dashboard data endpoint — polled by the frontend every 3s
api.get("/events", async (c) => {
  return c.json(await getEvents(c.env.DB));
});

// Manual trigger endpoint — called from CI workflow curl step or for testing
api.post("/bobops/trigger", async (c) => {
  const body = await c.req.json<{
    repo: string;
    branch: string;
    commit: string;
    run_id: string;
  }>();

  const [owner, repo] = body.repo.split("/");

  const event: PipelineEvent = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    repo: body.repo,
    branch: body.branch,
    commitSha: body.commit,
    runId: Number(body.run_id),
    status: "detecting",
    steps: [
      {
        label: "Pipeline failure detected via trigger",
        timestamp: new Date().toISOString(),
        status: "done",
      },
    ],
  };

  await addEvent(c.env.DB, event);

  const healerEnv: HealerEnv = {
    GITHUB_API_TOKEN: c.env.GITHUB_API_TOKEN,
    WATSONX_API_KEY: c.env.WATSONX_API_KEY,
    WATSONX_PROJECT_ID: c.env.WATSONX_PROJECT_ID,
    WATSONX_URL: c.env.WATSONX_URL,
    SLACK_WEBHOOK_URL: c.env.SLACK_WEBHOOK_URL,
  };

  const db = c.env.DB;
  c.executionCtx.waitUntil(
    runHealingPipeline(event, owner, repo, healerEnv, (id, patch) =>
      updateEvent(db, id, patch),
    ),
  );

  return c.json({ ok: true, eventId: event.id });
});

// GitHub webhook endpoint — receives workflow_run events from GitHub
api.use("/github/webhook", githubWebhooksMiddleware);

api.post("/github/webhook", async (c) => {
  const webhooks = c.var.webhooks;

  webhooks.on("workflow_run.completed", ({ payload }) => {
    if (payload.workflow_run.conclusion !== "failure") return;

    const repoFullName = payload.repository.full_name;
    const [owner, repo] = repoFullName.split("/");

    const event: PipelineEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      repo: repoFullName,
      branch: payload.workflow_run.head_branch ?? "unknown",
      commitSha: payload.workflow_run.head_sha,
      runId: payload.workflow_run.id,
      status: "detecting",
      steps: [
        {
          label: `Pipeline failure detected: "${payload.workflow_run.name}"`,
          timestamp: new Date().toISOString(),
          status: "done",
        },
      ],
    };

    const healerEnv: HealerEnv = {
      GITHUB_API_TOKEN: c.env.GITHUB_API_TOKEN,
      WATSONX_API_KEY: c.env.WATSONX_API_KEY,
      WATSONX_PROJECT_ID: c.env.WATSONX_PROJECT_ID,
      WATSONX_URL: c.env.WATSONX_URL,
      SLACK_WEBHOOK_URL: c.env.SLACK_WEBHOOK_URL,
    };

    const db = c.env.DB;
    c.executionCtx.waitUntil(
      (async () => {
        await addEvent(db, event);
        await runHealingPipeline(event, owner, repo, healerEnv, (id, patch) =>
          updateEvent(db, id, patch),
        );
      })(),
    );
  });

  return c.text("Webhook handler registered", 200);
});

export default api;