import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs/promises';
import * as path from 'path';
import { listDirectoryRecursive, listAllFilesRecursive } from '../../src/fs/list.js';
import { detectTools } from '../../src/fs/detect-tools.js';

const TEST_DIR = '/tmp/claude/xtreejs-recursive-test';

beforeEach(async () => {
  await detectTools();
  await fs.rm(TEST_DIR, { recursive: true, force: true });
  await fs.mkdir(TEST_DIR, { recursive: true });
  await fs.mkdir(path.join(TEST_DIR, 'subdir'));
  await fs.mkdir(path.join(TEST_DIR, 'subdir', 'deep'));
  await fs.writeFile(path.join(TEST_DIR, 'root.txt'), 'root');
  await fs.writeFile(path.join(TEST_DIR, 'subdir', 'mid.txt'), 'mid');
  await fs.writeFile(path.join(TEST_DIR, 'subdir', 'deep', 'bottom.ts'), 'bottom');
  await fs.writeFile(path.join(TEST_DIR, 'another.ts'), 'another');
});

afterEach(async () => {
  await fs.rm(TEST_DIR, { recursive: true, force: true });
});

describe('listDirectoryRecursive', () => {
  test('returns files from all levels', async () => {
    const entries = await listDirectoryRecursive(TEST_DIR);
    expect(entries.length).toBe(4);
    const names = entries.map((e) => e.name);
    expect(names).toContain('root.txt');
    expect(names).toContain(path.join('subdir', 'mid.txt'));
    expect(names).toContain(path.join('subdir', 'deep', 'bottom.ts'));
    expect(names).toContain('another.ts');
  });

  test('entries have absolute paths', async () => {
    const entries = await listDirectoryRecursive(TEST_DIR);
    for (const entry of entries) {
      expect(entry.path.startsWith('/')).toBe(true);
    }
  });

  test('entries are files only (no directories)', async () => {
    const entries = await listDirectoryRecursive(TEST_DIR);
    for (const entry of entries) {
      expect(entry.isDirectory).toBe(false);
    }
  });

  test('respects filespec filter', async () => {
    const entries = await listDirectoryRecursive(TEST_DIR, 'name', 'asc', '*.ts');
    expect(entries.length).toBe(2);
    const names = entries.map((e) => e.name);
    expect(names).toContain(path.join('subdir', 'deep', 'bottom.ts'));
    expect(names).toContain('another.ts');
  });

  test('sorts entries', async () => {
    const entries = await listDirectoryRecursive(TEST_DIR, 'name', 'asc');
    const names = entries.map((e) => e.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    expect(names).toEqual(sorted);
  });
});

describe('listAllFilesRecursive', () => {
  test('returns all file paths', async () => {
    const paths = await listAllFilesRecursive(TEST_DIR);
    expect(paths.length).toBe(4);
    expect(paths).toContain(path.join(TEST_DIR, 'root.txt'));
    expect(paths).toContain(path.join(TEST_DIR, 'subdir', 'mid.txt'));
    expect(paths).toContain(path.join(TEST_DIR, 'subdir', 'deep', 'bottom.ts'));
    expect(paths).toContain(path.join(TEST_DIR, 'another.ts'));
  });

  test('returns empty for empty directory', async () => {
    const emptyDir = path.join(TEST_DIR, 'empty');
    await fs.mkdir(emptyDir);
    const paths = await listAllFilesRecursive(emptyDir);
    expect(paths.length).toBe(0);
  });
});
