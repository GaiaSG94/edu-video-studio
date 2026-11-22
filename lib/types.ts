export type Scene = {
  heading: string;
  points: string[];
  narration: string;
};

export type Storyboard = {
  title: string;
  language: string;
  scenes: Scene[];
};

export type StoryboardSource = "claude" | "demo";

export type JobStatus =
  | "queued"
  | "storyboard"
  | "audio"
  | "rendering"
  | "done"
  | "error";

export type Job = {
  id: string;
  status: JobStatus;
  progress: number;
  message: string;
  createdAt: number;
  source?: StoryboardSource;
  storyboard?: Storyboard;
  audioEnabled?: boolean;
  videoPath?: string;
  error?: string;
};

export type GenerateRequest = {
  text: string;
  language: string;
  voice: boolean;
};
