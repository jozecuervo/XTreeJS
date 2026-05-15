import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  computeDirStats,
  getCachedDirStats,
  clearDirStatsCache,
  invalidateDirStats,
  formatStatsSize,
  computeStatsForPaths,
} from '../../src/fs/dir-stats.js';

const TEST_DIR = '/tmp/claude/xtreejs-dirstats-test';

beforeEach(async () => {
  clearDirStatsCache();
  await fs.rm(TEST_DIR, { recursive: true, force: true });
  await fs.mkdir(TEST_DIR, { recursive: true });
});

afterEach(async () => {
  clearDirStatsCache();
  await fs.rm(TEST_DIR, { recursive: true, force: true });
});

describe('computeDirStats', () => {
  test('counts files and totals size', async () => {
    await fs.writeFile(path.join(TEST_DIR, 'a.txt'), 'hello'); // 5 bytes
    await fs.writeFile(path.join(TEST_DIR, 'b.txt'), 'world!'); // 6 bytes
    await fs.mkdir(path.join(TEST_DIR, 'subdir'));

    const stats = await computeDirStats(TEST_DIR);
    expect(stats.fileCount).toBe(2);
    expect(stats.totalSize).toBe(11);
  });

  test('returns zeros for empty directory', async () => {
    const stats = await computeDirStats(TEST_DIR);
    expect(stats.fileCount).toBe(0);
    expect(stats.totalSize).toBe(0);
  });

  test('does not count subdirectories as files', async () => {
    await fs.mkdir(path.join(TEST_DIR, 'dir1'));
    await fs.mkdir(path.join(TEST_DIR, 'dir2'));
    await fs.writeFile(path.join(TEST_DIR, 'file.txt'), 'x');

    const stats = await computeDirStats(TEST_DIR);
    expect(stats.fileCount).toBe(1);
  });

  test('caches results', async () => {
    await fs.writeFile(path.join(TEST_DIR, 'a.txt'), 'test');
    const stats1 = await computeDirStats(TEST_DIR);

    // Add a file — cached result should not change
    await fs.writeFile(path.join(TEST_DIR, 'b.txt'), 'test2');
    const stats2 = await computeDirStats(TEST_DIR);
    expect(stats2).toBe(stats1); // same reference
    expect(stats2.fileCount).toBe(1);
  });

  test('returns zeros for non-existent directory', async () => {
    const stats = await computeDirStats('/tmp/claude/nonexistent-dir-xyz');
    expect(stats.fileCount).toBe(0);
    expect(stats.totalSize).toBe(0);
  });
});

describe('getCachedDirStats', () => {
  test('returns undefined when not cached', () => {
    expect(getCachedDirStats('/some/uncached/path')).toBeUndefined();
  });

  test('returns cached value after compute', async () => {
    await fs.writeFile(path.join(TEST_DIR, 'file.txt'), 'data');
    await computeDirStats(TEST_DIR);
    const cached = getCachedDirStats(TEST_DIR);
    expect(cached).toBeDefined();
    expect(cached!.fileCount).toBe(1);
  });
});

describe('clearDirStatsCache', () => {
  test('clears all cached entries', async () => {
    await computeDirStats(TEST_DIR);
    expect(getCachedDirStats(TEST_DIR)).toBeDefined();
    clearDirStatsCache();
    expect(getCachedDirStats(TEST_DIR)).toBeUndefined();
  });
});

describe('invalidateDirStats', () => {
  test('removes specific entry from cache', async () => {
    const sub = path.join(TEST_DIR, 'sub');
    await fs.mkdir(sub);
    await computeDirStats(TEST_DIR);
    await computeDirStats(sub);
    expect(getCachedDirStats(TEST_DIR)).toBeDefined();
    expect(getCachedDirStats(sub)).toBeDefined();

    invalidateDirStats(TEST_DIR);
    expect(getCachedDirStats(TEST_DIR)).toBeUndefined();
    expect(getCachedDirStats(sub)).toBeDefined(); // sub still cached
  });
});

describe('formatStatsSize', () => {
  test('formats zero', () => {
    expect(formatStatsSize(0)).toBe('0');
  });

  test('formats bytes', () => {
    expect(formatStatsSize(512)).toBe('512');
  });

  test('formats kilobytes', () => {
    expect(formatStatsSize(2048)).toBe('2K');
  });

  test('formats megabytes', () => {
    expect(formatStatsSize(1.5 * 1024 * 1024)).toBe('1.5M');
  });

  test('formats gigabytes', () => {
    expect(formatStatsSize(2.3 * 1024 * 1024 * 1024)).toBe('2.3G');
  });
});

describe('computeStatsForPaths', () => {
  test('computes stats for multiple paths', async () => {
    const sub1 = path.join(TEST_DIR, 'sub1');
    const sub2 = path.join(TEST_DIR, 'sub2');
    await fs.mkdir(sub1);
    await fs.mkdir(sub2);
    await fs.writeFile(path.join(sub1, 'a.txt'), 'aaa');
    await fs.writeFile(path.join(sub2, 'b.txt'), 'bb');

    await computeStatsForPaths([sub1, sub2]);
    const s1 = getCachedDirStats(sub1);
    const s2 = getCachedDirStats(sub2);
    expect(s1).toBeDefined();
    expect(s1!.fileCount).toBe(1);
    expect(s1!.totalSize).toBe(3);
    expect(s2).toBeDefined();
    expect(s2!.fileCount).toBe(1);
    expect(s2!.totalSize).toBe(2);
  });

  test('skips already cached paths', async () => {
    await fs.writeFile(path.join(TEST_DIR, 'x.txt'), 'x');
    await computeDirStats(TEST_DIR);
    const before = getCachedDirStats(TEST_DIR);

    // This should be a no-op for TEST_DIR since it's already cached
    await computeStatsForPaths([TEST_DIR]);
    const after = getCachedDirStats(TEST_DIR);
    expect(after).toBe(before); // same reference
  });

  test('handles empty array', async () => {
    await computeStatsForPaths([]);
    // Should not throw
  });
});
