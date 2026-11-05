# Caelus

A command registry: define a command once, dispatch it from any surface (key chord, button, CLI subcommand, MCP tool call). TypeScript, zero runtime dependencies, targets web and Electron first; the pure parts also run server-side.

This is the real version. The Kotlin Multiplatform prototype lives at `~/projects/caelus-old` (archived). Its reasoning carries forward, its types mostly do not: read `docs/decisions/command-action-registration.md` there for the why behind the registry, and treat its keybinding types as scaffolding the browser makes unnecessary.

## Code style

Follow `.claude/code-style-guide.md`. Short version: build values as expressions, not by mutating accumulators; keep the pure core free of platform globals and inject platform objects as parameters with defaults; one canonical form for anything that arrives from two directions; drop bad config instead of throwing; type the boundaries and leave validated data as data.

## Working with Tim

- **Brainstorm first, build on request.** Much of the work here is design discussion. When Tim is thinking out loud or asking a question, answer it. Don't implement until asked.
- **Tim steers.** Build one piece at a time, in the order Tim sets. Don't run ahead to the next step.
- **Edit with Edit/Write, never sed or shell rewrites.** Every diff gets reviewed.
- **Hand-crafted over generated.** This library is deliberately small. Reach for the simplest shape that works and question any abstraction before adding it.
- **Don't be dismissive.** If a proposal seems wrong, ask what it's for before arguing against a guess.

## Layout

```
src/core.ts          Registry, Registration, Command, Parameter, Outcome. The narrow waist.
src/keybindings.ts   canonical, chordOf, resolve, attach. One file by design.
test/                One test file per module. Fakes are small helpers in the test file.
docs/                Architecture and the extracted brainstorm transcripts.
```

Keep modules to one file until a file genuinely can't be read in one sitting.

## Commands

```sh
npm test             # vitest run
npx tsc --noEmit -p .
npm run build        # tsc to dist/
```

Run both the type-check and the tests after any change to `src/`.

## Keybindings in one paragraph

Defaults are a plain object in the app (`{ 'cmd+n': 'openItemDialog' }`). The user patch is a parsed config file, same shape; the app reads the file and picks the parser. `resolve` canonicalizes both layers, applies patch over defaults, deletes `'unbind'` tombstones and unknown commands, and returns a `Map<chord, commandName>`. `attach` adds one `keydown` listener that turns the event into the same canonical string via `chordOf`, looks it up, and invokes through the registry. Live reload is rebuilding the map and swapping the reference; the listener never changes. `canonical` and `chordOf` must agree, and that is the module's only invariant.

Known gaps, deliberately deferred: the `mod` platform modifier, the Chromium `getLayoutMap` refinement for alt chords on non-QWERTY layouts, chord sequences, focus context, Electron menu accelerators.