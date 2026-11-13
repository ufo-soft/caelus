# @ufo-soft/caelus-cli

A caelus registry as a command-line interface. Each command becomes a subcommand and each parameter
an option, all derived from the registry, via [commander](https://github.com/tj/commander.js).

```sh
npm install @ufo-soft/caelus @ufo-soft/caelus-cli
```

```ts
import { cli } from '@ufo-soft/caelus-cli'

process.exitCode = await cli(registry, process.argv.slice(2), 'todo')
```

```sh
$ todo add --text 'write it down'
$ todo --help
```

`cli` resolves to the exit code rather than exiting, so the caller decides what to do with it.

- A `string` or `integer` parameter is a required `--name <value>` option; an integer is checked
  before the handler runs.
- A `boolean` parameter is a `--name` flag, false when absent.
- An `ok` outcome prints its data, if any: a string as-is, anything else as JSON.
- A `failed` outcome prints its reason to stderr and exits non-zero.

Output goes to `process.stdout` and `process.stderr` unless an `Io` is passed as the fourth argument.
