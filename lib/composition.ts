import type { VoiceTrack } from "./tts";
import type { Storyboard } from "./types";

export type SceneTiming = {
  start: number;
  duration: number;
  voice?: VoiceTrack;
};

function estimateDuration(narration: string): number {
  const words = narration.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(14, Math.max(3.5, words / 2.5 + 1.4));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export function computeTimings(storyboard: Storyboard, voices: Array<VoiceTrack | null>): SceneTiming[] {
  const timings: SceneTiming[] = [];
  let cursor = 0;
  storyboard.scenes.forEach((scene, index) => {
    const voice = voices[index] ?? undefined;
    const duration = round(voice ? Math.max(3.2, voice.duration + 0.7) : estimateDuration(scene.narration));
    timings.push({ start: cursor, duration, voice });
    cursor += duration;
  });
  return timings;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sceneMarkup(storyboard: Storyboard, timings: SceneTiming[], index: number): string {
  const scene = storyboard.scenes[index];
  const timing = timings[index];
  const kicker = index === 0 ? "VIDÉO ÉDUCATIVE" : `PARTIE ${String(index + 1).padStart(2, "0")}`;
  const counter = `${String(index + 1).padStart(2, "0")} / ${String(timings.length).padStart(2, "0")}`;
  const points = scene.points
    .map(
      (point, pointIndex) =>
        `<div id="scene-${index}-point-${pointIndex}" class="point"><span class="bullet"></span><span>${escapeHtml(point)}</span></div>`,
    )
    .join("\n          ");
  return `<section id="scene-${index}" class="scene clip" data-start="${timing.start}" data-duration="${timing.duration}" data-track-index="0">
          <div id="scene-${index}-kicker" class="kicker">${kicker} · ${escapeHtml(storyboard.language.toUpperCase())}</div>
          <h2 id="scene-${index}-heading" class="heading">${escapeHtml(scene.heading)}</h2>
          <div class="points">
          ${points}
          </div>
          <div id="scene-${index}-counter" class="counter">${counter}</div>
          <div class="progress"><div id="scene-${index}-progress" class="progress-fill"></div></div>
        </section>`;
}

function audioMarkup(timings: SceneTiming[]): string {
  return timings
    .filter((timing) => timing.voice)
    .map(
      (timing, index) =>
        `<audio id="voice-${index}" src="${timing.voice?.src}" data-start="${timing.start}" data-duration="${timing.duration}" data-volume="1"></audio>`,
    )
    .join("\n    ");
}

function animationMarkup(storyboard: Storyboard, timings: SceneTiming[]): string {
  const lines: string[] = ["const tl = gsap.timeline({ paused: true });"];
  timings.forEach((timing, index) => {
    const at = timing.start;
    lines.push(`tl.fromTo("#scene-${index}-kicker", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }, ${round(at + 0.1)});`);
    lines.push(`tl.fromTo("#scene-${index}-heading", { opacity: 0, y: 44 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, ${round(at + 0.25)});`);
    storyboard.scenes[index].points.forEach((_, pointIndex) => {
      lines.push(`tl.fromTo("#scene-${index}-point-${pointIndex}", { opacity: 0, x: 36 }, { opacity: 1, x: 0, duration: 0.45, ease: "power2.out" }, ${round(at + 0.55 + pointIndex * 0.16)});`);
    });
    lines.push(`tl.fromTo("#scene-${index}-progress", { scaleX: 0 }, { scaleX: 1, duration: ${timing.duration}, ease: "none" }, ${at});`);
  });
  lines.push('window.__timelines["main"] = tl;');
  return lines.join("\n    ");
}

export function buildComposition(storyboard: Storyboard, timings: SceneTiming[]): string {
  const total = round(timings.reduce((sum, timing) => sum + timing.duration, 0));
  const scenes = storyboard.scenes.map((_, index) => sceneMarkup(storyboard, timings, index)).join("\n      ");
  return `<!doctype html>
<html lang="${escapeHtml(storyboard.language)}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      :root { --bg: #0b1020; --ink: #f8fafc; --muted: #a5b4fc; --accent: #7c3aed; --accent2: #22d3ee; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: var(--bg); }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; color: var(--ink); font-family: sans-serif; }
      .bg { position: absolute; inset: 0; background: radial-gradient(circle at 78% 18%, rgba(124,58,237,.38), transparent 42%), radial-gradient(circle at 12% 88%, rgba(34,211,238,.22), transparent 45%); }
      .scene { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; padding: 130px 160px 170px; }
      .kicker { font-size: 30px; font-weight: 700; letter-spacing: .18em; color: var(--accent2); margin-bottom: 36px; }
      .heading { font-size: 84px; line-height: 1.08; font-weight: 700; letter-spacing: -.03em; max-width: 1500px; }
      .points { display: flex; flex-direction: column; gap: 26px; margin-top: 52px; }
      .point { display: flex; align-items: baseline; gap: 24px; font-size: 40px; line-height: 1.25; color: var(--muted); }
      .bullet { width: 14px; height: 14px; border-radius: 50%; background: var(--accent2); flex: 0 0 auto; }
      .counter { position: absolute; top: 96px; right: 160px; font-size: 30px; font-weight: 600; color: var(--muted); }
      .progress { position: absolute; left: 160px; right: 160px; bottom: 96px; height: 8px; border-radius: 99px; background: rgba(255,255,255,.14); }
      .progress-fill { width: 100%; height: 100%; border-radius: 99px; transform-origin: left center; background: linear-gradient(90deg, var(--accent), var(--accent2)); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-width="1920" data-height="1080" data-duration="${total}">
      <div class="bg"></div>
      ${scenes}
      ${audioMarkup(timings)}
    </div>
    <script>
    ${animationMarkup(storyboard, timings)}
    </script>
  </body>
</html>
`;
}
