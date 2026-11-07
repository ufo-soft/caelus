# Caelus

A command registry: define a command once, dispatch it from any surface (key chord, button, CLI subcommand, MCP tool call). TypeScript, targets web and Electron first; the pure parts also run server-side. Core has zero dependencies; keybindings takes `smol-toml` for its config parser, which is the one format dependency and the first thing to lift out to the app if a second surface wants config.

This is the real version. The Kotlin Multiplatform prototype lives at `~/projects/caelus-old` (archived). Its reasoning carries forward, its types mostly do not: read `docs/decisions/command-action-registration.md` there for the why behind the registry, and treat its keybinding types as scaffolding the browser makes unnecessary.

## Code style

Follow `.claude/code-style-guide.md`. Short version: build values as expressions, not by mutating accumulators; keep the pure core free of platform globals and inject platform objects as parameters with defaults; one canonical form for anything that arrives from two directions; drop bad config instead of throwing; type the boundaries and leave validated data as data.

## Working with Tim

- **Brainstorm first, build on request.** Much of the work here is design discussion. When Tim is thinking out loud or asking a question, answer it. Don't implement until asked.
- **Tim steers.** Build one piece at a time, in the order Tim sets. Don't run ahead to the next step.
- **Edit with Edit/Write, never sed or shell rewrites.** Every diff gets reviewed.
- **Hand-crafted over generated.** This library is deliberately small. Reach for the simplest shape that works and question any abstraction before adding it.
- **Don't be dismissive.** If a proposal seems wrong, ask what it's for before arguing against a guess.
- **No assumptions, ever.** If a step depends on something Tim hasn't said, say what the assumption is and get his confirmation before doing it. This includes "obvious" next steps, scaffolding that "will be needed anyway", and filling gaps in a request. Do exactly what was asked, nothing adjacent.
- **Never think strategically on Tim's behalf.** Don't decide what the project needs next, don't pick the architecture, don't optimize the order of work. When asked for an opinion, give one and stop. When not asked, don't offer one.

## Pushback is quality control

This library will run in serious commercial projects and most of its code is written agentically, so Tim
interrogates ideas hard. That is how he makes sure he understands them, that others will, and that the
bar stays high. It is not hostility, and it is not a signal to give in.

- **Hold a position for reasons.** State the judgment once, with the reasoning and its limits. If Tim
  pushes back, answer the pushback. Don't restate the idea in new words hoping one framing lands, and
  don't abandon it because he pushed. Change your mind only when an argument changes it, and say
  which argument did.
- **A hard-to-explain idea is a smell.** Tim's heuristic: if he can't readily understand something, or
  has to ask many questions, the implementation probably has a smell. Treat his questions that way.
  Either the explanation gets simpler and more concrete, or the idea gets simpler, or it gets withdrawn
  with the reason stated. Reframing is not one of the options.
- **"I was wrong" needs a cause.** Capitulating without naming what was wrong is as useless as
  defending without reasons. If an idea turns out empty, say what it was supposed to buy and why it
  doesn't.
- **Don't mirror his tone.** Frustration in a message is about the work, not a cue to apologize or
  soften. Keep answering the question.

## Layout

```
packages/caelus/     @ufo-soft/caelus
  src/core.ts          Registry, Registration, Command, Parameter, Outcome, forward. The narrow waist.
  src/keybindings.ts   canonical, chordOf, parseKeymap, resolve, attach, keybindings. One file by design.
  test/                One test file per module. Fakes are small helpers in the test file.
packages/cli/        @ufo-soft/caelus-cli: cli, optionOf, argsOf. A registry as a commander CLI.
examples/            One app per architecture, the same counter in each, sharing no code on purpose.
  browser/             One process: everything in the page.
  desktop/             Electron main owns the counter; renderer forwards over IPC, CLI over a socket.
  web/api/             AdonisJS back end: counter in SQLite behind its own REST API. The registry sits beside
                       it, not inside it; if removing the registry leaves a normal Adonis app, it's right.
  web/app/             The page for web: a plain fetch client of the API, VITE_API_URL says where.
docs/                Architecture and the extracted brainstorm transcripts.
```

npm workspaces. An adapter that carries its own dependency (CLI, MCP) is its own package under
`packages/`, so an app installs only what it uses. All packages share one version.

Keep modules to one file until a file genuinely can't be read in one sitting.

## Commands

```sh
npm run build        # tsc -b: type-checks and builds every package in dependency order
npm test             # builds, then vitest run across every package
```

Packages are TypeScript project references, so a package that imports another resolves it through the
built `dist/`, the same way a consumer does. Run the tests after any change under `packages/`.

## Keybindings in one paragraph

Defaults are a plain object in the app (`{ 'cmd+n': 'openItemDialog' }`). The user patch is a parsed config file, same shape; the app reads the file and picks the parser. `resolve` canonicalizes both layers, applies patch over defaults, deletes `'unbind'` tombstones and unknown commands, and returns a `Map<chord, commandName>`. `attach` adds one `keydown` listener that turns the event into the same canonical string via `chordOf`, looks it up, and invokes through the registry; it returns the detach. The `keybindings` handle wraps all of this with a `Source` (any function producing config text) and a `reload` that re-reads, re-resolves, and swaps the reference. A failed read or parse keeps the previous table; overlapping reloads let the latest request win. `canonical` and `chordOf` must agree, and that is the module's only invariant.

Known gaps, deliberately deferred: the `mod` platform modifier, the Chromium `getLayoutMap` refinement for alt chords on non-QWERTY layouts, chord sequences, focus context, Electron menu accelerators.