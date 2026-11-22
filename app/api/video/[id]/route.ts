import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getJob } from "@/lib/jobs";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  if (!/^[a-zA-Z0-9-]+$/.test(id)) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }
  const job = getJob(id);
  if (!job?.videoPath) {
    return NextResponse.json({ error: "Vidéo introuvable." }, { status: 404 });
  }

  const file = join(process.cwd(), "public", "videos", `${id}.mp4`);
  try {
    const info = await stat(file);
    const stream = Readable.toWeb(createReadStream(file)) as ReadableStream;
    return new NextResponse(stream, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(info.size),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Fichier vidéo indisponible." }, { status: 404 });
  }
}
