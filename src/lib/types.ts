export interface PipelineContext {
  repoFullName: string;
  owner: string;
  repo: string;
  branch: string;
  commitSha: string;
  runId: number;
  logs: string;
  changedFiles: Record<string, string>;
  repoTree: string;
}

export interface BobFix {
  filename: string;
  old_code: string;
  new_code: string;
}

export interface BobAnalysis {
  root_cause: string;
  fix: BobFix;
  confidence: number;
  affected_areas: string[];
  explanation: string;
}

export type EventStatus =
  | "detecting"
  | "analyzing"
  | "fixing"
  | "pr_created"
  | "auto_merged"
  | "notified"
  | "error";

export interface TimelineStep {
  label: string;
  timestamp: string;
  status: "done" | "error";
}

export interface PipelineEvent {
  id: string;
  timestamp: string;
  repo: string;
  branch: string;
  commitSha: string;
  runId: number;
  status: EventStatus;
  analysis?: BobAnalysis;
  prUrl?: string;
  autoMerged?: boolean;
  error?: string;
  steps: TimelineStep[];
  durationMs?: number;
}
