# XTreeJS

<p align="center">
  <img src="https://upload.wikimedia.org/wikipedia/en/thumb/4/4c/Xtreegold-3.0.png/330px-Xtreegold-3.0.png" alt="XTreeGold 3.0 screenshot" width="520">
</p>

<p align="center">
  <em>XTreeGold 3.0 screenshot via <a href="https://en.wikipedia.org/wiki/XTree">Wikipedia</a>.</em>
</p>

XTreeJS is a modern, keyboard-first revival of the classic DOS-era XTree/XTreeGold file manager (1985-1995), built with Bun + TypeScript + neo-blessed.

This project exists because some software stays with you. XTreeGold was fast, direct, and opinionated in the best way: a small program that made a whole filesystem feel visible and alive. XTreeJS is a port and love letter, built for the joy of software and programming as much as for daily use.

The goal is to keep the spirit and interaction model recognizable while making it useful in modern terminals. Contributions are welcome: help improve it, test it on real systems, and keep it true to form as a living port of the DOS classic.

## Status

`v0.1.0` is a pre-release milestone focused on core navigation, viewer, tagging, and safe file operations.

## Features

- Two-pane TUI layout (tree + file list)
- Single-key XTree-inspired navigation and actions
- File viewer with search, hex/ascii modes, wrap toggle, and follow mode
- Tagging workflows (single, bulk, global, pattern-based)
- Safe delete/prune via system trash CLI

## Requirements

- Bun 1.3.8+
- macOS/Linux terminal with UTF-8 support

Tool support:
- Required for safety-critical operations: `trash` (delete/prune).
- Optional (auto-detected): `fd`, `bat`, `rsync`, `dust`, `duf`, `chafa`.

## Quick Start

```bash
bun install
bun test
bun run src/index.ts
```

## Test Suite

```bash
bun test
```

## Release Contract

1. CI must be green on `main`.
2. `CHANGELOG.md` must include a dated heading for the release version (`## [X.Y.Z] - YYYY-MM-DD`).
3. `package.json` version must match the Git tag (`vX.Y.Z`).
4. Run `bun run release:check vX.Y.Z` locally before tagging.
5. Push tag: `git tag vX.Y.Z && git push origin vX.Y.Z`.

The release workflow re-runs tests, validates tag/package/changelog alignment, and publishes the matching changelog entry as the GitHub Release body.

## License

MIT. See `LICENSE`.
