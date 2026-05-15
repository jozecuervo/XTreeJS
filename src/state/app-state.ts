import type { FileEntry } from '../fs/list.js';

export type ViewMode = 'normal' | 'viewer';
export type FocusPane = 'tree' | 'files';
export type SortOrder = 'name' | 'ext' | 'size' | 'date' | 'unsorted';
export type SortDirection = 'asc' | 'desc';
export type DisplayMode = 'dir' | 'small' | 'expanded';

export type ListingMode = 'normal' | 'branch' | 'showall';

export type ViewerMode = 'text' | 'hex' | 'ascii' | 'junk';

export interface ViewerState {
  filePath: string;
  lines: string[];
  scrollPos: number;
  totalLines: number;
  viewerMode: ViewerMode;
  searchQuery: string;
  searchMatches: number[];
  currentMatch: number;
  wordWrap: boolean;
  tabSize: number;
  followMode: boolean;
  gatherStart: number | null;
  gatherEnd: number | null;
}

export interface AppState {
  currentPath: string;
  entries: FileEntry[];
  selectedIndex: number;
  taggedPaths: Set<string>;
  sortOrder: SortOrder;
  sortDirection: SortDirection;
  filespecFilter: string;
  filespecHistory: string[];
  viewMode: ViewMode;
  focusPane: FocusPane;
  displayMode: DisplayMode;
  listingMode: ListingMode;
  branchBasePath: string | null;
  showTaggedOnly: boolean;
  viewerState: ViewerState | null;
}

export function createAppState(startPath: string): AppState {
  return {
    currentPath: startPath,
    entries: [],
    selectedIndex: 0,
    taggedPaths: new Set(),
    sortOrder: 'name',
    sortDirection: 'asc',
    filespecFilter: '*',
    filespecHistory: ['*'],
    viewMode: 'normal',
    focusPane: 'files',
    displayMode: 'dir',
    listingMode: 'normal',
    branchBasePath: null,
    showTaggedOnly: false,
    viewerState: null,
  };
}

// Tag operations
export function toggleTag(state: AppState, path: string): void {
  if (state.taggedPaths.has(path)) {
    state.taggedPaths.delete(path);
  } else {
    state.taggedPaths.add(path);
  }
}

export function tagAll(state: AppState): void {
  for (const entry of state.entries) {
    if (!entry.isDirectory) {
      state.taggedPaths.add(entry.path);
    }
  }
}

export function untagCurrent(state: AppState, path: string): void {
  state.taggedPaths.delete(path);
}

export function untagAll(state: AppState): void {
  state.taggedPaths.clear();
}

export function invertTags(state: AppState): void {
  for (const entry of state.entries) {
    if (entry.isDirectory) continue;
    if (state.taggedPaths.has(entry.path)) {
      state.taggedPaths.delete(entry.path);
    } else {
      state.taggedPaths.add(entry.path);
    }
  }
}

export function getVisibleEntries(state: AppState): FileEntry[] {
  if (!state.showTaggedOnly) return state.entries;
  return state.entries.filter((entry) => (
    entry.isDirectory || state.taggedPaths.has(entry.path)
  ));
}

export function clampSelectedIndex(state: AppState): void {
  const maxIndex = Math.max(0, getVisibleEntries(state).length - 1);
  state.selectedIndex = Math.min(Math.max(0, state.selectedIndex), maxIndex);
}

export function getSelectedEntry(state: AppState): FileEntry | undefined {
  return getVisibleEntries(state)[state.selectedIndex];
}

export function getOperationTargets(state: AppState): FileEntry[] {
  // If files are tagged, operate on tagged files; otherwise on current selection
  if (state.taggedPaths.size > 0) {
    return state.entries.filter((e) => state.taggedPaths.has(e.path));
  }
  const current = getSelectedEntry(state);
  return current ? [current] : [];
}
