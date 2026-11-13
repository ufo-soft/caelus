# Commands

A command is a description and a list of parameters, registered under a name. A handler runs it and
returns an outcome. The registry holds the registrations and dispatches to them by name.

<<< @/snippets/commands.ts#register

## Parameters

Each parameter has a `name`, a `type`, and a `description`. The type is `'string'`, `'integer'`, or
`'boolean'`.

The registry does not check args against the parameters. A handler receives whatever the caller
passed, typed as `Readonly<Record<string, unknown>>`, and checks what it uses. The CLI and MCP
surfaces do validate: they build their options and input schemas from the parameters. A key chord
passes `{}`.

## Outcomes

A handler returns an outcome, or a promise of one. Build it with `ok(data)` or `failed(reason)`.

| Outcome | `kind` | Carries |
|---|---|---|
| `ok(data)` | `'ok'` | `data`. `ok()` with no argument carries `null`. |
| `failed(reason)` | `'failed'` | `reason`, a string. |

`OK` and `FAILED` are exported constants for the two kinds.

Return `failed` for anything the caller should see as a failure: bad args, a missing record, a
refused operation. An exception thrown by a handler is not caught. It rejects the promise `invoke`
returns.

## Invoking

<<< @/snippets/commands.ts#invoke

```txt
{ kind: 'ok', data: 1 }
{ kind: 'failed', reason: 'text must be a non-empty string' }
{ kind: 'failed', reason: 'no command named remove' }
```

`invoke(name, args)` always returns a promise, whether the handler is synchronous or not. An unknown
name is a failed outcome, not an exception.

## Rendering data

<<< @/snippets/render.ts

```txt
saved
{"count":3}
""
```

Surfaces that show an outcome as text use `render`. A string is shown as it is, anything else as JSON, and `null` or `undefined` as nothing. The CLI
prints this text. The MCP server returns it as the tool result, or `ok` when it is empty.

## The registry

| Method | Does |
|---|---|
| `register(registrations)` | Adds one registration or an array of them. A name registered twice keeps the last one. |
| `retrieve(name)` | Returns the registration for a name, or `undefined`. |
| `all()` | Returns every registration, in the order they were first registered. |
| `invoke(name, args)` | Runs the handler for a name and returns a promise of its outcome. |

## Shared descriptions

When more than one process registers the same commands, describe them once and bind handlers to the
descriptions. Declare the descriptions with `satisfies Commands`:

<<< @/snippets/bind.ts#descriptions

Then pair them with handlers using `bind`:

<<< @/snippets/bind.ts#bind

`bind` returns one registration per description. A description without a handler fails to compile,
and so does a handler written inline for a name that has no description.

The check needs the exact keys. An object annotated as `Commands` has plain `string` keys, and `bind`
rejects it. `satisfies Commands` checks the shape and keeps the keys.

A description file holds data only, so a process that needs the commands but not their handlers can
import it without pulling in the code behind them.

See the [API reference](/api/) for every type and signature.
