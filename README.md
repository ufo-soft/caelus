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
npm run build    # type-checks and builds every package, in dependency order
npm test         # builds, then runs every package's tests
npm run dev      # builds, then serves example/ with Vite
npm run electron # builds, then opens the same example in an Electron window
```

`example/` is a plain browser app that depends on the packages by name, so it
exercises the real `exports` maps and the built `dist/`. When editing a package
with the example open, run `npx tsc -b --watch` alongside so every `dist/`
stays fresh.

## Releasing

All packages share one version and release together on one tag.

```sh
npm version patch --workspaces --no-git-tag-version
git commit -am "v0.1.1" && git tag v0.1.1
git push --follow-tags
```

The tag triggers the release workflow, which publishes every public package
and creates the GitHub Release.