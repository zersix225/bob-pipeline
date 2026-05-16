import { Hono } from "hono";

import { githubWebhooksMiddleware } from "../middleware";
import type { HonoEnv } from "../types";
import "dotenv/config";
import { askGranite } from "../services/granite";

const api = new Hono<HonoEnv>();

api.use("/github/webhook", githubWebhooksMiddleware);

api.post("/github/webhook", async (c) => {
  const webhooks = c.var.webhooks;
  let payloadResult = {};
  webhooks.on("workflow_run.completed", ({ payload }) => {
    if (payload.workflow_run.conclusion === "failure") {
      console.log("Workflow failed", payload);
    }
  });

  webhooks.on(
    ["fork", "issues.opened", "star.created", "watch.started"],
    ({ name, payload }) => {
      console.log("event:", name);
      console.log("payload:",payload);
      payloadResult = payload;
    },
  );
  const answer = await askGranite(`what is the error of the payload ${payloadResult}`);
  console.log(answer);
});

export default api;
