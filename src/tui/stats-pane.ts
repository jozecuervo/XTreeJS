import blessed from 'neo-blessed';
import { Colors } from '../config/defaults.js';
import type { DiskStats } from '../fs/disk-stats.js';
import { formatStatsSize } from '../fs/dir-stats.js';
import * as path from 'path';

export interface StatsData {
  filespec: string;
  diskStats: DiskStats | null;
  totalFiles: number;
  totalBytes: number;
  matchingFiles: number;
  matchingBytes: number;
  taggedFiles: number;
  taggedBytes: number;
  currentDirName: string;
  currentDirFiles: number;
}

export interface StatsPane {
  widget: blessed.Widgets.BoxElement;
  refresh(data: StatsData): void;
  show(): void;
  hide(): void;
}

export function createStatsPane(screen: blessed.Widgets.Screen): StatsPane {
  const widget = blessed.box({
    parent: screen,
    label: ' Statistics ',
    left: '75%-1',
    top: 1,
    width: '25%+1',
    height: '100%-2',
    border: { type: 'line' },
    style: {
      bg: Colors.bg,
      border: { fg: Colors.border, bg: Colors.bg },
      label: { fg: Colors.titleFg, bg: Colors.bg, bold: true },
      fg: Colors.default,
    },
    tags: true,
    content: '',
  });

  // Start hidden — will be shown when display mode is 'dir'
  widget.hide();

  function formatNumber(n: number): string {
    return n.toLocaleString();
  }

  function refresh(data: StatsData): void {
    const labelC = Colors.labelFg;
    const valC = Colors.valueFg;

    const diskName = data.diskStats?.device || 'unknown';
    const diskMount = data.diskStats?.mountpoint || '/';
    const available = data.diskStats?.available || '?';
    const totalDisk = data.diskStats?.total || '?';
    const usedPercent = data.diskStats?.percentUsed || '?';

    const lines = [
      '',
      `  {${labelC}-fg}FILE  {/${labelC}-fg}{${valC}-fg}${data.filespec}{/${valC}-fg}`,
      '',
      `  {${labelC}-fg}DISK{/${labelC}-fg}  {${valC}-fg}${diskMount}{/${valC}-fg}`,
      `    {${labelC}-fg}Available{/${labelC}-fg}`,
      `      {${valC}-fg}${available}{/${valC}-fg}`,
      '',
      `  {${labelC}-fg}DISK Statistics{/${labelC}-fg}`,
      `    {${labelC}-fg}Total{/${labelC}-fg}`,
      `      {${labelC}-fg}Files:{/${labelC}-fg}  {${valC}-fg}${formatNumber(data.totalFiles)}{/${valC}-fg}`,
      `      {${labelC}-fg}Bytes:{/${labelC}-fg}  {${valC}-fg}${formatNumber(data.totalBytes)}{/${valC}-fg}`,
      `    {${labelC}-fg}Matching{/${labelC}-fg}`,
      `      {${labelC}-fg}Files:{/${labelC}-fg}  {${valC}-fg}${formatNumber(data.matchingFiles)}{/${valC}-fg}`,
      `      {${labelC}-fg}Bytes:{/${labelC}-fg}  {${valC}-fg}${formatNumber(data.matchingBytes)}{/${valC}-fg}`,
      `    {${labelC}-fg}Tagged{/${labelC}-fg}`,
      `      {${labelC}-fg}Files:{/${labelC}-fg}  {${valC}-fg}${formatNumber(data.taggedFiles)}{/${valC}-fg}`,
      `      {${labelC}-fg}Bytes:{/${labelC}-fg}  {${valC}-fg}${formatNumber(data.taggedBytes)}{/${valC}-fg}`,
      '',
      `  {${labelC}-fg}Current Directory{/${labelC}-fg}`,
      `    {${valC}-fg}${data.currentDirName}{/${valC}-fg}`,
      `      {${labelC}-fg}Files:{/${labelC}-fg}  {${valC}-fg}${formatNumber(data.currentDirFiles)}{/${valC}-fg}`,
    ];

    widget.setContent(lines.join('\n'));
    screen.render();
  }

  function show(): void {
    widget.show();
    screen.render();
  }

  function hide(): void {
    widget.hide();
    screen.render();
  }

  return { widget, refresh, show, hide };
}
