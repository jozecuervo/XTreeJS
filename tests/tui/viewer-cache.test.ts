import { describe, expect, test, beforeEach } from 'bun:test';
import { getScrollCache, clearScrollCache } from '../../src/tui/viewer-pane.js';

beforeEach(() => {
  clearScrollCache();
});

describe('viewer scroll position cache', () => {
  test('starts empty', () => {
    expect(getScrollCache().size).toBe(0);
  });

  test('stores and retrieves scroll positions', () => {
    const cache = getScrollCache();
    cache.set('/path/file1.txt', 42);
    cache.set('/path/file2.txt', 100);
    expect(cache.get('/path/file1.txt')).toBe(42);
    expect(cache.get('/path/file2.txt')).toBe(100);
  });

  test('returns undefined for uncached files', () => {
    expect(getScrollCache().get('/unknown/file.txt')).toBeUndefined();
  });

  test('clearScrollCache empties the cache', () => {
    const cache = getScrollCache();
    cache.set('/path/a.txt', 10);
    cache.set('/path/b.txt', 20);
    clearScrollCache();
    expect(getScrollCache().size).toBe(0);
  });

  test('overwrites existing entries', () => {
    const cache = getScrollCache();
    cache.set('/path/file.txt', 10);
    cache.set('/path/file.txt', 50);
    expect(cache.get('/path/file.txt')).toBe(50);
  });
});
