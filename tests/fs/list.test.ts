import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs/promises';
import * as path from 'path';
import { listDirectory, hasSubdirectories, sortEntries, filterByFilespec, matchFilespec } from '../../src/fs/list.js';
import type { FileEntry } from '../../src/fs/list.js';
import { detectTools } from '../../src/fs/detect-tools.js';

const TEST_DIR = '/tmp/claude/xtreejs-list-test';

beforeEach(async () => {
  await detectTools();
  await fs.rm(TEST_DIR, { recursive: true, force: true });
  await fs.mkdir(TEST_DIR, { recursive: true });
  await fs.mkdir(path.join(TEST_DIR, 'subdir'));
  await fs.writeFile(path.join(TEST_DIR, 'file.txt'), 'hello');
  await fs.writeFile(path.join(TEST_DIR, '.hidden'), 'secret');
  await fs.writeFile(path.join(TEST_DIR, 'script.sh'), '#!/bin/bash');
  await fs.chmod(path.join(TEST_DIR, 'script.sh'), 0o755);
  try {
    await fs.symlink(
      path.join(TEST_DIR, 'file.txt'),
      path.join(TEST_DIR, 'link.txt')
    );
  } catch {
    // Symlink creation may fail in sandboxed environments
  }
});

afterEach(async () => {
  await fs.rm(TEST_DIR, { recursive: true, force: true });
});

describe('listDirectory', () => {
  test('lists files and directories', async () => {
    const entries = await listDirectory(TEST_DIR);
    // At least subdir, file.txt, .hidden, script.sh (link.txt may not exist)
    expect(entries.length).toBeGreaterThanOrEqual(3);
    const names = entries.map((e) => e.name);
    expect(names).toContain('subdir');
    expect(names).toContain('file.txt');
  });

  test('directories come first', async () => {
    const entries = await listDirectory(TEST_DIR);
    const firstNonDir = entries.findIndex((e) => !e.isDirectory);
    const lastDir = entries.findLastIndex((e) => e.isDirectory);
    if (firstNonDir >= 0 && lastDir >= 0) {
      expect(lastDir).toBeLessThan(firstNonDir);
    }
  });

  test('detects directory entries', async () => {
    const entries = await listDirectory(TEST_DIR);
    const subdir = entries.find((e) => e.name === 'subdir');
    expect(subdir?.isDirectory).toBe(true);
  });

  test('detects executable files', async () => {
    const entries = await listDirectory(TEST_DIR);
    const script = entries.find((e) => e.name === 'script.sh');
    expect(script?.isExecutable).toBe(true);
  });

  test('detects symlinks', async () => {
    const entries = await listDirectory(TEST_DIR);
    const link = entries.find((e) => e.name === 'link.txt');
    if (link) {
      // Only assert if symlink was successfully created in setup
      expect(link.isSymlink).toBe(true);
    }
  });

  test('has correct size', async () => {
    const entries = await listDirectory(TEST_DIR);
    const file = entries.find((e) => e.name === 'file.txt');
    expect(file?.size).toBe(5); // "hello" = 5 bytes
  });

  test('returns empty for nonexistent dir', async () => {
    const entries = await listDirectory('/tmp/claude/nonexistent-dir-xyz');
    expect(entries).toEqual([]);
  });
});

describe('hasSubdirectories', () => {
  test('returns true when subdirs exist', async () => {
    expect(await hasSubdirectories(TEST_DIR)).toBe(true);
  });

  test('returns false for empty dir', async () => {
    const emptyDir = path.join(TEST_DIR, 'empty');
    await fs.mkdir(emptyDir);
    expect(await hasSubdirectories(emptyDir)).toBe(false);
  });

  test('returns false for dir with only files', async () => {
    const filesOnly = path.join(TEST_DIR, 'filesonly');
    await fs.mkdir(filesOnly);
    await fs.writeFile(path.join(filesOnly, 'a.txt'), 'a');
    expect(await hasSubdirectories(filesOnly)).toBe(false);
  });
});

function mockEntry(name: string, opts: Partial<FileEntry> = {}): FileEntry {
  return {
    name,
    path: `/test/${name}`,
    isDirectory: false,
    isSymlink: false,
    isExecutable: false,
    size: 100,
    mtime: new Date('2024-01-01'),
    ...opts,
  };
}

