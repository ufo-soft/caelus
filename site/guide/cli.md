# CLI

`@ufo-soft/caelus-cli` turns a registry into a command-line interface: one subcommand per command,
one option per parameter. It is built on commander.

```sh
npm install @ufo-soft/caelus @ufo-soft/caelus-cli
```

<<< @/snippets/cli.ts

`cli(registry, argv, name)` builds the interface from the registry, parses `argv`, and invokes the
matching command. It resolves to the exit code and does not exit the process. `argv` is the
arguments only, without the Node and script paths.

Each run below is a separate process:

```txt
$ todo add --text 'write the docs'
["write the docs"]

$ todo remove --index 3
no todo at 3

$ todo remove --index two
error: option '--index <value>' argument 'two' is invalid. expected an integer

$ todo add
error: required option '--text <value>' not specified
```

## Options

Each parameter becomes an option named after it, as written: a parameter `dryRun` is `--dryRun`.

| Parameter type | Option | Rules |
|---|---|---|
| `string` | `--name <value>` | Required. |
| `integer` | `--name <value>` | Required. Must be a whole number, checked before the handler runs. |
| `boolean` | `--name` | Optional. `false` when absent. |

## Output

An `ok` outcome prints its data, rendered as text: a string as it is, anything else as JSON. An
outcome with no data prints nothing. The exit code is 0.

A `failed` outcome prints its reason to stderr, and the exit code is 1. A missing or invalid option
does the same, with commander's message.

A handler that throws is not caught: the promise `cli` returns rejects.

## Help

`--help` lists the subcommands with their descriptions, and `<command> --help` lists a command's
options with the parameter descriptions:

```txt
$ todo add --help
Usage: todo add [options]

Add a todo

Options:
  --text <value>  The todo text
  --top           Put it first (default: false)
  -h, --help      display help for command
```

## Output streams

Output goes to `process.stdout` and `process.stderr`. To capture it, in a test or an embedded
terminal, pass an `Io` with `out` and `err` functions as the fourth argument. See the
[API reference](/api/@ufo-soft/caelus-cli/) for `cli`, `Io`, and the `optionOf` and `argsOf`
helpers.
