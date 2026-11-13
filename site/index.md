# Caelus

Caelus is a command registry for TypeScript. You describe a command once, as data, and register a
handler for it. Every surface dispatches through a registry: a key chord, a button, a CLI
subcommand, or an MCP tool call.

A command is data: a description and a list of parameters, registered under a name. That is enough
for a surface to build itself: a button per command, a CLI option per parameter, an MCP tool schema
per command. A command you register appears on every surface built from the registry.

## Packages

| Package | Adds |
|---|---|
| `@ufo-soft/caelus` | The registry. `@ufo-soft/caelus/keybindings` adds key chords from a keymap object, with an optional user keymap in TOML. |
| `@ufo-soft/caelus-cli` | A registry as a command-line interface, via commander. |
| `@ufo-soft/caelus-mcp` | A registry as an MCP server, via the official MCP TypeScript SDK. |

The core module has no dependencies. The keybindings module uses `smol-toml` to parse keymaps. An
adapter that needs its own dependency is its own package, so an app installs only the surfaces it
uses.

All three packages are ES modules and share one version number.

## Install

```sh
npm install @ufo-soft/caelus
```

Then follow the [quickstart](./guide/quickstart.md).