describe('sortEntries', () => {
  const entries: FileEntry[] = [
    mockEntry('zebra.ts', { size: 300, mtime: new Date('2024-03-01') }),
    mockEntry('alpha.js', { size: 100, mtime: new Date('2024-01-01') }),
    mockEntry('mydir', { isDirectory: true, size: 0 }),
    mockEntry('beta.ts', { size: 200, mtime: new Date('2024-02-01') }),
  ];

  test('sorts by name ascending', () => {
    const sorted = sortEntries(entries, 'name', 'asc');
    expect(sorted[0].name).toBe('mydir'); // dir first
    expect(sorted[1].name).toBe('alpha.js');
    expect(sorted[2].name).toBe('beta.ts');
    expect(sorted[3].name).toBe('zebra.ts');
  });

  test('sorts by name descending', () => {
    const sorted = sortEntries(entries, 'name', 'desc');
    expect(sorted[0].name).toBe('mydir'); // dir always first
    expect(sorted[1].name).toBe('zebra.ts');
    expect(sorted[2].name).toBe('beta.ts');
    expect(sorted[3].name).toBe('alpha.js');
  });

  test('sorts by extension', () => {
    const sorted = sortEntries(entries, 'ext', 'asc');
    expect(sorted[0].name).toBe('mydir'); // dir first
    // .js before .ts
    expect(sorted[1].name).toBe('alpha.js');
    // .ts entries sorted by name within ext group
    expect(sorted[2].name).toBe('beta.ts');
    expect(sorted[3].name).toBe('zebra.ts');
  });

  test('sorts by size ascending', () => {
    const sorted = sortEntries(entries, 'size', 'asc');
    expect(sorted[0].name).toBe('mydir'); // dir first (size 0)
    expect(sorted[1].name).toBe('alpha.js'); // 100
    expect(sorted[2].name).toBe('beta.ts'); // 200
    expect(sorted[3].name).toBe('zebra.ts'); // 300
  });

  test('sorts by date ascending', () => {
    const sorted = sortEntries(entries, 'date', 'asc');
    expect(sorted[0].name).toBe('mydir'); // dir first
    expect(sorted[1].name).toBe('alpha.js'); // Jan
    expect(sorted[2].name).toBe('beta.ts'); // Feb
    expect(sorted[3].name).toBe('zebra.ts'); // Mar
  });

  test('unsorted preserves insertion order', () => {
    const sorted = sortEntries(entries, 'unsorted');
    expect(sorted.map((e) => e.name)).toEqual(entries.map((e) => e.name));
  });

  test('directories always come first regardless of direction', () => {
    const mixed = [
      mockEntry('z.txt', { size: 1 }),
      mockEntry('adir', { isDirectory: true }),
      mockEntry('a.txt', { size: 2 }),
    ];
    const sorted = sortEntries(mixed, 'name', 'desc');
    expect(sorted[0].isDirectory).toBe(true);
  });
});

describe('filterByFilespec', () => {
  const entries: FileEntry[] = [
    mockEntry('dir', { isDirectory: true }),
    mockEntry('app.ts'),
    mockEntry('app.js'),
    mockEntry('readme.md'),
    mockEntry('data.json'),
  ];

  test('wildcard * returns all', () => {
    expect(filterByFilespec(entries, '*').length).toBe(5);
  });

  test('filters by extension pattern', () => {
    const filtered = filterByFilespec(entries, '*.ts');
    expect(filtered.length).toBe(2); // dir + app.ts
    expect(filtered.find((e) => e.name === 'app.ts')).toBeDefined();
    expect(filtered.find((e) => e.name === 'dir')).toBeDefined(); // dirs always shown
  });

  test('supports multiple space-separated specs', () => {
    const filtered = filterByFilespec(entries, '*.ts *.js');
    expect(filtered.length).toBe(3); // dir + app.ts + app.js
  });

  test('directories always pass filter', () => {
    const filtered = filterByFilespec(entries, '*.xyz');
    expect(filtered.length).toBe(1); // only dir
    expect(filtered[0].isDirectory).toBe(true);
  });

  test('case insensitive matching', () => {
    const upper = [mockEntry('FILE.TXT')];
    const filtered = filterByFilespec(upper, '*.txt');
    expect(filtered.length).toBe(1);
  });
});

describe('matchFilespec', () => {
  test('wildcard * matches everything', () => {
    expect(matchFilespec('anything.txt', '*')).toBe(true);
  });

  test('*.ext matches files with extension', () => {
    expect(matchFilespec('report.txt', '*.txt')).toBe(true);
    expect(matchFilespec('report.md', '*.txt')).toBe(false);
  });

  test('case insensitive', () => {
    expect(matchFilespec('FILE.TXT', '*.txt')).toBe(true);
    expect(matchFilespec('file.txt', '*.TXT')).toBe(true);
  });

  test('? matches single character', () => {
    expect(matchFilespec('a.ts', '?.ts')).toBe(true);
    expect(matchFilespec('ab.ts', '?.ts')).toBe(false);
  });

  test('prefix* matches', () => {
    expect(matchFilespec('readme.md', 'read*')).toBe(true);
    expect(matchFilespec('writing.md', 'read*')).toBe(false);
  });

  test('exact match', () => {
    expect(matchFilespec('Makefile', 'Makefile')).toBe(true);
    expect(matchFilespec('Other', 'Makefile')).toBe(false);
  });
});
