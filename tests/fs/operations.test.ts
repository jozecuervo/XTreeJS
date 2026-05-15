import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  copyFiles, moveFiles, deleteFiles, pruneDirectory,
  renameFile, makeDirectory, getFileAttributes, patternRename,
} from '../../src/fs/operations.js';
import {
  detectTools,
  setCachedToolsForTesting,
} from '../../src/fs/detect-tools.js';
import type { AvailableTools } from '../../src/fs/detect-tools.js';

const TEST_DIR = '/tmp/claude/xtreejs-ops-test';
const SRC_DIR = path.join(TEST_DIR, 'src');
const DST_DIR = path.join(TEST_DIR, 'dst');
let originalTools: AvailableTools | null = null;

beforeEach(async () => {
  originalTools = { ...(await detectTools()) };
  await fs.rm(TEST_DIR, { recursive: true, force: true });
  await fs.mkdir(SRC_DIR, { recursive: true });
  await fs.mkdir(DST_DIR, { recursive: true });
  await fs.writeFile(path.join(SRC_DIR, 'file1.txt'), 'content1');
  await fs.writeFile(path.join(SRC_DIR, 'file2.txt'), 'content2');
  await fs.mkdir(path.join(SRC_DIR, 'subdir'));
  await fs.writeFile(path.join(SRC_DIR, 'subdir', 'nested.txt'), 'nested');
});

afterEach(async () => {
  setCachedToolsForTesting(originalTools);
  await fs.rm(TEST_DIR, { recursive: true, force: true });
});

describe('copyFiles', () => {
  test('copies a single file', async () => {
    const result = await copyFiles(
      [path.join(SRC_DIR, 'file1.txt')],
      DST_DIR
    );
    expect(result.success).toBe(true);
    const content = await fs.readFile(path.join(DST_DIR, 'file1.txt'), 'utf-8');
    expect(content).toBe('content1');
  });

  test('copies multiple files', async () => {
    const result = await copyFiles(
      [path.join(SRC_DIR, 'file1.txt'), path.join(SRC_DIR, 'file2.txt')],
      DST_DIR
    );
    expect(result.success).toBe(true);
    const names = await fs.readdir(DST_DIR);
    expect(names).toContain('file1.txt');
    expect(names).toContain('file2.txt');
  });

  test('source files still exist after copy', async () => {
    await copyFiles([path.join(SRC_DIR, 'file1.txt')], DST_DIR);
    const exists = await fs
      .access(path.join(SRC_DIR, 'file1.txt'))
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });

  test('creates destination directory if needed', async () => {
    const newDst = path.join(TEST_DIR, 'newdir');
    const result = await copyFiles(
      [path.join(SRC_DIR, 'file1.txt')],
      newDst
    );
    expect(result.success).toBe(true);
  });
});

