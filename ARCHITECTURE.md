# Architecture

XTreeJS splits cleanly into two concerns: **how it looks and responds** (an
off-the-shelf terminal UI framework) and **how it touches the filesystem**
(a thin layer that shells out to best-in-class CLI tools, with native
fallbacks). Neither layer reimplements what a mature dependency already
does well — the app is mostly glue, wired together with an explicit
single-key command dispatcher.

```
src/
├── tui/          neo-blessed widgets: screen, panes, status bar, viewer, prompts
├── state/        plain mutable app/tree state (no framework store)
├── fs/           shell-first filesystem layer with native fallbacks
├── config/       defaults
└── index.ts      command dispatcher — wires keys to state + fs + tui
```

## Layer 1: TUI on neo-blessed

**Choice:** [neo-blessed](https://github.com/embarklabs/neo-blessed) (a
maintained fork of `blessed`) renders every widget — tree pane, file pane,
status bars, viewer, prompts (`src/tui/*.ts`).

**Why an off-the-shelf TUI library instead of a custom renderer:**

| | |
|---|---|
| **Pros** | Handles the hard, boring parts of terminal programs: cursor management, resize events, unicode/wide-char width, box-drawing characters, focus/keyboard routing. Ships a widget vocabulary (box, list, line) that maps directly onto XTree's boxy, bordered 1985 aesthetic — line-art trees and status bars are what `blessed` was built for. Long track record in the Node ecosystem, so terminal quirks across iTerm/Terminal.app/tmux are mostly already shaken out. |
| **Cons** | `blessed`/`neo-blessed` is a low-velocity project with an idiosyncratic, callback-oriented API predating modern async patterns — see the `(screen as any).leave?.()`/`.enter?.()` casts in `src/index.ts` needed to reach into internals neither `blessed` nor its `@types/blessed` shim expose. No built-in concept of suspending/resuming cleanly for a child process (`onEditor` in `src/index.ts:517-536` has to manually `leave()`/`enter()` the screen around `$EDITOR`). Layout is imperative and widget-relative rather than a declarative/reactive model (contrast with React-for-terminals frameworks like Ink), so UI updates go through one big `refreshUI()` (`src/index.ts:102-170`) that manually re-reads state into each widget. |
| **Why chosen anyway** | The project's design principles rule out the things a heavier framework would buy: no floating windows, no mouse, a fixed two-pane layout that doesn't restructure at runtime. A React-style component model would add indirection for a UI that is deliberately static and boxy. `blessed`'s lower-level, closer-to-the-terminal model is a better fit for faithfully reproducing a specific 1990s layout than a framework optimized for dynamic dashboards. |

## Layer 2: shell-heavy filesystem operations

**Choice:** `src/fs/*.ts` delegates listing, viewing, and copy/move/delete to
external CLI tools (`fd`, `bat`, `rsync`, `trash`, `chafa`, `duf`) via
Bun's `$` shell helper, detected once at startup (`src/fs/detect-tools.ts`)
and cached for the process lifetime. (`detectTools()` also probes for
`dust`, but nothing in this layer calls it yet — it's detected and
unused.)

**Why shell out instead of reimplementing in TypeScript:**

| | |
|---|---|
| **Pros** | Each tool is a mature, independently-maintained project solving a hard problem: `fd` does parallel, gitignore-aware filesystem walking; `bat` carries syntax grammars for hundreds of languages; `rsync` has decades of hardened copy/resume semantics; `trash` integrates with the OS's actual trash/recycle bin; `chafa` renders images as terminal glyphs. Reimplementing any one of these in JS would be a project in itself — pure scope creep for what a file manager needs. |
| **Cons** | Runtime dependency on external binaries being installed (Homebrew on macOS today — see `README.md` Requirements). Per-operation process-spawn overhead vs. an in-process call. Coarser error handling: failures surface as exit codes and stdout text (e.g. `src/fs/operations.ts:23-25`) rather than typed exceptions. Harder to unit test without mocking the shell (`getCachedTools()` is stubbable for exactly this reason — see `setCachedToolsForTesting` in `src/fs/detect-tools.ts`). Currently macOS/Linux only; Windows support (tracked in `ROADMAP.md`) will need either WSL or a native fallback for every tool in this layer. |
| **Mitigation already in the code** | Every consumer branches on tool availability and falls back to native `fs`/`child_process` equivalents: `listDirectory` falls back from `fd` to `readdir` (`src/fs/list.ts:145-168`), `copyFiles` falls back from `rsync` to `cp -R`/`fs.copyFile` (`src/fs/operations.ts:11-45`), `viewText` falls back from `bat` to a raw `fs.readFile` (`src/fs/view.ts:70-85`). `moveFiles` doesn't shell out at all in the common case — it uses `fs.rename` directly and only drops to the copy-then-delete path shelled through `copyFiles` on a cross-device `EXDEV` error (`src/fs/operations.ts:78-113`). |
| **Deliberate exception** | `deleteFiles`/`pruneDirectory` require the `trash` CLI and refuse to run without it — no fallback to `rm` (`src/fs/operations.ts:123-129`, `155-161`). Every other tool degrades gracefully; this one doesn't, because "safe by default" (never a raw destructive delete) outranks "always works." That asymmetry — soft-fail for listing/viewing, hard-fail for anything destructive — is the one safety invariant this layer won't compromise on. |

## Command dispatcher and state

`src/index.ts` wires everything together as a flat set of `on*` handlers
passed to `setupInput` (`src/tui/input.ts`), each one a direct
state-mutation-then-`refreshUI()` step. `src/state/app-state.ts` and
`src/state/tree-state.ts` are plain mutable objects, not a reactive
store — there's no pub/sub, no virtual DOM diffing, no framework. For a
single-process, single-screen terminal app where every state change already
happens inside a discrete keybinding handler, that directness is simpler
than introducing a state-management library would be, at the cost of
`refreshUI()` being one large function that every code path has to
remember to call.

## Summary

Every layer follows the same rule: use the specialized tool that already
does the job well, keep a native fallback where availability isn't
guaranteed, and reserve hard failures for the one place — deletion — where
"fall back to something less safe" is the wrong answer.
