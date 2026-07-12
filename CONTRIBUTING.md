# Contributing

## Development Setup

```bash
bun install
bun test
```

## Workflow

0. Read `ARCHITECTURE.md` before touching the `tui` or `fs` layers — it explains why each is built the way it is, including the deliberate lack of a `trash` fallback for delete/prune.
1. Create a branch from `main`.
2. Keep changes scoped to one concern.
3. Add or update tests for behavior changes.
4. Run `bun test` before opening a PR.

## Pull Request Expectations

- Describe the problem and the behavioral change.
- Link related issues.
- Call out risks and follow-up work.
- Keep docs and `CHANGELOG.md` aligned with user-facing changes.

## Release Discipline

- Do not tag releases from unverified local state.
- Version in `package.json` must match release tag (`vX.Y.Z`).
- `CHANGELOG.md` must include a dated entry for the tagged version.
- Run `bun run release:check vX.Y.Z` before pushing the release tag.
