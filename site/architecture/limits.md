# Known limits

What Caelus does not do, as of this version.

## Commands

- The registry does not validate args against parameters. Handlers check their own args. The CLI
  and MCP surfaces validate before the handler runs; a key chord, a button, and a forwarder do not.
- Parameters have three types: `string`, `integer`, and `boolean`. There are no arrays, objects, or
  enumerations.
- A `string` or `integer` parameter is always required by the CLI and MCP surfaces. Only `boolean`
  parameters are optional.
- An outcome is a single value. There is no streaming or progress reporting.

## Keybindings

- No platform modifier (`mod`). Bind the `cmd` and `ctrl` chords separately.
- No chord sequences, such as `cmd+k cmd+s`.
- No focus context: the listener fires wherever focus is, text fields included.
- No Electron menu accelerators.
- `alt` chords are read by physical key position on a US layout.
- The table resolves against the registry when it is built. Commands registered later need a
  `reload()`.

## CLI and MCP

- The CLI has long options only, named after the parameters. There are no positional arguments or
  short flags.
- An MCP server's tools are the commands registered when `mcp()` is called.

## Forwarding

- `forward` defines no transport. The app writes `send`.
- Outcomes cross processes as JSON, so returned data has to be JSON-safe.
