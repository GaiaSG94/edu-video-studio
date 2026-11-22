import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type CommandResult = { stdout: string; stderr: string };

export async function runCommand(
  command: string,
  args: string[],
  options: { cwd?: string; timeout?: number } = {},
): Promise<CommandResult> {
  const { stdout, stderr } = await execFileAsync(command, args, {
    cwd: options.cwd,
    timeout: options.timeout ?? 600_000,
    maxBuffer: 20 * 1024 * 1024,
    windowsHide: true,
  });
  return { stdout: String(stdout), stderr: String(stderr) };
}

export function hyperframesPath(): string {
  return join(process.cwd(), "node_modules", "hyperframes", "bin", "hyperframes.mjs");
}

export async function hyperframes(args: string[], cwd?: string): Promise<CommandResult> {
  return runCommand(process.execPath, [hyperframesPath(), ...args], { cwd });
}

export async function probeDuration(file: string): Promise<number | null> {
  try {
    const { stdout } = await runCommand("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      file,
    ]);
    const duration = Number.parseFloat(stdout.trim());
    return Number.isFinite(duration) && duration > 0 ? duration : null;
  } catch {
    return null;
  }
}
