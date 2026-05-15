import blessed from 'neo-blessed';
import { Colors } from '../config/defaults.js';

export function createScreen(): blessed.Widgets.Screen {
  const screen = blessed.screen({
    smartCSR: true,
    title: 'XTreeJS',
    fullUnicode: true,
    autoPadding: true,
    warnings: false,
    cursor: {
      artificial: true,
      shape: 'block',
      blink: true,
      color: Colors.valueFg,
    },
  });

  // Fill entire screen with royal blue background
  blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    style: { bg: Colors.bg },
  });

  return screen;
}
