# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and follows semantic versioning.

## [Unreleased]

### Changed

- Updated the terminal palette from generic ANSI yellow/blue to explicit gold on royal blue hex colors.

### Fixed

- Tree pane no longer steals keyboard focus back from the file pane on every UI refresh (`setFocused(false)` was unconditionally calling `.focus()`).
- Viewer tab-size toggle (`t`) now actually re-expands tab characters instead of only updating the hint label.
- Tree node expand/collapse (`*`) no longer double-refreshes with stale data while an async expand is still in flight.
- Statistics pane now formats byte counts with compact units (K/M/G) instead of raw byte counts.

## [0.1.0] - 2026-05-15

### Added

- Initial public pre-release of XTreeJS core functionality.
- Two-pane terminal UI with tree and file panes.
- Viewer mode with search/hex/wrap/follow support.
- Tagging, filespec filtering, recursive listing modes, and pattern rename.
- GitHub Actions CI and tag-driven release workflow.
- `ROADMAP.md` for outcome-based planning.
- `CONTRIBUTING.md`, `SECURITY.md`, and GitHub issue templates.
- Local release metadata checks and changelog-driven release note generation.

### Changed

- External editor flow now resumes the TUI instead of exiting the app process.
- CI pins Bun to `1.3.8` and uses `bun install --frozen-lockfile`.
- Release workflow runs tests, validates tag/version/changelog consistency, and uses the matching `CHANGELOG.md` entry as the GitHub Release body.
- GitHub Releases for `v0.x` tags are marked as prereleases.
- README reflects a Bun-first workflow and explicit release contract.

### Fixed

- Tagged-only view selection now targets the visible filtered entry instead of the same index in the unfiltered file list.
- Multi-file move now preflights destination conflicts before mutating sources.
- Rename now rejects path-like names so it cannot move files outside the current directory.

### Security

- `delete` and `prune` now require the `trash` CLI and do not fall back to destructive removal.
