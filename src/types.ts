import type { Webhooks } from "@octokit/webhooks";

type Variables = {
  webhooks: Webhooks;
};

type EnvVars = {
  GITHUB_WEBHOOK_SECRET: string;
};

export type HonoEnv = {
  Variables: Variables;
  Bindings: EnvVars;
};

export type WebhookEventName = Parameters<
  InstanceType<typeof Webhooks>["verifyAndReceive"]
>[number]["name"];
