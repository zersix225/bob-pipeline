import type { Webhooks } from "@octokit/webhooks";

type Variables = {
  webhooks: Webhooks;
};

type EnvVars = {
  DB: D1Database;
  GITHUB_WEBHOOK_SECRET: string;
  GITHUB_API_TOKEN: string;
  WATSONX_API_KEY?: string;
  WATSONX_PROJECT_ID?: string;
  WATSONX_URL?: string;
  SLACK_WEBHOOK_URL?: string;
};

export type HonoEnv = {
  Variables: Variables;
  Bindings: EnvVars;
};

export type WebhookEventName = Parameters<
  InstanceType<typeof Webhooks>["verifyAndReceive"]
>[number]["name"];