describe('moveFiles', () => {
  test('moves a file to destination', async () => {
    const result = await moveFiles(
      [path.join(SRC_DIR, 'file1.txt')],
      DST_DIR
    );
    expect(result.success).toBe(true);
    // File should be at destination
    const content = await fs.readFile(path.join(DST_DIR, 'file1.txt'), 'utf-8');
    expect(content).toBe('content1');
    // File should not be at source
    const exists = await fs
      .access(path.join(SRC_DIR, 'file1.txt'))
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(false);
  });

  test('does not partially move when a later destination already exists', async () => {
    await fs.writeFile(path.join(DST_DIR, 'file2.txt'), 'existing');

    const result = await moveFiles(
      [path.join(SRC_DIR, 'file1.txt'), path.join(SRC_DIR, 'file2.txt')],
      DST_DIR
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Destination already exists');
    await expect(fs.readFile(path.join(SRC_DIR, 'file1.txt'), 'utf-8')).resolves.toBe('content1');
    await expect(fs.readFile(path.join(SRC_DIR, 'file2.txt'), 'utf-8')).resolves.toBe('content2');
    await expect(fs.readFile(path.join(DST_DIR, 'file2.txt'), 'utf-8')).resolves.toBe('existing');
  });
});

describe('deleteFiles', () => {
  test('removes a file', async () => {
    const filePath = path.join(SRC_DIR, 'file1.txt');
    const result = await deleteFiles([filePath]);
    const exists = await fs
      .access(filePath)
      .then(() => true)
      .catch(() => false);
    if (result.success) {
      expect(exists).toBe(false);
    } else {
      expect(result.error).toContain('trash');
      expect(exists).toBe(true);
    }
  });

  test('fails safely when trash is unavailable', async () => {
    setCachedToolsForTesting({
      fd: true,
      bat: true,
      trash: false,
      rsync: true,
      dust: true,
      duf: true,
      chafa: true,
    });
    const filePath = path.join(SRC_DIR, 'file1.txt');
    const result = await deleteFiles([filePath]);
    expect(result.success).toBe(false);
    expect(result.error).toContain('trash');
    const exists = await fs
      .access(filePath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });
});

describe('pruneDirectory', () => {
  test('removes entire directory tree', async () => {
    const dirPath = path.join(SRC_DIR, 'subdir');
    const result = await pruneDirectory(dirPath);
    const exists = await fs
      .access(dirPath)
      .then(() => true)
      .catch(() => false);
    if (result.success) {
      expect(exists).toBe(false);
    } else {
      expect(result.error).toContain('trash');
      expect(exists).toBe(true);
    }
  });

  test('fails on non-directory', async () => {
    const result = await pruneDirectory(path.join(SRC_DIR, 'file1.txt'));
    expect(result.success).toBe(false);
    expect(result.error).toBe('Not a directory');
  });

  test('fails safely when trash is unavailable', async () => {
    setCachedToolsForTesting({
      fd: true,
      bat: true,
      trash: false,
      rsync: true,
      dust: true,
      duf: true,
      chafa: true,
    });
    const dirPath = path.join(SRC_DIR, 'subdir');
    const result = await pruneDirectory(dirPath);
    expect(result.success).toBe(false);
    expect(result.error).toContain('trash');
    const exists = await fs
      .access(dirPath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });
});

describe('renameFile', () => {
  test('renames a file in same directory', async () => {
    const result = await renameFile(
      path.join(SRC_DIR, 'file1.txt'),
      'renamed.txt'
    );
    expect(result.success).toBe(true);
    const exists = await fs
      .access(path.join(SRC_DIR, 'renamed.txt'))
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
    const oldExists = await fs
      .access(path.join(SRC_DIR, 'file1.txt'))
      .then(() => true)
      .catch(() => false);
    expect(oldExists).toBe(false);
  });

  test('fails for nonexistent file', async () => {
    const result = await renameFile(
      path.join(SRC_DIR, 'nonexistent.txt'),
      'new.txt'
    );
    expect(result.success).toBe(false);
  });

  test('rejects path traversal names', async () => {
    const result = await renameFile(
      path.join(SRC_DIR, 'file1.txt'),
      '../escaped.txt'
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('file name');
    await expect(fs.readFile(path.join(SRC_DIR, 'file1.txt'), 'utf-8')).resolves.toBe('content1');
    await expect(fs.access(path.join(TEST_DIR, 'escaped.txt'))).rejects.toThrow();
  });
});

describe('makeDirectory', () => {
  test('creates a new directory', async () => {
    const result = await makeDirectory(SRC_DIR, 'newdir');
    expect(result.success).toBe(true);
    const stat = await fs.lstat(path.join(SRC_DIR, 'newdir'));
    expect(stat.isDirectory()).toBe(true);
  });

  test('creates nested directories', async () => {
    const result = await makeDirectory(SRC_DIR, 'deep/nested');
    expect(result.success).toBe(true);
    const stat = await fs.lstat(path.join(SRC_DIR, 'deep', 'nested'));
    expect(stat.isDirectory()).toBe(true);
  });
});

describe('getFileAttributes', () => {
  test('returns file attributes', async () => {
    const attrs = await getFileAttributes(path.join(SRC_DIR, 'file1.txt'));
    expect(attrs.size).toBe(8); // "content1"
    expect(attrs.isDirectory).toBe(false);
    expect(attrs.isSymlink).toBe(false);
    expect(typeof attrs.permissions).toBe('string');
    expect(typeof attrs.owner).toBe('number');
    expect(attrs.mtime).toBeInstanceOf(Date);
  });

  test('detects directory', async () => {
    const attrs = await getFileAttributes(path.join(SRC_DIR, 'subdir'));
    expect(attrs.isDirectory).toBe(true);
  });
});

describe('patternRename', () => {
  test('renames *.txt to *.md', async () => {
    const files = [
      path.join(SRC_DIR, 'file1.txt'),
      path.join(SRC_DIR, 'file2.txt'),
    ];
    const result = await patternRename(files, '*.txt', '*.md');
    expect(result.success).toBe(true);
    expect(result.renamed).toBe(2);
    const names = await fs.readdir(SRC_DIR);
    expect(names).toContain('file1.md');
    expect(names).toContain('file2.md');
    expect(names).not.toContain('file1.txt');
    expect(names).not.toContain('file2.txt');
  });

  test('skips files not matching from pattern', async () => {
    // nested.txt is in subdir, but we pass the subdir file path
    const nestedPath = path.join(SRC_DIR, 'subdir', 'nested.txt');
    const result = await patternRename([nestedPath], '*.js', '*.ts');
    expect(result.renamed).toBe(0);
    // Original file should still exist
    const exists = await fs.access(nestedPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });

  test('handles no matching files', async () => {
    const result = await patternRename([], '*.txt', '*.md');
    expect(result.success).toBe(true);
    expect(result.renamed).toBe(0);
  });

  test('returns errors for failed renames', async () => {
    const fakeFiles = ['/tmp/claude/nonexistent-xyz-file.txt'];
    const result = await patternRename(fakeFiles, '*.txt', '*.md');
    expect(result.renamed).toBe(0);
  });
});
