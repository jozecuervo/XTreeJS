import { $ } from 'bun';

export interface AvailableTools {
  fd: boolean;
  bat: boolean;
  trash: boolean;
  rsync: boolean;
  dust: boolean;
  duf: boolean;
  chafa: boolean;
}

async function commandExists(cmd: string): Promise<boolean> {
  try {
    const result = await $`which ${cmd}`.quiet();
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

let cachedTools: AvailableTools | null = null;

export async function detectTools(): Promise<AvailableTools> {
  if (cachedTools) return cachedTools;

  const [fd, bat, trash, rsync, dust, duf, chafa] = await Promise.all([
    commandExists('fd'),
    commandExists('bat'),
    commandExists('trash'),
    commandExists('rsync'),
    commandExists('dust'),
    commandExists('duf'),
    commandExists('chafa'),
  ]);

  cachedTools = { fd, bat, trash, rsync, dust, duf, chafa };
  return cachedTools;
}

export function getCachedTools(): AvailableTools | null {
  return cachedTools;
}

export function setCachedToolsForTesting(
  tools: AvailableTools | null
): void {
  cachedTools = tools;
}
