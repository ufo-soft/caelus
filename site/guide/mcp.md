# MCP

`@ufo-soft/caelus-mcp` serves a registry as an MCP server: one tool per command, one input schema
field per parameter. It is built on the official MCP TypeScript SDK.

```sh
npm install @ufo-soft/caelus @ufo-soft/caelus-mcp @modelcontextprotocol/sdk zod
```

The SDK and zod are peer dependencies, so the server uses the app's copies.

## Over stdio

<<< @/snippets/mcp.ts#stdio

`stdio(registry, info)` serves the registry on the process's stdin and stdout, the way an MCP host
runs a server it starts. `info` is the name and version the server reports to the host. To add it
to Claude Code:

```sh
claude mcp add todo -- node todo.js
```

`stdio` resolves when the host closes stdin, after every request already received has been
answered.

::: warning stdout belongs to the protocol
Over stdio, the host reads stdout as protocol messages, so anything else a handler writes there
corrupts the stream. `console.log` writes to stdout. Log to stderr with `console.error`.
:::

## Tools

Each command becomes a tool with the command's name and description. Each parameter becomes a field
of the tool's input schema:

```json
{
  "name": "add",
  "description": "Add a todo",
  "inputSchema": {
    "type": "object",
    "properties": {
      "text": { "type": "string", "description": "The todo text" }
    },
    "required": ["text"]
  }
}
```

| Parameter type | Schema field | Rules |
|---|---|---|
| `string` | `string` | Required. |
| `integer` | `integer` | Required. Must be a whole number. |
| `boolean` | `boolean` | Optional. `false` when absent. |

The SDK validates the arguments against the schema before the handler runs. The rules match the
[CLI](./cli.md)'s.

## Results

| Outcome | Tool result |
|---|---|
| `ok(data)` | One text block: the data as a string or JSON, or `ok` when there is none. |
| `failed(reason)` | One text block with the reason, marked `isError`. |

Invalid arguments and a handler that throws also come back as results marked `isError`, with the
message as the text. For the `add` command above:

```json
{ "content": [{ "type": "text", "text": "[\"write the docs\"]" }] }
{ "content": [{ "type": "text", "text": "text must be a non-empty string" }], "isError": true }
```

## Other transports

`mcp(registry, info)` returns the SDK's `McpServer` with the tools registered, for any transport the
SDK supports. Over streamable HTTP, without sessions:

<<< @/snippets/mcp-http.ts

The tools are the commands registered when `mcp` is called. A command registered later is not a
tool on that server. A stateless HTTP server like this one builds a new server per request, so it
always has the current commands.

See the [API reference](/api/@ufo-soft/caelus-mcp/) for `mcp`, `stdio`, and the `shapeOf` and
`resultOf` helpers.
