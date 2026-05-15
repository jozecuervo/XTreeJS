import { $ } from 'bun';
import { getCachedTools } from './detect-tools.js';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface OperationResult {
  success: boolean;
  error?: string;
}

export async function copyFiles(
  sources: string[],
  destination: string
): Promise<OperationResult> {
  try {
    const tools = getCachedTools();

    // Ensure destination directory exists
    await fs.mkdir(destination, { recursive: true });

    for (const src of sources) {
      if (tools?.rsync) {
        const result = await $`rsync -a ${src} ${destination}/`.quiet();
        if (result.exitCode !== 0) {
          return { success: false, error: `rsync failed for ${src}` };
        }
      } else {
        // Fallback: use cp
        const destPath = path.join(destination, path.basename(src));
        const stat = await fs.lstat(src);
        if (stat.isDirectory()) {
          const result = await $`cp -R ${src} ${destPath}`.quiet();
          if (result.exitCode !== 0) {
            return { success: false, error: `cp failed for ${src}` };
          }
        } else {
          await fs.copyFile(src, destPath);
        }
      }
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function moveFiles(
  sources: string[],
  destination: string
): Promise<OperationResult> {
  type MovePlan = { src: string; destPath: string; isDirectory: boolean };

  try {
    await fs.mkdir(destination, { recursive: true });
    const moves: MovePlan[] = [];
    const destinationNames = new Set<string>();

    for (const src of sources) {
      const destPath = path.join(destination, path.basename(src));
      const stat = await fs.lstat(src);
      const destName = path.basename(src);

      if (destinationNames.has(destName)) {
        return { success: false, error: `Duplicate destination name: ${destName}` };
      }
      destinationNames.add(destName);

      try {
        await fs.lstat(destPath);
        return { success: false, error: `Destination already exists: ${destPath}` };
      } catch (err: any) {
        if (err?.code !== 'ENOENT') throw err;
      }

      moves.push({ src, destPath, isDirectory: stat.isDirectory() });
    }

    const moved: MovePlan[] = [];
    try {
      for (const move of moves) {
        await fs.rename(move.src, move.destPath);
        moved.push(move);
      }
      return { success: true };
    } catch (err: any) {
      for (const move of moved.reverse()) {
        try {
          await fs.rename(move.destPath, move.src);
        } catch {
          return {
            success: false,
            error: `Move failed and rollback failed for ${move.src}: ${err.message}`,
          };
        }
      }

      if (err?.code !== 'EXDEV') {
        return { success: false, error: err.message };
      }
    }

    const copyResult = await copyFiles(sources, destination);
    if (!copyResult.success) return copyResult;

    for (const move of moves) {
      if (move.isDirectory) {
        await fs.rm(move.src, { recursive: true });
      } else {
        await fs.unlink(move.src);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteFiles(
  sources: string[]
): Promise<OperationResult> {
  try {
    const tools = getCachedTools();
    if (!tools?.trash) {
      return {
        success: false,
        error: 'Safe delete requires the `trash` CLI. Install it and retry.',
      };
    }

    for (const src of sources) {
      const result = await $`trash ${src}`.quiet().nothrow();
      if (result.exitCode !== 0) {
        return {
          success: false,
          error: `trash failed for ${src}`,
        };
      }
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function pruneDirectory(
  dirPath: string
): Promise<OperationResult> {
  try {
    const stat = await fs.lstat(dirPath);
    if (!stat.isDirectory()) {
      return { success: false, error: 'Not a directory' };
    }

    const tools = getCachedTools();
    if (!tools?.trash) {
      return {
        success: false,
        error: 'Safe prune requires the `trash` CLI. Install it and retry.',
      };
    }

    const result = await $`trash ${dirPath}`.quiet().nothrow();
    if (result.exitCode !== 0) {
      return { success: false, error: `trash failed for ${dirPath}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function renameFile(
  oldPath: string,
  newName: string
): Promise<OperationResult> {
  try {
    if (
      !newName ||
      newName === '.' ||
      newName === '..' ||
      newName.includes('/') ||
      newName.includes('\\')
    ) {
      return { success: false, error: 'Rename must be a file name, not a path' };
    }

    const dir = path.dirname(oldPath);
    const newPath = path.join(dir, newName);
    await fs.rename(oldPath, newPath);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function makeDirectory(
  parentPath: string,
  name: string
): Promise<OperationResult> {
  try {
    const dirPath = path.join(parentPath, name);
    await fs.mkdir(dirPath, { recursive: true });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export interface FileAttributes {
  permissions: string;
  owner: number;
  group: number;
  mode: number;
  size: number;
  mtime: Date;
  atime: Date;
  isDirectory: boolean;
  isSymlink: boolean;
}

export async function getFileAttributes(
  filePath: string
): Promise<FileAttributes> {
  const stat = await fs.lstat(filePath);
  return {
    permissions: (stat.mode & 0o777).toString(8),
    owner: stat.uid,
    group: stat.gid,
    mode: stat.mode,
    size: stat.size,
    mtime: stat.mtime,
    atime: stat.atime,
    isDirectory: stat.isDirectory(),
    isSymlink: stat.isSymbolicLink(),
  };
}

export async function setFilePermissions(
  filePath: string,
  mode: number
): Promise<OperationResult> {
  try {
    await fs.chmod(filePath, mode);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function patternRename(
  files: string[],
  fromPattern: string,
  toPattern: string
): Promise<{ success: boolean; renamed: number; errors: string[] }> {
  const errors: string[] = [];
  let renamed = 0;

  // Convert glob pattern to regex, capturing * as groups
  const fromEscaped = fromPattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '(.*)');
  const fromRegex = new RegExp(`^${fromEscaped}$`, 'i');

  for (const filePath of files) {
    const fileName = path.basename(filePath);
    const match = fileName.match(fromRegex);
    if (!match) continue;

    // Build new name by substituting captured groups into toPattern
    let newName = toPattern;
    let captureIdx = 1;
    let pos = 0;
    let result = '';
    for (let i = 0; i < newName.length; i++) {
      if (newName[i] === '*' && captureIdx < match.length) {
        result += newName.slice(pos, i) + match[captureIdx];
        captureIdx++;
        pos = i + 1;
      }
    }
    result += newName.slice(pos);

    try {
      const dir = path.dirname(filePath);
      const newPath = path.join(dir, result);
      await fs.rename(filePath, newPath);
      renamed++;
    } catch (err: any) {
      errors.push(`${fileName}: ${err.message}`);
    }
  }

  return { success: errors.length === 0, renamed, errors };
}

export async function openInEditor(filePath: string): Promise<void> {
  const editor = process.env.EDITOR || 'vim';
  const proc = Bun.spawn([editor, filePath], {
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  });
  await proc.exited;
}
