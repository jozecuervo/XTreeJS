import { describe, expect, test, afterEach } from 'bun:test';
import { getDiskStats, clearDiskStatsCache } from '../../src/fs/disk-stats.js';
import { detectTools } from '../../src/fs/detect-tools.js';

afterEach(() => {
  clearDiskStatsCache();
});

describe('getDiskStats', () => {
  test('returns disk stats for current directory', async () => {
    await detectTools();
    const stats = await getDiskStats('/');
    expect(stats.mountpoint).toBeTruthy();
    expect(stats.total).toBeTruthy();
    expect(stats.available).toBeTruthy();
  });

  test('returns cached result on second call', async () => {
    await detectTools();
    const stats1 = await getDiskStats('/');
    const stats2 = await getDiskStats('/');
    expect(stats1.total).toBe(stats2.total);
    expect(stats1.available).toBe(stats2.available);
  });

  test('handles nonexistent path gracefully', async () => {
    await detectTools();
    const stats = await getDiskStats('/nonexistent-path-xyz-test');
    // Should still return something (may use fallback)
    expect(stats).toBeDefined();
    expect(typeof stats.total).toBe('string');
  });
});
