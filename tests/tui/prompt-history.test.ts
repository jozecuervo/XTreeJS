import { describe, expect, test, beforeEach } from 'bun:test';
import {
  getHistory,
  addToHistory,
  clearAllHistory,
  getLastPromptResponse,
} from '../../src/tui/prompt.js';

beforeEach(() => {
  clearAllHistory();
});

describe('prompt history', () => {
  test('addToHistory adds values', () => {
    addToHistory('test', 'value1');
    addToHistory('test', 'value2');
    const history = getHistory('test');
    expect(history).toEqual(['value2', 'value1']);
  });

  test('getHistory returns empty for unknown key', () => {
    expect(getHistory('unknown')).toEqual([]);
  });

  test('addToHistory deduplicates (moves to front)', () => {
    addToHistory('test', 'a');
    addToHistory('test', 'b');
    addToHistory('test', 'a'); // duplicate
    const history = getHistory('test');
    expect(history).toEqual(['a', 'b']);
  });

  test('addToHistory ignores empty values', () => {
    addToHistory('test', '');
    expect(getHistory('test')).toEqual([]);
  });

  test('histories are keyed independently', () => {
    addToHistory('copy', '/dst1');
    addToHistory('move', '/dst2');
    expect(getHistory('copy')).toEqual(['/dst1']);
    expect(getHistory('move')).toEqual(['/dst2']);
  });

  test('history caps at max limit', () => {
    for (let i = 0; i < 60; i++) {
      addToHistory('test', `value${i}`);
    }
    const history = getHistory('test');
    expect(history.length).toBe(50);
    expect(history[0]).toBe('value59');
  });

  test('clearAllHistory clears everything', () => {
    addToHistory('a', 'val1');
    addToHistory('b', 'val2');
    clearAllHistory();
    expect(getHistory('a')).toEqual([]);
    expect(getHistory('b')).toEqual([]);
  });
});
