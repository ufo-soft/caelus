# @ufo-soft/caelus-mcp

A caelus registry as an MCP server. Each command becomes a tool and each parameter a field of its
input schema, all derived from the registry, via the official
[MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk).

```sh
npm install @ufo-soft/caelus @ufo-soft/caelus-mcp @modelcontextprotocol/sdk zod
```

For a server a host spawns, `stdio` serves the registry on the process's stdin and stdout:

```ts
import { stdio } from '@ufo-soft/caelus-mcp'

await stdio(registry, { name: 'todo', version: '1.0.0' })
```

```sh
claude mcp add todo -- node todo.js
```

`stdio` resolves when the host disconnects, after every request already received has been answered.
Handlers must not write to stdout: that is the protocol's channel.

For any other transport, `mcp` returns the SDK's `McpServer` with the tools registered, for the app
to connect:

```ts
import { mcp } from '@ufo-soft/caelus-mcp'

await mcp(registry, { name: 'todo', version: '1.0.0' }).connect(transport)
```

- `string` and `integer` parameters are required; `boolean` is optional and false by default. The
  same rules as `@ufo-soft/caelus-cli`.
- An `ok` outcome is one text block: its data as a string or JSON, or `ok` when there is none.
- A `failed` outcome is its reason, marked as an error.

The SDK and zod are peer dependencies, so the app's copies are the ones used.
