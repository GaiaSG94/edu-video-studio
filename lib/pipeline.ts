import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildComposition, computeTimings } from "./composition";
import { setStatus, updateJob } from "./jobs";
import { checkProject, createProject, renderProject } from "./render";
import { generateStoryboard } from "./storyboard";
import { synthesizeVoice, type VoiceTrack } from "./tts";
import type { GenerateRequest, Job } from "./types";

const VOICE_PROGRESS_START = 35;
const VOICE_PROGRESS_END = 60;

export async function runPipeline(job: Job, request: GenerateRequest): Promise<void> {
  const workDir = join(tmpdir(), "edu-video-studio", job.id);
  try {
    setStatus(job.id, "storyboard", 10, "Claude rédige le storyboard…");
    const { storyboard, source } = await generateStoryboard(request.text, request.language);
    updateJob(job.id, { storyboard, source });

    setStatus(job.id, "audio", VOICE_PROGRESS_START, "Préparation de la bande son…");
    await mkdir(join(workDir, "assets"), { recursive: true });
    const voices: Array<VoiceTrack | null> = [];
    for (let index = 0; index < storyboard.scenes.length; index += 1) {
      if (request.voice) {
        voices.push(await synthesizeVoice(storyboard.scenes[index].narration, workDir, index, request.language));
      } else {
        voices.push(null);
      }
      const progress = VOICE_PROGRESS_START + ((index + 1) / storyboard.scenes.length) * (VOICE_PROGRESS_END - VOICE_PROGRESS_START);
      setStatus(job.id, "audio", Math.round(progress), "Génération de la voix off…");
    }
    const audioEnabled = voices.some((voice) => voice !== null);
    updateJob(job.id, { audioEnabled });

    setStatus(job.id, "rendering", 65, "Assemblage de la composition…");
    await createProject(workDir);
    const timings = computeTimings(storyboard, voices);
    await writeFile(join(workDir, "index.html"), buildComposition(storyboard, timings));

    const errors = await checkProject(workDir);
    if (errors.length > 0) {
      setStatus(job.id, "rendering", 70, `${errors.length} avertissement(s) de composition, rendu en cours…`);
    }

    const outputDir = join(process.cwd(), "public", "videos");
    await mkdir(outputDir, { recursive: true });
    const output = join(outputDir, `${job.id}.mp4`);
    setStatus(job.id, "rendering", 80, "Rendu HyperFrames en cours…");
    await renderProject(workDir, output);

    updateJob(job.id, { videoPath: `/api/video/${job.id}` });
    setStatus(job.id, "done", 100, "Vidéo prête !");
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    updateJob(job.id, { status: "error", error: message, message: "Échec de la génération" });
  }
}
