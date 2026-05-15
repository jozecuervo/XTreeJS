// XTree Pro Gold 1.44 color scheme — yellow on blue
export const Colors = {
  // File type colors (all yellow-on-blue like the original)
  directory: 'yellow',
  executable: 'white',
  hidden: 'cyan',
  symlink: 'cyan',
  default: 'yellow',

  // UI colors
  bg: 'blue',
  border: 'yellow',
  borderFocused: 'white',
  statusBarBg: 'blue',
  statusBarFg: 'yellow',
  selectionBg: 'cyan',
  selectionFg: 'blue',
  taggedBg: 'white',
  taggedFg: 'blue',
  treeLine: 'yellow',
  titleFg: 'yellow',
  titleBg: 'blue',
  promptBg: 'blue',
  promptFg: 'yellow',
  errorFg: 'white',
  // Stats/labels on right panel
  labelFg: 'yellow',
  valueFg: 'white',
} as const;

// Tree drawing characters (DOS-style)
export const TreeChars = {
  pipe: '│',
  tee: '├──',
  elbow: '└──',
  blank: '   ',
  expanded: '[-]',
  collapsed: '[+]',
} as const;

// Application defaults
export const Defaults = {
  treeWidthPercent: 40,
  fileWidthPercent: 60,
  startPath: process.cwd(),
  title: 'XTreeJS',
} as const;
