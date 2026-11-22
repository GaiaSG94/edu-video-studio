import { randomUUID } from "node:crypto";
import type { Job, JobStatus } from "./types";

type JobStore = Map<string, Job>;

const globalState = globalThis as typeof globalThis & { __eduVideoJobs?: JobStore };
const store: JobStore = globalState.__eduVideoJobs ?? new Map<string, Job>();
globalState.__eduVideoJobs = store;

export function createJob(): Job {
  const job: Job = {
    id: randomUUID(),
    status: "queued",
    progress: 0,
    message: "File d'attente",
    createdAt: Date.now(),
  };
  store.set(job.id, job);
  return job;
}

export function getJob(id: string): Job | undefined {
  return store.get(id);
}

export function updateJob(
  id: string,
  patch: Partial<Pick<Job, "status" | "progress" | "message" | "source" | "storyboard" | "audioEnabled" | "videoPath" | "error">>,
): Job | undefined {
  const job = store.get(id);
  if (!job) return undefined;
  Object.assign(job, patch);
  return job;
}

export function setStatus(id: string, status: JobStatus, progress: number, message: string): void {
  updateJob(id, { status, progress, message });
}
