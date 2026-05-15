import * as fs from 'fs/promises';
import * as path from 'path';

export interface DirStats {
  fileCount: number;
  totalSize: number;
}

const cache = new Map<string, DirStats>();

export function getCachedDirStats(dirPath: string): DirStats | undefined {
  return cache.get(dirPath);
}

export function clearDirStatsCache(): void {
  cache.clear();
}

export function invalidateDirStats(dirPath: string): void {
  cache.delete(dirPath);
}

/**
 * Compute file count and total size for a single directory (non-recursive, immediate children only).
 * Caches the result.
 */
export async function computeDirStats(dirPath: string): Promise<DirStats> {
  const cached = cache.get(dirPath);
  if (cached) return cached;

  let fileCount = 0;
  let totalSize = 0;

  try {
    const entries = await fs.readdir(dirPath);
    // Stat all entries in parallel for speed
    const statResults = await Promise.allSettled(
      entries.map(async (name) => {
        const fullPath = path.join(dirPath, name);
        const stat = await fs.lstat(fullPath);
        return { stat, isDir: stat.isDirectory() };
      })
    );

    for (const result of statResults) {
      if (result.status === 'fulfilled' && !result.value.isDir) {
        fileCount++;
        totalSize += result.value.stat.size;
      }
    }
  } catch {
    // Can't read dir — return zeros
  }

  const stats = { fileCount, totalSize };
  cache.set(dirPath, stats);
  return stats;
}

/**
 * Format bytes into a compact human-readable string like XTree.
 */
export function formatStatsSize(bytes: number): string {
  if (bytes === 0) return '0';
  if (bytes < 1024) return `${bytes}`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}K`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}G`;
}

/**
 * Compute stats for a list of directory paths in the background.
 * Returns a promise that resolves when all are done.
 * Skips paths that are already cached.
 */
export async function computeStatsForPaths(paths: string[]): Promise<void> {
  const uncached = paths.filter((p) => !cache.has(p));
  if (uncached.length === 0) return;

  // Process in batches to avoid overwhelming the filesystem
  const BATCH_SIZE = 8;
  for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
    const batch = uncached.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(batch.map((p) => computeDirStats(p)));
  }
}
