import { Hono } from "hono";

import { githubWebhooksMiddleware } from "../middleware";
import type { HonoEnv } from "../types";

const api = new Hono<HonoEnv>();

api.use("/github/webhook", githubWebhooksMiddleware);

api.post("/github/webhook", async (c) => {
  const webhooks = c.var.webhooks;

  webhooks.on("workflow_run.completed", ({ payload }) => {
    if (payload.workflow_run.conclusion === "failure") {
      console.log("Workflow failed");
    }
  });

  webhooks.on(
    ["fork", "issues.opened", "star.created", "watch.started"],
    ({ name, payload }) => {
      console.log("event:", name);
    },
  );
});

export default api;
