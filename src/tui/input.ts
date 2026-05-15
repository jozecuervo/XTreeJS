import * as path from 'path';
import blessed from 'neo-blessed';
import type { AppState } from '../state/app-state.js';
import {
  getSelectedEntry,
  toggleTag,
  tagAll,
  untagCurrent,
  untagAll,
  invertTags,
  getVisibleEntries,
  clampSelectedIndex,
} from '../state/app-state.js';
import type { TreeState } from '../state/tree-state.js';
import {
  expandNode,
  collapseNode,
  toggleNode,
  refreshFlatNodes,
  deepDive,
  findNextSibling,
  findPrevSibling,
} from '../state/tree-state.js';

export interface InputCallbacks {
  onNavigate(path: string): void;
  onRefresh(): void;
  onQuit(): void;
  onCopy(): void;
  onMove(): void;
  onDelete(): void;
  onPrune(): void;
  onView(): void;
  onTabSwitch(): void;
  onTreeSelect(path: string): void;
  onSort(): void;
  onSortDirection(): void;
  onFilespec(): void;
  onToggleFilespec(): void;
  onInvertTag(): void;
  onInvertAllTags(): void;
  onSpeedNav(letter: string): void;
  onRename(): void;
  onMakeDir(): void;
  onAttributes(): void;
  onEditor(): void;
  onDeepDive(): void;
  onNextSibling(): void;
  onPrevSibling(): void;
  onTreeRoot(): void;
  onDisplayCycle(): void;
  onForceRefresh(): void;
  onHelp(): void;
  onQuickRef(): void;
  onBranchMode(): void;
  onShowallMode(): void;
  onTagByFilespec(): void;
  onUntagByFilespec(): void;
  onTagAllGlobal(): void;
  onUntagAllGlobal(): void;
  onToggleTaggedOnly(): void;
  onPatternRename(): void;
}

