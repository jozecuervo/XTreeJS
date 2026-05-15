import { describe, expect, test } from 'bun:test';
import {
  createAppState,
  toggleTag,
  tagAll,
  untagCurrent,
  untagAll,
  invertTags,
  getVisibleEntries,
  getSelectedEntry,
  getOperationTargets,
} from '../../src/state/app-state.js';
import type { FileEntry } from '../../src/fs/list.js';

function mockEntry(name: string, isDir = false): FileEntry {
  return {
    name,
    path: `/test/${name}`,
    isDirectory: isDir,
    isSymlink: false,
    isExecutable: false,
    size: 100,
    mtime: new Date(),
  };
}

describe('createAppState', () => {
  test('initializes with correct defaults', () => {
    const state = createAppState('/home');
    expect(state.currentPath).toBe('/home');
    expect(state.entries).toEqual([]);
    expect(state.selectedIndex).toBe(0);
    expect(state.taggedPaths.size).toBe(0);
    expect(state.sortOrder).toBe('name');
    expect(state.sortDirection).toBe('asc');
    expect(state.filespecFilter).toBe('*');
    expect(state.filespecHistory).toEqual(['*']);
    expect(state.displayMode).toBe('dir');
    expect(state.listingMode).toBe('normal');
    expect(state.branchBasePath).toBeNull();
    expect(state.showTaggedOnly).toBe(false);
    expect(state.viewMode).toBe('normal');
    expect(state.focusPane).toBe('files');
    expect(state.viewerState).toBeNull();
  });
});

describe('tagging', () => {
  test('toggleTag adds and removes', () => {
    const state = createAppState('/home');
    toggleTag(state, '/test/file.txt');
    expect(state.taggedPaths.has('/test/file.txt')).toBe(true);
    toggleTag(state, '/test/file.txt');
    expect(state.taggedPaths.has('/test/file.txt')).toBe(false);
  });

  test('tagAll tags all non-directory entries', () => {
    const state = createAppState('/home');
    state.entries = [
      mockEntry('dir1', true),
      mockEntry('file1.txt'),
      mockEntry('file2.txt'),
      mockEntry('dir2', true),
    ];
    tagAll(state);
    expect(state.taggedPaths.size).toBe(2);
    expect(state.taggedPaths.has('/test/file1.txt')).toBe(true);
    expect(state.taggedPaths.has('/test/file2.txt')).toBe(true);
    expect(state.taggedPaths.has('/test/dir1')).toBe(false);
  });

  test('untagCurrent removes specific tag', () => {
    const state = createAppState('/home');
    state.taggedPaths.add('/test/file1.txt');
    state.taggedPaths.add('/test/file2.txt');
    untagCurrent(state, '/test/file1.txt');
    expect(state.taggedPaths.size).toBe(1);
    expect(state.taggedPaths.has('/test/file1.txt')).toBe(false);
    expect(state.taggedPaths.has('/test/file2.txt')).toBe(true);
  });

  test('untagAll clears all tags', () => {
    const state = createAppState('/home');
    state.taggedPaths.add('/test/file1.txt');
    state.taggedPaths.add('/test/file2.txt');
    untagAll(state);
    expect(state.taggedPaths.size).toBe(0);
  });

  test('invertTags toggles all file tags', () => {
    const state = createAppState('/home');
    state.entries = [
      mockEntry('dir1', true),
      mockEntry('file1.txt'),
      mockEntry('file2.txt'),
      mockEntry('file3.txt'),
    ];
    state.taggedPaths.add('/test/file1.txt');
    invertTags(state);
    expect(state.taggedPaths.has('/test/file1.txt')).toBe(false);
    expect(state.taggedPaths.has('/test/file2.txt')).toBe(true);
    expect(state.taggedPaths.has('/test/file3.txt')).toBe(true);
    expect(state.taggedPaths.has('/test/dir1')).toBe(false); // dirs never tagged
  });
});

describe('getSelectedEntry', () => {
  test('returns entry at selectedIndex', () => {
    const state = createAppState('/home');
    state.entries = [mockEntry('a.txt'), mockEntry('b.txt')];
    state.selectedIndex = 1;
    const entry = getSelectedEntry(state);
    expect(entry?.name).toBe('b.txt');
  });

  test('returns undefined for empty entries', () => {
    const state = createAppState('/home');
    expect(getSelectedEntry(state)).toBeUndefined();
  });

  test('uses visible entries when tagged-only filter is active', () => {
    const state = createAppState('/home');
    state.entries = [mockEntry('a.txt'), mockEntry('b.txt'), mockEntry('c.txt')];
    state.taggedPaths.add('/test/b.txt');
    state.showTaggedOnly = true;
    state.selectedIndex = 0;

    expect(getVisibleEntries(state).map((entry) => entry.name)).toEqual(['b.txt']);
    expect(getSelectedEntry(state)?.name).toBe('b.txt');
  });
});

describe('getOperationTargets', () => {
  test('returns tagged files when tags exist', () => {
    const state = createAppState('/home');
    state.entries = [mockEntry('a.txt'), mockEntry('b.txt'), mockEntry('c.txt')];
    state.taggedPaths.add('/test/a.txt');
    state.taggedPaths.add('/test/c.txt');
    state.selectedIndex = 1; // b.txt is selected, but tagged files take priority
    const targets = getOperationTargets(state);
    expect(targets.length).toBe(2);
    expect(targets.map((t) => t.name)).toEqual(['a.txt', 'c.txt']);
  });

  test('returns current selection when no tags', () => {
    const state = createAppState('/home');
    state.entries = [mockEntry('a.txt'), mockEntry('b.txt')];
    state.selectedIndex = 0;
    const targets = getOperationTargets(state);
    expect(targets.length).toBe(1);
    expect(targets[0].name).toBe('a.txt');
  });
});
