import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { hyperframes } from "./cli";

export async function createProject(projectDir: string): Promise<void> {
  await mkdir(join(projectDir, "assets"), { recursive: true });
  await writeFile(
    join(projectDir, "hyperframes.json"),
    JSON.stringify(
      {
        $schema: "https://hyperframes.heygen.com/schema/hyperframes.json",
        registry: "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry",
        paths: { blocks: "compositions", components: "compositions/components", assets: "assets" },
        media: { autoProxy: true },
      },
      null,
      2,
    ),
  );
  await writeFile(
    join(projectDir, "meta.json"),
    JSON.stringify({ id: "edu-video", name: "edu-video", createdAt: new Date().toISOString() }, null, 2),
  );
  await writeFile(
    join(projectDir, "package.json"),
    JSON.stringify({ name: "edu-video", private: true, type: "module" }, null, 2),
  );
}

export async function checkProject(projectDir: string): Promise<string[]> {
  try {
    const { stdout } = await hyperframes(["check", "--json"], projectDir);
    const start = stdout.indexOf("{");
    const end = stdout.lastIndexOf("}");
    if (start === -1 || end <= start) return [];
    const report = JSON.parse(stdout.slice(start, end + 1)) as {
      findings?: Array<{ severity?: string; message?: string }>;
    };
    return (report.findings ?? [])
      .filter((finding) => finding.severity === "error")
      .map((finding) => finding.message ?? "Erreur inconnue");
  } catch {
    return [];
  }
}

export async function renderProject(projectDir: string, output: string): Promise<void> {
  await hyperframes(["render", "--quality", "looks", "--output", output], projectDir);
}
