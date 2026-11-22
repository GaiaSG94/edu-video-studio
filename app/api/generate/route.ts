import { NextResponse } from "next/server";
import { createJob } from "@/lib/jobs";
import { runPipeline } from "@/lib/pipeline";
import type { GenerateRequest } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  let body: Partial<GenerateRequest>;
  try {
    body = (await request.json()) as Partial<GenerateRequest>;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length < 10) {
    return NextResponse.json({ error: "Le texte doit contenir au moins 10 caractères." }, { status: 400 });
  }
  if (text.length > 8000) {
    return NextResponse.json({ error: "Le texte ne doit pas dépasser 8000 caractères." }, { status: 400 });
  }

  const language = typeof body.language === "string" && body.language.trim()
    ? body.language.trim().slice(0, 10)
    : "fr";
  const voice = body.voice !== false;
  const job = createJob();

  void runPipeline(job, { text, language, voice });

  return NextResponse.json({ id: job.id, status: job.status }, { status: 202 });
}
