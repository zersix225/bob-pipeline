import { Hono } from "hono";

import { githubWebhooksMiddleware } from "../middleware";
import type { HonoEnv } from "../types";

const api = new Hono<HonoEnv>();

api.use("/github/webhook", githubWebhooksMiddleware);

api.post("/github/webhook", async (c) => {
  const webhooks = c.var.webhooks;

  webhooks.on(
    ["fork", "issues.opened", "star.created", "watch.started", "pull_request.opened"],
    ({ payload, name }) => {
      console.log("event:", name);
      console.log("payload:", payload);
    },
  );
});

export default api;
