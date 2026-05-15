import { readFileSync } from 'node:fs';

type Command = 'check' | 'notes';

type ChangelogSection = {
  date: string;
  body: string;
};

const [rawCommand = 'check', rawRef = process.env.GITHUB_REF_NAME ?? ''] = process.argv.slice(2);
const command = parseCommand(rawCommand);
const version = normalizeReleaseVersion(rawRef);
const packageVersion = readPackageVersion();
const changelogSection = readChangelogSection(version);

if (packageVersion !== version) {
  fail(`Tag version (${version}) does not match package.json version (${packageVersion}).`);
}

if (command === 'notes') {
  process.stdout.write(`${changelogSection.body.trimEnd()}\n`);
} else {
  console.log(`Release metadata is valid for v${version} (${changelogSection.date}).`);
}

function parseCommand(value: string): Command {
  if (value === 'check' || value === 'notes') return value;
  fail(`Unknown release command "${value}". Use "check" or "notes".`);
}

function normalizeReleaseVersion(rawRef: string): string {
  if (!rawRef) {
    fail('Missing release tag. Pass vX.Y.Z or run from a GitHub tag workflow.');
  }

  const tag = rawRef.startsWith('refs/tags/')
    ? rawRef.slice('refs/tags/'.length)
    : rawRef;
  const match = /^v(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)$/.exec(tag);

  if (!match) {
    fail(`Release tag must look like vX.Y.Z; got "${rawRef}".`);
  }

  return match[1];
}

function readPackageVersion(): string {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { version?: string };
  if (!packageJson.version) fail('package.json is missing a version field.');
  return packageJson.version;
}

function readChangelogSection(version: string): ChangelogSection {
  const changelog = readFileSync('CHANGELOG.md', 'utf8');
  const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const headingPattern = new RegExp(`^## \\[${escapedVersion}\\] - (\\d{4}-\\d{2}-\\d{2})\\s*$`, 'm');
  const heading = headingPattern.exec(changelog);

  if (!heading) {
    fail(`CHANGELOG.md is missing a dated section header for [${version}].`);
  }

  const bodyStart = heading.index + heading[0].length;
  const remainder = changelog.slice(bodyStart);
  const nextHeadingIndex = remainder.search(/^## \[/m);
  const body = (nextHeadingIndex === -1 ? remainder : remainder.slice(0, nextHeadingIndex)).trim();

  if (!body) {
    fail(`CHANGELOG.md section [${version}] does not contain release notes.`);
  }

  return {
    date: heading[1],
    body,
  };
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
