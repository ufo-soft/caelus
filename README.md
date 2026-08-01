# caelus

Define a command once. Dispatch it from anywhere — a button, a key chord, a
CLI subcommand, an MCP tool call.

A command registry: commands are self-describing runtime objects, so any
surface can project them outward without core knowing that surface exists.

This is a TypeScript port of the Kotlin Multiplatform prototype at
[ufo-soft/caelus-old](https://github.com/ufo-soft/caelus-old).

## Core

Zero dependencies. `src/core.ts` is the whole thing.

```ts
import { Registry, ok, failed } from '@ufo-soft/caelus'

const registry = new Registry()

registry.register({
  name: 'add',
  command: {
    description: 'Add a todo',
    parameters: [{ name: 'text', type: 'string', description: 'The todo text' }],
  },
  handler: ({ text }) => {
    if (typeof text !== 'string') return failed('text must be a string')
    store.add(text)
    return ok()
  },
})

registry.invoke('add', { text: 'write it down' })
```

Adapters (keybindings, CLI, MCP, UI) are out of scope for now.

## Development

```sh
npm install
npm test
npm run build
```
