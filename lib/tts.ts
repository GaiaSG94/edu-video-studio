import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { hyperframes, probeDuration } from "./cli";

export type VoiceTrack = {
  src: string;
  duration: number;
  provider: "elevenlabs" | "kokoro";
};

const KOKORO_VOICES: Record<string, { voice: string; lang: string }> = {
  fr: { voice: "ff_siwis", lang: "fr-fr" },
  en: { voice: "af_heart", lang: "en-us" },
  es: { voice: "ef_dora", lang: "es" },
  it: { voice: "ff_siwis", lang: "it" },
  pt: { voice: "bf_emma", lang: "pt-br" },
  ja: { voice: "zf_xiaobei", lang: "ja" },
  zh: { voice: "zf_xiaobei", lang: "zh" },
};

async function elevenLabs(text: string, file: string): Promise<void> {
  const apiKey = process.env.ELEVENLABS_API_KEY as string;
  const voiceId = process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });
  if (!response.ok) throw new Error(`ElevenLabs HTTP ${response.status}`);
  await writeFile(file, Buffer.from(await response.arrayBuffer()));
}

async function kokoro(text: string, file: string, language: string, cwd: string): Promise<void> {
  const shortLang = language.slice(0, 2).toLowerCase();
  const preset = KOKORO_VOICES[shortLang] ?? { voice: "af_heart", lang: "en-us" };
  await hyperframes(
    ["tts", text, "-o", file, "-v", preset.voice, "-l", preset.lang],
    cwd,
  );
}

export async function synthesizeVoice(
  text: string,
  projectDir: string,
  index: number,
  language: string,
): Promise<VoiceTrack | null> {
  if (process.env.ELEVENLABS_API_KEY) {
    const src = `assets/voice_${index}.mp3`;
    const file = join(projectDir, src);
    try {
      await elevenLabs(text, file);
      const duration = await probeDuration(file);
      return duration ? { src, duration, provider: "elevenlabs" } : null;
    } catch {
      // Fallback to the local Kokoro voice below.
    }
  }
  const src = `assets/voice_${index}.wav`;
  const file = join(projectDir, src);
  try {
    await kokoro(text, file, language, projectDir);
    const duration = await probeDuration(file);
    return duration ? { src, duration, provider: "kokoro" } : null;
  } catch {
    return null;
  }
}
