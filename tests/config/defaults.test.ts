import { describe, expect, test } from 'bun:test';
import { Colors, TreeChars, Defaults } from '../../src/config/defaults.js';

describe('Colors', () => {
  test('has XTree Pro Gold file type colors', () => {
    expect(Colors.directory).toBe('yellow');
    expect(Colors.executable).toBe('white');
    expect(Colors.hidden).toBe('cyan');
    expect(Colors.symlink).toBe('cyan');
    expect(Colors.default).toBe('yellow');
  });

  test('has XTree Pro Gold UI colors', () => {
    expect(Colors.bg).toBe('blue');
    expect(Colors.statusBarBg).toBe('blue');
    expect(Colors.statusBarFg).toBe('yellow');
    expect(Colors.selectionBg).toBe('cyan');
    expect(Colors.selectionFg).toBe('blue');
    expect(Colors.taggedBg).toBe('white');
    expect(Colors.taggedFg).toBe('blue');
    expect(Colors.border).toBe('yellow');
    expect(Colors.borderFocused).toBe('white');
  });
});

describe('TreeChars', () => {
  test('has DOS-style tree characters', () => {
    expect(TreeChars.pipe).toBe('│');
    expect(TreeChars.tee).toBe('├──');
    expect(TreeChars.elbow).toBe('└──');
    expect(TreeChars.expanded).toBe('[-]');
    expect(TreeChars.collapsed).toBe('[+]');
  });
});

describe('Defaults', () => {
  test('has layout percentages', () => {
    expect(Defaults.treeWidthPercent).toBe(40);
    expect(Defaults.fileWidthPercent).toBe(60);
  });

  test('has title', () => {
    expect(Defaults.title).toBe('XTreeJS');
  });

  test('startPath is cwd', () => {
    expect(Defaults.startPath).toBe(process.cwd());
  });
});
