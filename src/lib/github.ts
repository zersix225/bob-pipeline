import { Octokit } from "@octokit/core";

import type { BobAnalysis, PipelineContext } from "./types";

export async function fetchPipelineContext(
  token: string,
  owner: string,
  repo: string,
  runId: number,
  headSha: string,
  headBranch: string,
): Promise<PipelineContext> {
  const octokit = new Octokit({ auth: token });

  // Find failed job to get its logs
  const jobsRes = await octokit.request(
    "GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs",
    { owner, repo, run_id: runId },
  );
  const failedJob = jobsRes.data.jobs.find((j) => j.conclusion === "failure");

  // Fetch logs for the failed job (text format, not zip)
  let logs = "No logs available";
  if (failedJob) {
    try {
      const logsRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/actions/jobs/${failedJob.id}/logs`,
        {
          headers: {
            Authorization: `token ${token}`,
            "User-Agent": "BobOps/1.0",
          },
          redirect: "follow",
        },
      );
      const rawLogs = await logsRes.text();
      logs = rawLogs.slice(-8000);
    } catch {
      logs = `Failed to fetch logs for job ${failedJob.id}`;
    }
  }

  // Fetch diff of changed files in the commit
  const changedFiles: Record<string, string> = {};
  try {
    const commitRes = await octokit.request(
      "GET /repos/{owner}/{repo}/commits/{ref}",
      { owner, repo, ref: headSha },
    );
    for (const file of commitRes.data.files ?? []) {
      if (file.patch) changedFiles[file.filename] = file.patch;
    }
  } catch {
    // non-critical, continue without changed files
  }

  // Fetch flat repo tree for full context
  let repoTree = "";
  try {
    const treeRes = await octokit.request(
      "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
      { owner, repo, tree_sha: headSha, recursive: "1" },
    );
    repoTree = (treeRes.data.tree as Array<{ type?: string; path?: string }>)
      .filter((item) => item.type === "blob")
      .map((item) => item.path ?? "")
      .join("\n");
  } catch {
    // non-critical
  }

  return {
    repoFullName: `${owner}/${repo}`,
    owner,
    repo,
    branch: headBranch,
    commitSha: headSha,
    runId,
    logs,
    changedFiles,
    repoTree,
  };
}

export async function createFixPR(
  token: string,
  owner: string,
  repo: string,
  analysis: BobAnalysis,
  commitSha: string,
): Promise<{ url: string; autoMerged: boolean }> {
  const octokit = new Octokit({ auth: token });
  const fix = analysis.fix;

  // Get main branch HEAD SHA
  const baseRef = await octokit.request(
    "GET /repos/{owner}/{repo}/git/ref/{ref}",
    { owner, repo, ref: "heads/main" },
  );

  // Create a unique fix branch. The previous scheme used the commit SHA only,
  // so re-triggering for the same commit raised 422 "Reference already exists".
  // Appending a random suffix guarantees uniqueness, and we retry once with a
  // fresh suffix in the rare case of a collision.
  const branchName = await createUniqueFixBranch(
    octokit,
    owner,
    repo,
    commitSha,
    baseRef.data.object.sha,
  );

  // Fetch current file content and apply fix
  const fileRes = (await octokit.request(
    "GET /repos/{owner}/{repo}/contents/{path}",
    { owner, repo, path: fix.filename, ref: branchName },
  )) as { data: { sha: string; content: string } };

  // Decode base64 content using Buffer (nodejs_compat enabled in wrangler.toml)
  const oldContent = Buffer.from(
    fileRes.data.content.replace(/\n/g, ""),
    "base64",
  ).toString("utf-8");
  const newContent = oldContent.replace(fix.old_code, fix.new_code);

  // Encode back to base64
  const newContentBase64 = Buffer.from(newContent, "utf-8").toString("base64");

  await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
    owner,
    repo,
    path: fix.filename,
    message: `🤖 BobOps: Auto-fix pipeline failure (confidence: ${analysis.confidence}%)`,
    content: newContentBase64,
    sha: fileRes.data.sha,
    branch: branchName,
  });

  // Open PR
  const pr = await octokit.request("POST /repos/{owner}/{repo}/pulls", {
    owner,
    repo,
    title: `🤖 [BobOps] ${analysis.root_cause.slice(0, 60)}`,
    body: buildPRBody(analysis),
    head: branchName,
    base: "main",
  });

  // Auto-merge when confidence is very high
  if (analysis.confidence >= 90) {
    try {
      await octokit.request(
        "PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge",
        { owner, repo, pull_number: pr.data.number, merge_method: "squash" },
      );
      return { url: pr.data.html_url, autoMerged: true };
    } catch {
      // branch protection may block auto-merge — fall through to return PR URL
    }
  }

  return { url: pr.data.html_url, autoMerged: false };
}

async function createUniqueFixBranch(
  octokit: Octokit,
  owner: string,
  repo: string,
  commitSha: string,
  baseSha: string,
): Promise<string> {
  const shortSha = commitSha.slice(0, 7);

  for (let attempt = 0; attempt < 3; attempt++) {
    const suffix = randomSuffix();
    const branchName = `bobops/auto-fix-${shortSha}-${suffix}`;
    try {
      await octokit.request("POST /repos/{owner}/{repo}/git/refs", {
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
      });
      return branchName;
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status !== 422) throw err;
      // 422 = "Reference already exists" — extremely unlikely with random suffix,
      // but if it does happen, try again with a fresh one.
    }
  }
  throw new Error("createUniqueFixBranch: exhausted retries after 422 collisions");
}

function randomSuffix(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

function buildPRBody(analysis: BobAnalysis): string {
  return `## 🤖 BobOps Auto-Fix

**Root Cause:** ${analysis.root_cause}

**Confidence:** ${analysis.confidence}%

**Affected Areas:** ${analysis.affected_areas.join(", ")}

**Explanation:** ${analysis.explanation}

---
*Generated by IBM watsonx.ai via BobOps*`;
}
