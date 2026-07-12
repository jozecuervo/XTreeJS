import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  viewFileHex, viewFileAscii, viewFileJunk,
  searchInLines, wrapLines, expandTabs,
} from '../../src/fs/view.js';

const TEST_DIR = '/tmp/claude/xtreejs-view-test';

beforeEach(async () => {
  await fs.rm(TEST_DIR, { recursive: true, force: true });
  await fs.mkdir(TEST_DIR, { recursive: true });
  await fs.writeFile(path.join(TEST_DIR, 'hello.txt'), 'Hello, World!\nSecond line\n');
  // Write file with non-printable characters
  const buf = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x00, 0x01, 0x7f, 0x0a, 0x57, 0x6f, 0x72, 0x6c, 0x64]);
  await fs.writeFile(path.join(TEST_DIR, 'binary.bin'), buf);
});

afterEach(async () => {
  await fs.rm(TEST_DIR, { recursive: true, force: true });
});

describe('viewFileHex', () => {
  test('produces hex dump format', async () => {
    const result = await viewFileHex(path.join(TEST_DIR, 'hello.txt'));
    expect(result.lines.length).toBeGreaterThan(0);
    // First line should start with offset 00000000
    expect(result.lines[0]).toStartWith('00000000');
    // Should contain hex bytes
    expect(result.lines[0]).toContain('48');
    // Should contain ASCII representation with pipes
    expect(result.lines[0]).toContain('|');
  });

  test('handles binary files', async () => {
    const result = await viewFileHex(path.join(TEST_DIR, 'binary.bin'));
    expect(result.lines.length).toBeGreaterThan(0);
    // Non-printable chars should show as dots in ASCII column
    expect(result.lines[0]).toContain('.');
  });
});

describe('viewFileAscii', () => {
  test('returns raw text lines', async () => {
    const result = await viewFileAscii(path.join(TEST_DIR, 'hello.txt'));
    expect(result.lines[0]).toBe('Hello, World!');
    expect(result.lines[1]).toBe('Second line');
  });
});

describe('viewFileJunk', () => {
  test('strips non-printable characters', async () => {
    const result = await viewFileJunk(path.join(TEST_DIR, 'binary.bin'));
    // Non-printable bytes (0x00, 0x01, 0x7F) should be replaced with .
    const content = result.lines.join('\n');
    expect(content).toContain('Hello');
    expect(content).toContain('...');
    expect(content).toContain('World');
  });
});

describe('searchInLines', () => {
  test('finds matching line indices', () => {
    const lines = ['apple', 'banana', 'cherry', 'apple pie'];
    const matches = searchInLines(lines, 'apple');
    expect(matches).toEqual([0, 3]);
  });

  test('case insensitive search', () => {
    const lines = ['Hello', 'HELLO', 'hello', 'world'];
    const matches = searchInLines(lines, 'hello');
    expect(matches).toEqual([0, 1, 2]);
  });

  test('returns empty for no matches', () => {
    const lines = ['hello', 'world'];
    expect(searchInLines(lines, 'xyz')).toEqual([]);
  });

  test('returns empty for empty query', () => {
    expect(searchInLines(['a', 'b'], '')).toEqual([]);
  });
});

describe('expandTabs', () => {
  test('expands a leading tab to the next tab stop', () => {
    expect(expandTabs('\tabc', 4)).toBe('    abc');
  });

  test('expands tabs to align on tab-size boundaries', () => {
    expect(expandTabs('a\tb', 4)).toBe('a   b');
    expect(expandTabs('ab\tc', 4)).toBe('ab  c');
  });

  test('supports a different tab size', () => {
    expect(expandTabs('a\tb', 8)).toBe('a       b');
  });

  test('leaves lines without tabs unchanged', () => {
    expect(expandTabs('no tabs here', 4)).toBe('no tabs here');
  });

  test('handles multiple tabs in one line', () => {
    expect(expandTabs('\t\ta', 4)).toBe('        a');
  });
});

describe('wrapLines', () => {
  test('wraps long lines', () => {
    const lines = ['abcdefghij'];
    const wrapped = wrapLines(lines, 5);
    expect(wrapped).toEqual(['abcde', 'fghij']);
  });

  test('preserves short lines', () => {
    const lines = ['abc', 'de'];
    const wrapped = wrapLines(lines, 10);
    expect(wrapped).toEqual(['abc', 'de']);
  });

  test('wraps multiple long lines', () => {
    const lines = ['1234567890', 'short', 'abcdefghij'];
    const wrapped = wrapLines(lines, 5);
    expect(wrapped).toEqual(['12345', '67890', 'short', 'abcde', 'fghij']);
  });
});
