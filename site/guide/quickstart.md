# Quickstart

This page registers one command and dispatches it from two surfaces in a web page: a button and a
key chord.

## Register a command

<<< @/snippets/quickstart.ts#register

A registration has three parts. The `name` is how every surface calls the command. The `command`
describes it: a description and its parameters, here none. The `handler` does the work and returns
an outcome: `ok` with data, or `failed` with a reason.

## Dispatch it from two surfaces

<<< @/snippets/quickstart.ts#surfaces

The buttons come from `registry.all()`, so every registered command gets one with no per-command
code. The keymap maps the chord `alt+up` to the command's name. Both call
`registry.invoke` with the name and the args.

## Read the outcome

<<< @/snippets/quickstart.ts#invoke

```txt
1
```

`invoke` always returns a promise of an outcome. Check `kind` before reading `data`: a failed
outcome has a `reason` instead.

## Next

- [Commands](./commands.md): parameters, handlers, outcomes, and the registry in full.
- [Keybindings](./keybindings.md), [CLI](./cli.md), [MCP](./mcp.md): the surfaces.
