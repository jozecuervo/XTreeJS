// XTree-inspired gold on royal blue palette.
export const Palette = {
  royalBlue: '#0000c8',
  royalBlueDeep: '#0000bf',
  gold: '#d4af37',
  brightGold: '#ffd700',
  mutedGold: '#a9822a',
  cream: '#fff2a8',
} as const;

export const Colors = {
  // File type colors (gold variants on royal blue)
  directory: Palette.brightGold,
  executable: Palette.cream,
  hidden: Palette.mutedGold,
  symlink: Palette.cream,
  default: Palette.gold,

  // UI colors
  bg: Palette.royalBlue,
  border: Palette.gold,
  borderFocused: Palette.brightGold,
  statusBarBg: Palette.royalBlueDeep,
  statusBarFg: Palette.brightGold,
  selectionBg: Palette.gold,
  selectionFg: Palette.royalBlue,
  taggedBg: Palette.brightGold,
  taggedFg: Palette.royalBlue,
  treeLine: Palette.gold,
  titleFg: Palette.brightGold,
  titleBg: Palette.royalBlue,
  promptBg: Palette.royalBlueDeep,
  promptFg: Palette.brightGold,
  inputBg: Palette.royalBlue,
  inputFg: Palette.brightGold,
  errorFg: Palette.brightGold,
  // Stats/labels on right panel
  labelFg: Palette.gold,
  valueFg: Palette.brightGold,
} as const;

export function fg(text: string, color: string = Colors.default): string {
  return `{${color}-fg}${text}{/}`;
}

export function bgFg(
  text: string,
  bg: string = Colors.bg,
  color: string = Colors.default
): string {
  return `{${bg}-bg}{${color}-fg}${text}{/}`;
}

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
