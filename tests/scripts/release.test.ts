import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs/promises';
import * as path from 'path';

const TEST_DIR = '/tmp/claude/xtreejs-release-script-test';
const SCRIPT_PATH = path.resolve(import.meta.dir, '../../scripts/release.ts');

async function writeFixture(version: string, changelog: string): Promise<void> {
  await fs.writeFile(
    path.join(TEST_DIR, 'package.json'),
    JSON.stringify({ name: 'fixture', version }, null, 2)
  );
  await fs.writeFile(path.join(TEST_DIR, 'CHANGELOG.md'), changelog);
}

async function runRelease(
  args: string[]
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(['bun', SCRIPT_PATH, ...args], {
    cwd: TEST_DIR,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  return { exitCode, stdout, stderr };
}

beforeEach(async () => {
  await fs.rm(TEST_DIR, { recursive: true, force: true });
  await fs.mkdir(TEST_DIR, { recursive: true });
});

afterEach(async () => {
  await fs.rm(TEST_DIR, { recursive: true, force: true });
});

describe('release.ts check', () => {
  test('succeeds when package.json version and a dated CHANGELOG heading agree', async () => {
    await writeFixture(
      '1.2.3',
      '# Changelog\n\n## [1.2.3] - 2026-01-15\n\n### Added\n\n- Something.\n'
    );
    const result = await runRelease(['check', 'v1.2.3']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Release metadata is valid for v1.2.3 (2026-01-15)');
  });

  test('fails when the tag version does not match package.json', async () => {
    await writeFixture('1.2.3', '## [1.2.4] - 2026-01-15\n\n- Something.\n');
    const result = await runRelease(['check', 'v1.2.4']);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('does not match package.json version');
  });

  test('fails when CHANGELOG.md has no dated heading for the version', async () => {
    await writeFixture('1.2.3', '## [1.2.3]\n\n- Missing a date.\n');
    const result = await runRelease(['check', 'v1.2.3']);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('missing a dated section header');
  });

  test('fails when the CHANGELOG section has a heading but no body', async () => {
    await writeFixture(
      '1.2.3',
      '## [1.2.3] - 2026-01-15\n\n## [1.2.2] - 2026-01-01\n\n- Older stuff.\n'
    );
    const result = await runRelease(['check', 'v1.2.3']);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('does not contain release notes');
  });

  test('rejects a tag that is not in vX.Y.Z form', async () => {
    await writeFixture('1.2.3', '## [1.2.3] - 2026-01-15\n\n- Something.\n');
    const result = await runRelease(['check', '1.2.3']);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Release tag must look like vX.Y.Z');
  });

  test('rejects an unknown command', async () => {
    await writeFixture('1.2.3', '## [1.2.3] - 2026-01-15\n\n- Something.\n');
    const result = await runRelease(['bogus', 'v1.2.3']);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Unknown release command');
  });
});

describe('release.ts notes', () => {
  test('prints only the body of the matching CHANGELOG section', async () => {
    await writeFixture(
      '1.2.3',
      [
        '# Changelog',
        '',
        '## [1.2.3] - 2026-01-15',
        '',
        '### Added',
        '',
        '- New thing.',
        '',
        '## [1.2.2] - 2026-01-01',
        '',
        '- Older entry that should not appear.',
        '',
      ].join('\n')
    );
    const result = await runRelease(['notes', 'v1.2.3']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('### Added');
    expect(result.stdout).toContain('- New thing.');
    expect(result.stdout).not.toContain('Older entry');
  });
});
