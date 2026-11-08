import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import type { CallToolResult, Implementation } from '@modelcontextprotocol/sdk/types.js'
import type { Readable, Writable } from 'node:stream'
import { z } from 'zod/v4'

import { OK, render } from '@ufo-soft/caelus'
import type { Args, Outcome, Parameter, Registry } from '@ufo-soft/caelus'

/** Exposes the registry as an MCP server named for the app: one tool per command, all derived. Returns
 *  the SDK's server so the app can connect whatever transport it has; for the spawned-process case, stdio(). */
export function mcp(registry: Registry, info: Implementation): McpServer {
  // declared up front so an empty registry still answers tools/list instead of "method not found"
  const server = new McpServer(info, { capabilities: { tools: {} } })
  for (const { name, command } of registry.all()) {
    server.registerTool(
      name,
      { description: command.description, inputSchema: shapeOf(command.parameters) },
      async (args: Args) => resultOf(await registry.invoke(name, args)),
    )
  }
  return server
}

/** The registry as an MCP server on this process's stdin and stdout, the way a host launches one.
 *  Resolves when the host disconnects. Handlers must not write to stdout: that is the protocol's channel. */
export async function stdio(
  registry: Registry,
  info: Implementation,
  stdin: Readable = process.stdin,
  stdout: Writable = process.stdout,
): Promise<void> {
  const server = mcp(registry, info)
  const closed = new Promise<void>((resolve) => (server.server.onclose = resolve))
  // the SDK transport reads stdin but never notices it ending, so a host closing it would hang us
  stdin.once('end', () => void server.close())
  await server.connect(new StdioServerTransport(stdin, stdout))
  return closed
}

/** One zod field per parameter: the tool's inputSchema, and the validation that runs before a handler
 *  sees the arguments. The CLI's rules: string and integer required, boolean optional and false by default. */
export function shapeOf(parameters: readonly Parameter[]): Record<string, z.ZodType> {
  return Object.fromEntries(parameters.map((p) => [p.name, fieldOf(p.type).describe(p.description)]))
}

const fieldOf = (type: Parameter['type']): z.ZodType => {
  if (type === 'integer') return z.number().int()
  if (type === 'boolean') return z.boolean().default(false)
  return z.string()
}

/** An Outcome as a tool result: ok is one text block, failed is the reason marked as an error.
 *  A tool result needs some text, so no data says "ok" where the CLI prints nothing. */
export function resultOf(outcome: Outcome): CallToolResult {
  if (outcome.kind === OK) return { content: [{ type: 'text', text: render(outcome.data) || 'ok' }] }
  return { content: [{ type: 'text', text: outcome.reason }], isError: true }
}
