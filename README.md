# caelus

Define a command once. Dispatch it from anywhere — a button, a key chord, a
CLI subcommand, an MCP tool call.

This is a TypeScript port of the Kotlin Multiplatform prototype at
[ufo-soft/caelus-old](https://github.com/ufo-soft/caelus-old).

## Packages

| package | what |
|---|---|
| [`@ufo-soft/caelus`](packages/caelus) | the registry and the keybindings surface |

Adapters that carry their own dependencies get their own package, so an app
only installs what it uses.

## Development

```sh
npm install
npm run build    # type-checks and builds every package and example, in dependency order
npm test         # builds, then runs every package's tests
npm run browser  # builds, then serves examples/browser with Vite
npm run desktop  # builds, then opens examples/desktop in an Electron window
```

## Examples

Each example is the same app, a counter with three commands, built as a
different architecture. They deliberately share no code: what stays constant
is the behavior, so the only variable between them is where the registry
lives and how surfaces reach it.

| example | shape |
|---|---|
| `examples/browser` | one process: counter, registry, keys and buttons all in the page |
| `examples/desktop` | Electron main owns the counter; the renderer forwards over IPC, a CLI forwards over a local socket |
| `examples/web/api` | an AdonisJS back end owns the counter in SQLite behind its own REST API; the registry sits beside it |
| `examples/web/app` | the browser half of `web`: the same page as the others, whose forwarders dispatch into a hand-written REST client; the API's URL is in `VITE_API_URL` |

`examples/web/api` has its own toolchain, so it isn't part of the root build.
First run, from `examples/web/api`:

```sh
cp .env.example .env
node ace generate:key
node ace migration:run
```

Then, from the root, `npm run web:api` serves the API on port 3333 and
`npm run web:app` serves the page against it. The framework generates its
route index on first serve; `npm run typecheck -w examples/web/api` passes
after that, and so does `node ace caelus -- <command>`, the registry's CLI
running in-process inside the Adonis app. Everything after `--` reaches the
registry's CLI untouched; ace parses whatever comes before it. A new
controller needs that regeneration too before ace commands can load the
routes that use it.

The examples depend on the packages by name, so they exercise the real
`exports` maps and the built `dist/`. When editing a package with an example
open, run `npx tsc -b --watch` alongside so every `dist/` stays fresh.

## Releasing

All packages share one version and release together on one tag.

```sh
npm version patch --workspaces --no-git-tag-version
git commit -am "v0.1.1" && git tag v0.1.1
git push --follow-tags
```

On a minor or major bump, also update the `@ufo-soft/caelus` range in each
adapter package's `package.json` (for example `packages/cli`). `npm version`
bumps the packages but not the ranges between them, and a stale range makes
npm stop linking the workspace and resolve the old version from the registry.

The tag triggers the release workflow, which publishes every public package
and creates the GitHub Release.