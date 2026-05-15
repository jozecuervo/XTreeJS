import { describe, expect, test } from 'bun:test';
import { Colors, TreeChars, Defaults } from '../../src/config/defaults.js';

describe('Colors', () => {
  test('has gold-on-royal file type colors', () => {
    expect(Colors.directory).toBe('#ffd700');
    expect(Colors.executable).toBe('#fff2a8');
    expect(Colors.hidden).toBe('#a9822a');
    expect(Colors.symlink).toBe('#fff2a8');
    expect(Colors.default).toBe('#d4af37');
  });

  test('has gold-on-royal UI colors', () => {
    expect(Colors.bg).toBe('#0000c8');
    expect(Colors.statusBarBg).toBe('#0000bf');
    expect(Colors.statusBarFg).toBe('#ffd700');
    expect(Colors.selectionBg).toBe('#d4af37');
    expect(Colors.selectionFg).toBe('#0000c8');
    expect(Colors.taggedBg).toBe('#ffd700');
    expect(Colors.taggedFg).toBe('#0000c8');
    expect(Colors.border).toBe('#d4af37');
    expect(Colors.borderFocused).toBe('#ffd700');
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
