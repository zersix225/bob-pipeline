import { Webhooks } from "@octokit/webhooks";
import { createMiddleware } from "hono/factory";

import type { HonoEnv, WebhookEventName } from "../types";

// Creates a fresh Webhooks instance per request to prevent handler accumulation
// on the singleton across multiple requests.
export const githubWebhooksMiddleware = createMiddleware<HonoEnv>(
  async (c, next) => {
    const secret = c.env.GITHUB_WEBHOOK_SECRET;
    const webhooks = new Webhooks({ secret });

    c.set("webhooks", webhooks);

    await next();

    const id = c.req.header("x-github-delivery");
    const signature = c.req.header("x-hub-signature-256");
    const name = c.req.header("x-github-event") as WebhookEventName;

    if (!(id && name && signature)) {
      return c.text("Invalid webhook request", 403);
    }

    const payload = await c.req.text();

    try {
      await webhooks.verifyAndReceive({ id, name, signature, payload });
      return c.text("Webhook received & verified", 201);
    } catch (error) {
      return c.text(`Failed to verify Github Webhook request: ${error}`, 400);
    }
  },
);
