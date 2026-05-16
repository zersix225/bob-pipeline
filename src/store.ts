import type { PipelineEvent } from "./lib/types";

const MAX_EVENTS = 50;

// Module-level store — shared within a single Cloudflare Workers instance.
// Fine for local dev and hackathon demo; swap for KV/D1 in production.
const events: PipelineEvent[] = [];

export function addEvent(event: PipelineEvent): void {
  events.unshift(event); // newest first
  if (events.length > MAX_EVENTS) events.pop();
}

export function updateEvent(id: string, patch: Partial<PipelineEvent>): void {
  const idx = events.findIndex((e) => e.id === id);
  if (idx !== -1) {
    events[idx] = { ...events[idx], ...patch };
  }
}

export function getEvents(): PipelineEvent[] {
  return events;
}
