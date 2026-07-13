import { describe, expect, test } from 'bun:test';
import { formatHelp } from '../../src/tui/help-pane.js';

const ENTRIES = [
  { key: 'q', description: 'Exit viewer' },
  { key: 'J (shift)', description: 'Toggle junk mode (strip non-printable)' },
];

describe('formatHelp', () => {
  test('renders one line per entry when width is generous', () => {
    const lines = formatHelp(ENTRIES, 70);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('q');
    expect(lines[0]).toContain('Exit viewer');
  });

  test('wraps a description that does not fit into the available width', () => {
    // Narrow enough that "Toggle junk mode (strip non-printable)" (38 chars)
    // cannot fit alongside the 16-char key column.
    const lines = formatHelp(ENTRIES, 30);
    const wrappedForSecondEntry = lines.filter((l) => l.includes('Toggle') || l.includes('non-printable'));
    expect(wrappedForSecondEntry.length).toBeGreaterThan(1);
  });

  test('continuation lines are indented past the key column, not re-keyed', () => {
    const lines = formatHelp(ENTRIES, 30);
    const continuationLine = lines.find((l) => l.includes('non-printable'));
    expect(continuationLine).toBeDefined();
    // Continuation lines shouldn't repeat the key text.
    expect(continuationLine).not.toContain('J (shift)');
  });

  test('never produces a description line wider than the requested width', () => {
    const width = 40;
    const lines = formatHelp(ENTRIES, width);
    for (const line of lines) {
      // Strip blessed color tags before measuring visible width.
      const visible = line.replace(/\{[^}]*\}/g, '');
      expect(visible.length).toBeLessThanOrEqual(width);
    }
  });
});
