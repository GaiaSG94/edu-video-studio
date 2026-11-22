import type { Scene, Storyboard } from "./types";

const MAX_SCENES = 5;

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  const head = value.slice(0, max - 1);
  const boundary = head.lastIndexOf(" ");
  return `${(boundary > max / 2 ? head.slice(0, boundary) : head).trimEnd()}…`;
}

function makeScene(chunk: string[], index: number, language: string): Scene {
  const headingSource = chunk[0] ?? "Vidéo éducative";
  const heading = truncate(headingSource.replace(/[.!?]$/, ""), 70);
  const points = chunk.slice(0, 3).map((sentence) => truncate(sentence.replace(/[.!?]$/, ""), 110));
  const intro = language.toLowerCase().startsWith("fr") ? "Point clé" : "Key point";
  return {
    heading: index === 0 && heading.length > 40 ? truncate(heading, 45) : heading,
    points: points.length > 0 ? points : [intro],
    narration: chunk.join(" "),
  };
}

export function buildDemoStoryboard(text: string, language: string): Storyboard {
  const sentences = splitSentences(text);
  const chunkSize = Math.max(1, Math.ceil(sentences.length / MAX_SCENES));
  const chunks: string[][] = [];
  for (let i = 0; i < sentences.length; i += chunkSize) {
    chunks.push(sentences.slice(i, i + chunkSize));
  }
  const safeChunks = chunks.length > 0 ? chunks : [[truncate(text, 240)]];
  const title = truncate(sentences[0] ?? text, 60);
  return {
    title,
    language,
    scenes: safeChunks.map((chunk, index) => makeScene(chunk, index, language)),
  };
}
