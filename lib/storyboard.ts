import Anthropic from "@anthropic-ai/sdk";
import { buildDemoStoryboard } from "./demo-storyboard";
import type { Scene, Storyboard, StoryboardSource } from "./types";

const SYSTEM_PROMPT = `Tu es un pédagogue et un réalisateur de vidéos éducatives.
À partir du texte de l'utilisateur, tu produis un storyboard de vidéo courte (3 à 5 scènes).
Règles :
- Le titre est court (8 mots maximum), accrocheur et fidèle au texte.
- Chaque scène a un titre court (8 mots maximum), 2 à 3 points clés très courts (8 mots maximum chacun) et une narration orale de 1 à 3 phrases.
- La narration est fluide à l'oral, sans jargon inutile, et couvre tout le texte source.
- La langue de sortie est celle demandée par l'utilisateur.
- Ne pas inventer de faits absents du texte.
- Réponds uniquement via l'outil "storyboard".`;

const STORYBOARD_TOOL = {
  name: "storyboard",
  description: "Storyboard structuré d'une vidéo éducative",
  input_schema: {
    type: "object" as const,
    properties: {
      title: { type: "string", description: "Titre de la vidéo, 8 mots maximum" },
      language: { type: "string", description: "Code langue ISO, ex. fr ou en" },
      scenes: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: {
          type: "object",
          properties: {
            heading: { type: "string", description: "Titre de la scène, 8 mots maximum" },
            points: {
              type: "array",
              minItems: 2,
              maxItems: 3,
              items: { type: "string", description: "Point clé court, 8 mots maximum" },
            },
            narration: { type: "string", description: "Texte parlé pour cette scène" },
          },
          required: ["heading", "points", "narration"],
        },
      },
    },
    required: ["title", "language", "scenes"],
  },
};

function normalizeStoryboard(input: unknown, fallbackLanguage: string): Storyboard {
  const raw = input as Partial<Storyboard>;
  const scenes: Scene[] = (raw.scenes ?? [])
    .filter((scene) => scene && typeof scene.narration === "string")
    .slice(0, 5)
    .map((scene) => ({
      heading: String(scene.heading ?? "Point clé").slice(0, 70),
      points: (scene.points ?? []).filter(Boolean).slice(0, 3).map((point) => String(point).slice(0, 110)),
      narration: String(scene.narration).slice(0, 600),
    }));
  if (scenes.length === 0) throw new Error("Le storyboard renvoyé par Claude ne contient aucune scène.");
  return {
    title: String(raw.title ?? "Vidéo éducative").slice(0, 70),
    language: String(raw.language ?? fallbackLanguage),
    scenes,
  };
}

async function withClaude(text: string, language: string): Promise<Storyboard> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5",
    max_tokens: 2500,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Langue de sortie : ${language}\n\nTexte source :\n${text}`,
      },
    ],
    tools: [STORYBOARD_TOOL],
    tool_choice: { type: "tool", name: "storyboard" },
  });
  const toolBlock = response.content.find((block) => block.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("Claude n'a pas renvoyé de storyboard exploitable.");
  }
  return normalizeStoryboard(toolBlock.input, language);
}

export async function generateStoryboard(
  text: string,
  language: string,
): Promise<{ storyboard: Storyboard; source: StoryboardSource }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { storyboard: buildDemoStoryboard(text, language), source: "demo" };
  }
  try {
    return { storyboard: await withClaude(text, language), source: "claude" };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Échec de la génération Claude (vérifie ANTHROPIC_MODEL et ANTHROPIC_API_KEY) : ${detail}`);
  }
}