export function setupInput(
  screen: blessed.Widgets.Screen,
  state: AppState,
  treeState: TreeState,
  callbacks: InputCallbacks
): void {
  screen.key(['q', 'x'], () => {
    if (state.viewMode === 'viewer') return; // handled by viewer
    callbacks.onQuit();
  });

  screen.key(['C-c'], () => {
    callbacks.onQuit();
  });

  screen.key(['tab'], () => {
    if (state.viewMode !== 'normal') return;
    callbacks.onTabSwitch();
  });

  screen.key(['up', 'k'], () => {
    if (state.viewMode !== 'normal') return;

    if (state.focusPane === 'files') {
      if (state.selectedIndex > 0) {
        state.selectedIndex--;
        callbacks.onRefresh();
      }
    } else {
      // Tree navigation handled via tree pane's selected index
      const treeWidget = (screen as any)._treeWidget;
      if (treeWidget) {
        treeWidget.up(1);
        screen.render();
      }
    }
  });

  screen.key(['down', 'j'], () => {
    if (state.viewMode !== 'normal') return;

    if (state.focusPane === 'files') {
      if (state.selectedIndex < getVisibleEntries(state).length - 1) {
        state.selectedIndex++;
        callbacks.onRefresh();
      }
    } else {
      const treeWidget = (screen as any)._treeWidget;
      if (treeWidget) {
        treeWidget.down(1);
        screen.render();
      }
    }
  });

  screen.key(['enter'], () => {
    if (state.viewMode !== 'normal') return;

    if (state.focusPane === 'files') {
      const entry = getSelectedEntry(state);
      if (entry?.isDirectory) {
        callbacks.onNavigate(entry.path);
      } else if (entry) {
        // Non-directory: cycle display mode
        callbacks.onDisplayCycle();
      }
    } else {
      // In tree: expand or navigate to selected dir
      const treeWidget = (screen as any)._treeWidget;
      const idx = treeWidget ? (treeWidget as any).selected ?? 0 : 0;
      const node = treeState.flatNodes[idx];
      if (node) {
        if (node.hasSubdirs && !node.expanded) {
          expandNode(node).then(() => {
            refreshFlatNodes(treeState);
            callbacks.onTreeSelect(node.path);
          });
        } else {
          callbacks.onTreeSelect(node.path);
        }
      }
    }
  });

  screen.key(['right', 'l'], () => {
    if (state.viewMode !== 'normal') return;

    if (state.focusPane === 'files') {
      const entry = getSelectedEntry(state);
      if (entry?.isDirectory) {
        callbacks.onNavigate(entry.path);
      }
    } else {
      // In tree: deep-dive — expand and follow first child
      callbacks.onDeepDive();
    }
  });

  screen.key(['left', 'backspace', 'h'], () => {
    if (state.viewMode !== 'normal') return;

    if (state.focusPane === 'files') {
      const parent = path.dirname(state.currentPath);
      if (parent !== state.currentPath) {
        callbacks.onNavigate(parent);
      }
    } else {
      // In tree: macOS pattern — if expanded, collapse; if collapsed, jump to parent
      const treeWidget = (screen as any)._treeWidget;
      const idx = treeWidget ? (treeWidget as any).selected ?? 0 : 0;
      const node = treeState.flatNodes[idx];
      if (node && node.expanded) {
        collapseNode(node);
        refreshFlatNodes(treeState);
        callbacks.onRefresh();
      } else if (node && node.depth > 0) {
        // Jump to parent: scan backwards for first node at depth - 1
        for (let i = idx - 1; i >= 0; i--) {
          if (treeState.flatNodes[i].depth === node.depth - 1) {
            treeWidget?.select(i);
            const parentNode = treeState.flatNodes[i];
            callbacks.onTreeSelect(parentNode.path);
            break;
          }
        }
      }
    }
  });

  screen.key(['\\'], () => {
    if (state.viewMode !== 'normal') return;
    if (state.listingMode !== 'normal') {
      // In branch/showall: jump to parent dir of highlighted file, exit special mode
      const entry = getSelectedEntry(state);
      if (entry) {
        const parentDir = path.dirname(entry.path);
        state.listingMode = 'normal';
        state.branchBasePath = null;
        callbacks.onNavigate(parentDir);
        return;
      }
    }
    callbacks.onNavigate('/');
  });

  screen.key(['home'], () => {
    if (state.viewMode !== 'normal') return;
    if (state.focusPane === 'files') {
      state.selectedIndex = 0;
      callbacks.onRefresh();
    } else {
      callbacks.onTreeRoot();
    }
  });

  screen.key(['end'], () => {
    if (state.viewMode !== 'normal') return;
    if (state.focusPane === 'files') {
      state.selectedIndex = Math.max(0, getVisibleEntries(state).length - 1);
      callbacks.onRefresh();
    }
  });

  screen.key(['pageup'], () => {
    if (state.viewMode !== 'normal') return;
    if (state.focusPane === 'files') {
      state.selectedIndex = Math.max(0, state.selectedIndex - 20);
      callbacks.onRefresh();
    }
  });

  screen.key(['pagedown'], () => {
    if (state.viewMode !== 'normal') return;
    if (state.focusPane === 'files') {
      state.selectedIndex = Math.min(
        Math.max(0, getVisibleEntries(state).length - 1),
        state.selectedIndex + 20
      );
      callbacks.onRefresh();
    }
  });

  // Tagging
  screen.key(['t'], () => {
    if (state.viewMode !== 'normal' || state.focusPane !== 'files') return;
    const entry = getSelectedEntry(state);
    if (entry && !entry.isDirectory) {
      toggleTag(state, entry.path);
      // Move down after tagging
      if (!state.showTaggedOnly && state.selectedIndex < getVisibleEntries(state).length - 1) {
        state.selectedIndex++;
      }
      clampSelectedIndex(state);
      callbacks.onRefresh();
    }
  });

  screen.key(['S-t'], () => {
    if (state.viewMode !== 'normal') return;
    tagAll(state);
    callbacks.onRefresh();
  });

  screen.key(['u'], () => {
    if (state.viewMode !== 'normal' || state.focusPane !== 'files') return;
    const entry = getSelectedEntry(state);
    if (entry) {
      untagCurrent(state, entry.path);
      if (!state.showTaggedOnly && state.selectedIndex < getVisibleEntries(state).length - 1) {
        state.selectedIndex++;
      }
      clampSelectedIndex(state);
      callbacks.onRefresh();
    }
  });

  screen.key(['S-u'], () => {
    if (state.viewMode !== 'normal') return;
    untagAll(state);
    callbacks.onRefresh();
  });

  // Tree expand/collapse (when tree focused)
  screen.key(['+', '='], () => {
    if (state.viewMode !== 'normal' || state.focusPane !== 'tree') return;
    const treeWidget = (screen as any)._treeWidget;
    const idx = treeWidget ? (treeWidget as any).selected ?? 0 : 0;
    const node = treeState.flatNodes[idx];
    if (node && !node.expanded && node.hasSubdirs) {
      expandNode(node).then(() => {
        refreshFlatNodes(treeState);
        callbacks.onRefresh();
      });
    }
  });

  screen.key(['-'], () => {
    if (state.viewMode !== 'normal' || state.focusPane !== 'tree') return;
    const treeWidget = (screen as any)._treeWidget;
    const idx = treeWidget ? (treeWidget as any).selected ?? 0 : 0;
    const node = treeState.flatNodes[idx];
    if (node && node.expanded) {
      collapseNode(node);
      refreshFlatNodes(treeState);
      callbacks.onRefresh();
    }
  });

  screen.key(['*'], () => {
    if (state.viewMode !== 'normal' || state.focusPane !== 'tree') return;
    const treeWidget = (screen as any)._treeWidget;
    const idx = treeWidget ? (treeWidget as any).selected ?? 0 : 0;
    const node = treeState.flatNodes[idx];
    if (node) {
      toggleNode(node)?.then?.(() => {
        refreshFlatNodes(treeState);
        callbacks.onRefresh();
      });
      if (node.expanded === false) {
        // Was sync collapse
        refreshFlatNodes(treeState);
        callbacks.onRefresh();
      }
    }
  });

  // Force refresh
  screen.key(['f2'], () => {
    if (state.viewMode !== 'normal') return;
    callbacks.onForceRefresh();
  });

  // Sibling navigation in tree
  screen.key(['`'], () => {
    if (state.viewMode !== 'normal' || state.focusPane !== 'tree') return;
    callbacks.onNextSibling();
  });

  // File operations
  screen.key(['c', 'f5'], () => {
    if (state.viewMode !== 'normal') return;
    callbacks.onCopy();
  });

  screen.key(['f6'], () => {
    if (state.viewMode !== 'normal') return;
    callbacks.onMove();
  });

  screen.key(['m'], () => {
    if (state.viewMode !== 'normal') return;
    if (state.focusPane === 'tree') {
      callbacks.onMakeDir();
    } else {
      callbacks.onMove();
    }
  });

  screen.key(['d', 'f7'], () => {
    if (state.viewMode !== 'normal') return;
    callbacks.onDelete();
  });

  screen.key(['f8'], () => {
    if (state.viewMode !== 'normal') return;
    callbacks.onPrune();
  });

  // Viewer
  screen.key(['f3', 'v'], () => {
    if (state.viewMode !== 'normal') return;
    callbacks.onView();
  });

  // Sorting
  screen.key(['s'], () => {
    if (state.viewMode !== 'normal' || state.focusPane !== 'files') return;
    callbacks.onSort();
  });

  screen.key(['S-s'], () => {
    if (state.viewMode !== 'normal') return;
    callbacks.onSortDirection();
  });

  // Filespec filter
  screen.key(['f'], () => {
    if (state.viewMode !== 'normal' || state.focusPane !== 'files') return;
    callbacks.onFilespec();
  });

  screen.key(['C-f'], () => {
    if (state.viewMode !== 'normal') return;
    callbacks.onToggleFilespec();
  });

  // Invert tags
  screen.key(['i'], () => {
    if (state.viewMode !== 'normal' || state.focusPane !== 'files') return;
    callbacks.onInvertTag();
  });

  screen.key(['C-i'], () => {
    if (state.viewMode !== 'normal') return;
    callbacks.onInvertAllTags();
  });

  // Rename
  screen.key(['n', 'r'], () => {
    if (state.viewMode !== 'normal' || state.focusPane !== 'files') return;
    callbacks.onRename();
  });

  // Attributes
  screen.key(['a'], () => {
    if (state.viewMode !== 'normal' || state.focusPane !== 'files') return;
    callbacks.onAttributes();
  });

  // External editor
  screen.key(['e', 'f4'], () => {
    if (state.viewMode !== 'normal') return;
    callbacks.onEditor();
  });

  // Help
  screen.key(['?', 'f1'], () => {
    if (state.viewMode === 'viewer') return; // viewer handles its own keys
    callbacks.onHelp();
  });

  screen.key(['f10'], () => {
    if (state.viewMode === 'viewer') return;
    callbacks.onQuickRef();
  });

  // Branch mode
  screen.key(['b'], () => {
    if (state.viewMode !== 'normal' || state.focusPane !== 'files') return;
    callbacks.onBranchMode();
  });

  // Showall mode (s in tree pane)
  // Note: 's' in files pane is sort (handled above with focusPane guard)
  // We add showall as a separate check when tree is focused
  // The existing 's' handler returns early if focusPane !== 'files'
  // so we handle tree-focused 's' here
  screen.on('keypress', (ch: string, key: blessed.Widgets.Events.IKeyEventArg) => {
    if (state.viewMode !== 'normal') return;
    if (key.name === 's' && !key.shift && !key.ctrl && state.focusPane === 'tree') {
      callbacks.onShowallMode();
    }
  });

  // Tag by filespec (+/= in files pane)
  screen.on('keypress', (ch: string, key: blessed.Widgets.Events.IKeyEventArg) => {
    if (state.viewMode !== 'normal') return;
    if ((ch === '+' || ch === '=') && state.focusPane === 'files') {
      callbacks.onTagByFilespec();
    }
  });

  // Untag by filespec (- in files pane)
  screen.on('keypress', (ch: string, key: blessed.Widgets.Events.IKeyEventArg) => {
    if (state.viewMode !== 'normal') return;
    if (ch === '-' && state.focusPane === 'files') {
      callbacks.onUntagByFilespec();
    }
  });

  // Ctrl+T tag all global
  screen.key(['C-t'], () => {
    if (state.viewMode !== 'normal') return;
    callbacks.onTagAllGlobal();
  });

  // Ctrl+U untag all global
  screen.key(['C-u'], () => {
    if (state.viewMode !== 'normal') return;
    callbacks.onUntagAllGlobal();
  });

  // Ctrl+G toggle tagged-only view (Ctrl+F4 fallback)
  screen.key(['C-g'], () => {
    if (state.viewMode !== 'normal') return;
    callbacks.onToggleTaggedOnly();
  });

  // Ctrl+N pattern rename
  screen.key(['C-n'], () => {
    if (state.viewMode !== 'normal') return;
    callbacks.onPatternRename();
  });

  // Speed navigation: Shift+Letter jumps to next entry starting with that letter
  const speedNavLetters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  for (const letter of speedNavLetters) {
    screen.key([`S-${letter}`], () => {
      if (state.viewMode !== 'normal' || state.focusPane !== 'files') return;
      // Skip S-s (sort direction), S-t (tag all), S-u (untag all), S-n (reserved for viewer)
      if (letter === 's' || letter === 't' || letter === 'u') return;
      callbacks.onSpeedNav(letter.toUpperCase());
    });
  }
}
