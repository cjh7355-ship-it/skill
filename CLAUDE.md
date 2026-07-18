# CLAUDE.md

Guidance for AI assistants (Claude Code and compatible harnesses) working in this repository.

## What this repository is

This repo is a **distribution package for a single Claude Code skill: `impeccable`**. There is no application, no build step, and no dependency install — the entire product is the skill directory and its bundled Node scripts.

```
.claude/skills/impeccable/
├── SKILL.md                 # Skill manifest + design guidance (the entry point)
├── reference/               # 30 markdown files: one per command + register/platform guides
└── scripts/                 # Bundled Node ESM (.mjs) tooling the skill shells out to
```

The skill is `impeccable` (version tracked in `SKILL.md` frontmatter — currently 3.9.1). It designs and iterates production-grade frontend interfaces. When invoked (`/impeccable [command] [target]`), Claude reads `SKILL.md`, then a command reference, then runs the bundled scripts.

## Key facts before you touch anything

- **No package.json, no lockfile, no node_modules, no test runner, no CI.** Scripts are plain Node ESM run directly (`node .claude/skills/impeccable/scripts/<name>.mjs`). They rely only on Node built-ins (`node:fs`, `node:path`, `node:child_process`, etc.). Do **not** add a dependency without a strong reason — the zero-install property is a feature: users get the skill by copying the directory.
- **All scripts are ESM** (`.mjs`, `import`/`export`). Match that. No CommonJS `require`.
- **Node built-ins only.** If you introduce an npm dependency you break the copy-to-install model. Prefer writing the helper by hand.
- Files are licensed **Apache 2.0** (see per-file SPDX headers and `SKILL.md` frontmatter).

## Architecture

Three cooperating subsystems, all under `scripts/`:

### 1. Context loading — `context.mjs`
Run once per session at skill setup. Prints the project's `PRODUCT.md` (and `DESIGN.md` if present) as a markdown block, or `NO_PRODUCT_MD` when missing. Resolves context dir by search order (project root → `.agents/context/`/`docs/` → monorepo root → `$IMPECCABLE_CONTEXT_DIR`). `context-signals.mjs` emits JSON signals (setup state, git changes, dev-server status, last critique) that drive the no-argument command menu. `critique-storage.mjs` persists critique snapshots.

### 2. Anti-pattern detector — `detect.mjs` → `detector/`
A self-contained static/browser analysis engine that flags "AI slop" and quality issues (contrast, overused fonts, side-stripe borders, etc.). `detect.mjs` is a thin loader; the real engine is `detector/`:
- `registry/antipatterns.mjs` — the catalog of detectable patterns.
- `rules/checks.mjs`, `shared/` (color, fonts, page, constants) — detection primitives.
- `engines/` — `static-html/`, `regex/` (CSS-in-JS/text), `browser/` (live URL via Playwright), `visual/` (screenshot contrast).
- `cli/main.mjs` — CLI entry (`detectCli`). Web/HTML-only; not for native iOS/Android code.

### 3. Live variant mode — `live*.mjs` + `live/`
Interactive in-browser iteration against a running dev server. `live.mjs` prepares everything (config check, background server, browser-script injection, context read) and prints one JSON blob; `live-poll.mjs` runs the poll loop; `live-server.mjs` is the helper HTTP server; `live-inject.mjs`/`live-wrap.mjs`/`live-insert.mjs` handle entry-file injection and HMR hot-swap. The `live/` subdir holds framework adapters (`sveltekit-adapter.mjs`, `svelte-component.mjs`), the session store, UI, and manual-edit reconciliation. Config lives in the target project under `.impeccable/live/`.

### Detector/edit hooks — `hook*.mjs`
`hook.mjs` is the `PostToolUse` entry point (thin stdin/stdout adapter); `hook-lib.mjs` holds the testable logic; `hook-before-edit.mjs` and `hook-admin.mjs` manage the opt-in hook that auto-runs the detector after UI file edits. Contract: **never break a turn — always exit 0.**

### Shared library — `scripts/lib/`
`impeccable-config.mjs`, `impeccable-paths.mjs`, `target-args.mjs` (parses `--target`), `design-parser.mjs`, `is-generated.mjs`.

## How the skill flows (read `SKILL.md` for the authoritative version)

Every invocation runs setup in order: (1) `context.mjs`; (2) read `reference/<command>.md` for the invoked sub-command; (3) read at least one existing project file; (4) read the register reference — `reference/brand.md` (design *is* the product: marketing/landing) or `reference/product.md` (design *serves* the product: app/dashboard); (5) read `reference/<platform>.md` for iOS/Android; (6) run `palette.mjs` for brand-new projects.

Commands are grouped Build / Evaluate / Refine / Enhance / Fix / Iterate, each mapping to a `reference/*.md` file — see the table in `SKILL.md`. Metadata for each command (description + argument hint) is duplicated in `scripts/command-metadata.json`; **keep that file in sync when you add or rename a command or edit its description.**

## Conventions when editing this repo

- **Keep `SKILL.md` and `command-metadata.json` consistent.** A new command needs: a `reference/<command>.md`, a row in the `SKILL.md` command table, and an entry in `command-metadata.json`.
- **Bump the `version` in `SKILL.md` frontmatter** for user-facing behavior changes (semver).
- **Reference files are the product.** Design guidance lives in `SKILL.md` and `reference/*.md`; those files are read by Claude at runtime, so write them as instructions to an agent, not as human docs.
- **Preserve the "never break a turn" contract** in any hook code — catch everything, exit 0.
- Match existing file style: ESM, top-of-file JSDoc block explaining the script's contract, Node built-ins only.
- The skill's `allowed-tools` (in `SKILL.md`) restrict Bash to `npx impeccable *` and `node .claude/skills/impeccable/scripts/*`. Scripts must be invocable via those paths.

## Testing / verifying changes

There is no test suite. To verify a script change, run it directly, e.g.:
```bash
node .claude/skills/impeccable/scripts/context.mjs
node .claude/skills/impeccable/scripts/detect.mjs --json path/to/file.html
```
Detector and live changes are best verified against a real target project (the skill is normally installed into another repo's `.claude/skills/`). Design-guidance edits (`SKILL.md`, `reference/*.md`) need a careful read, not a run.

## Git workflow

- Active development branch for the current task: **`claude/claude-md-documentation-3vsw8u`**. Default branch is `main`.
- Commit with clear messages; push with `git push -u origin <branch>`. Do not open a PR unless explicitly asked.
