import blessed from 'neo-blessed';
import { Colors, fg } from '../config/defaults.js';
import type { SortOrder, SortDirection, ListingMode } from '../state/app-state.js';

export interface StatusBar {
  topBar: blessed.Widgets.BoxElement;
  bottomBar: blessed.Widgets.BoxElement;
  updatePath(
    path: string,
    itemCount: number,
    tagCount: number,
    sortOrder?: SortOrder,
    sortDirection?: SortDirection,
    filespecFilter?: string,
    diskInfo?: string,
    listingMode?: ListingMode,
    showTaggedOnly?: boolean
  ): void;
  updateBottomHints(hints: string): void;
}

const FILE_HINTS =
  'F3 View  F5 Copy  F6 Move  F7 Del  F8 Prune  t Tag  s Sort  f Filter  q Quit  ? Help';
const TREE_HINTS =
  '+/- Expand  Enter Open  m MkDir  Tab Files  \\ Root  q Quit  ? Help';
const VIEWER_HINTS =
  '↑↓ Scroll  PgUp/PgDn Page  Home/End Jump  h Hex  s Search  w Wrap  q/Esc Exit';
const DIR_HINTS = FILE_HINTS;

const SORT_LABELS: Record<SortOrder, string> = {
  name: 'Name',
  ext: 'Ext',
  size: 'Size',
  date: 'Date',
  unsorted: 'None',
};

export function createStatusBar(screen: blessed.Widgets.Screen): StatusBar {
  const topBar = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: '100%',
    height: 1,
    style: {
      bg: Colors.statusBarBg,
      fg: Colors.statusBarFg,
      bold: true,
    },
    tags: true,
    content: ` XTreeJS ─ ${process.cwd()}`,
  });

  const bottomBar = blessed.box({
    parent: screen,
    bottom: 0,
    left: 0,
    width: '100%',
    height: 1,
    style: {
      bg: Colors.statusBarBg,
      fg: Colors.statusBarFg,
    },
    tags: true,
    content: ` ${FILE_HINTS}`,
  });

  function updatePath(
    path: string,
    itemCount: number,
    tagCount: number,
    sortOrder: SortOrder = 'name',
    sortDirection: SortDirection = 'asc',
    filespecFilter: string = '*',
    diskInfo: string = '',
    listingMode: ListingMode = 'normal',
    showTaggedOnly: boolean = false
  ): void {
    const modePrefix = listingMode === 'branch'
      ? `${fg('BRANCH:', Colors.valueFg)} `
      : listingMode === 'showall'
        ? `${fg('SHOWALL:', Colors.valueFg)} `
        : '';
    const taggedOnlyLabel = showTaggedOnly ? `  ${fg('TAGGED', Colors.valueFg)}` : '';
    const tagInfo = tagCount > 0 ? `  ${fg(`${tagCount} tagged`, Colors.valueFg)}` : '';
    const arrow = sortDirection === 'asc' ? '^' : 'v';
    const sortInfo = `  Sort: ${SORT_LABELS[sortOrder]} ${arrow}`;
    const filterInfo = filespecFilter !== '*' ? `  Filter: ${filespecFilter}` : '';
    const disk = diskInfo ? `  ${diskInfo}` : '';
    topBar.setContent(
      ` XTreeJS ─ ${modePrefix}${path}  (${itemCount} items)${tagInfo}${taggedOnlyLabel}${sortInfo}${filterInfo}${disk}`
    );
    screen.render();
  }

  function updateBottomHints(hints: string): void {
    bottomBar.setContent(` ${hints}`);
    screen.render();
  }

  return { topBar, bottomBar, updatePath, updateBottomHints };
}

export { FILE_HINTS, TREE_HINTS, VIEWER_HINTS, DIR_HINTS };
