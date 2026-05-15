import blessed from 'neo-blessed';
import { Colors, fg, TreeChars } from '../config/defaults.js';
import type { TreeNode } from '../state/tree-state.js';
import { getCachedDirStats, formatStatsSize } from '../fs/dir-stats.js';

import type { DisplayMode } from '../state/app-state.js';

export interface TreePane {
  widget: blessed.Widgets.ListElement;
  refresh(nodes: TreeNode[], currentPath: string): void;
  setFocused(focused: boolean): void;
  getSelectedIndex(): number;
  setSelectedIndex(index: number): void;
  setDisplayMode(mode: DisplayMode): void;
}

export function createTreePane(screen: blessed.Widgets.Screen): TreePane {
  const widget = blessed.list({
    parent: screen,
    label: ' Tree ',
    left: 0,
    top: 1, // below status bar
    width: '40%',
    height: '100%-2', // leave room for top and bottom bars
    border: { type: 'line' },
    style: {
      bg: Colors.bg,
      border: { fg: Colors.border, bg: Colors.bg },
      label: { fg: Colors.titleFg, bg: Colors.bg, bold: true },
      selected: { bg: Colors.selectionBg, fg: Colors.selectionFg },
      item: { fg: Colors.default, bg: Colors.bg },
    },
    keys: false,
    vi: false,
    mouse: false,
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: '█',
      style: { fg: Colors.border },
    },
    tags: true,
  } as any);

  function formatTreeLine(node: TreeNode, currentPath: string): string {
    const indent = '  '.repeat(node.depth);
    let prefix = '';
    if (node.depth > 0) {
      prefix = node.isLast ? TreeChars.elbow : TreeChars.tee;
      prefix += ' ';
    }
    const expandIcon = node.hasSubdirs
      ? node.expanded
        ? TreeChars.expanded
        : TreeChars.collapsed
      : '   ';

    const name = node.name;
    const isCurrent = node.path === currentPath;
    const color = isCurrent ? Colors.selectionBg : Colors.directory;

    // Show directory stats if cached
    const stats = getCachedDirStats(node.path);
    let statsStr = '';
    if (stats) {
      const sizeStr = formatStatsSize(stats.totalSize);
      statsStr = `  ${fg(`${stats.fileCount} files  ${sizeStr}`, Colors.valueFg)}`;
    }

    return `${indent}${prefix}${fg(`${expandIcon} ${name}`, color)}${statsStr}`;
  }

  function refresh(nodes: TreeNode[], currentPath: string): void {
    const items = nodes.map((n) => formatTreeLine(n, currentPath));
    widget.setItems(items as any);
    // Try to select the current path
    const idx = nodes.findIndex((n) => n.path === currentPath);
    if (idx >= 0) {
      widget.select(idx);
    }
    screen.render();
  }

  function setFocused(focused: boolean): void {
    (widget.style.border as any).fg = focused
      ? Colors.borderFocused
      : Colors.border;
    widget.focus();
    screen.render();
  }

  function getSelectedIndex(): number {
    return (widget as any).selected ?? 0;
  }

  function setSelectedIndex(index: number): void {
    widget.select(index);
    screen.render();
  }

  function setDisplayMode(mode: DisplayMode): void {
    if (mode === 'dir') {
      widget.width = '75%';
      widget.top = 1;
      widget.height = '50%-1';
      widget.show();
    } else if (mode === 'small') {
      widget.width = '40%';
      widget.top = 1;
      widget.height = '100%-2';
      widget.show();
    } else {
      // expanded — hide tree
      widget.hide();
    }
    screen.render();
  }

  return { widget, refresh, setFocused, getSelectedIndex, setSelectedIndex, setDisplayMode };
}
