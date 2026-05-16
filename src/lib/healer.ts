import { createFixPR, fetchPipelineContext } from "./github";
import { notifySlack } from "./slack";
import type { PipelineEvent } from "./types";
import { analyzeWithWatsonX } from "./watsonx";

export interface HealerEnv {
  GITHUB_API_TOKEN: string;
  WATSONX_API_KEY?: string;
  WATSONX_PROJECT_ID?: string;
  WATSONX_URL?: string;
  SLACK_WEBHOOK_URL?: string;
}

const CONFIDENCE_THRESHOLD = 50; // minimum to attempt PR creation

export async function runHealingPipeline(
  event: PipelineEvent,
  owner: string,
  repo: string,
  env: HealerEnv,
  updateEvent: (id: string, patch: Partial<PipelineEvent>) => void,
): Promise<void> {
  const startTime = Date.now();

  const step = (label: string, status: "done" | "error") => {
    event.steps.push({ label, timestamp: new Date().toISOString(), status });
    updateEvent(event.id, { steps: [...event.steps] });
  };

  try {
    // Phase 1: Fetch logs + repo context
    updateEvent(event.id, { status: "detecting" });
    const context = await fetchPipelineContext(
      env.GITHUB_API_TOKEN,
      owner,
      repo,
      event.runId,
      event.commitSha,
      event.branch,
    );
    step(
      `Fetched logs and repo context (${Object.keys(context.changedFiles).length} changed files)`,
      "done",
    );

    // Phase 2: Analyze with WatsonX
    updateEvent(event.id, { status: "analyzing" });
    const analysis = await analyzeWithWatsonX(
      context,
      env.WATSONX_API_KEY ?? "",
      env.WATSONX_PROJECT_ID ?? "",
      env.WATSONX_URL ?? "https://us-south.ml.cloud.ibm.com",
    );
    step(
      `Root cause identified (confidence: ${analysis.confidence}%) — ${analysis.root_cause.slice(0, 80)}`,
      "done",
    );
    updateEvent(event.id, { analysis });

    // Phase 3: Create fix PR if confidence meets threshold
    if (analysis.confidence < CONFIDENCE_THRESHOLD) {
      step(
        `Confidence ${analysis.confidence}% below threshold (${CONFIDENCE_THRESHOLD}%) — skipping PR`,
        "error",
      );
      updateEvent(event.id, {
        status: "error",
        error: `Confidence too low: ${analysis.confidence}%`,
        durationMs: Date.now() - startTime,
      });
      return;
    }

    updateEvent(event.id, { status: "fixing" });
    const { url: prUrl, autoMerged } = await createFixPR(
      env.GITHUB_API_TOKEN,
      owner,
      repo,
      analysis,
      event.commitSha,
    );

    step(
      autoMerged
        ? `Fix auto-merged into main (${((Date.now() - startTime) / 1000).toFixed(0)}s)`
        : `PR opened: ${prUrl}`,
      "done",
    );

    updateEvent(event.id, {
      status: autoMerged ? "auto_merged" : "pr_created",
      prUrl,
      autoMerged,
      durationMs: Date.now() - startTime,
    });

    // Phase 4: Slack notification
    if (env.SLACK_WEBHOOK_URL) {
      await notifySlack(
        env.SLACK_WEBHOOK_URL,
        analysis,
        prUrl,
        autoMerged,
        `${owner}/${repo}`,
      );
      step("Slack notification sent", "done");
      updateEvent(event.id, { status: "notified" });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("BobOps healing pipeline failed:", msg);
    step(`Error: ${msg}`, "error");
    updateEvent(event.id, {
      status: "error",
      error: msg,
      durationMs: Date.now() - startTime,
    });
  }
}
