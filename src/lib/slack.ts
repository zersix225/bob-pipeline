import type { BobAnalysis } from "./types";

export async function notifySlack(
  webhookUrl: string,
  analysis: BobAnalysis,
  prUrl: string,
  autoMerged: boolean,
  repo: string,
): Promise<void> {
  const statusEmoji = autoMerged ? "✅" : "👀";
  const actionText = autoMerged
    ? `Auto-merged into main (confidence: ${analysis.confidence}%)`
    : `PR ready for review (confidence: ${analysis.confidence}%)`;

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${statusEmoji} BobOps Fixed Your Pipeline`,
          },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Repository:*\n${repo}` },
            { type: "mrkdwn", text: `*Action:*\n${actionText}` },
            {
              type: "mrkdwn",
              text: `*Root Cause:*\n${analysis.root_cause}`,
            },
            {
              type: "mrkdwn",
              text: `*Affected Areas:*\n${analysis.affected_areas.join(", ") || "N/A"}`,
            },
          ],
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: analysis.explanation,
            },
          ],
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "View Pull Request →" },
              url: prUrl,
              style: "primary",
            },
          ],
        },
      ],
    }),
  });
}
