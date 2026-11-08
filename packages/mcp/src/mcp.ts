import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import type { CallToolResult, Implementation } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'

import { OK } from '@ufo-soft/caelus'
import type { Args, Outcome, Parameter, Registry } from '@ufo-soft/caelus'

const DEFAULT_INFO: Implementation = { name: 'caelus', version: '0.1.0' }

/** Exposes the registry as an MCP server: one tool per command, all derived. Returns the SDK's
 *  server so the app can connect whatever transport it has; for the spawned-process case, stdio(). */
export function mcp(registry: Registry, info: Implementation = DEFAULT_INFO): McpServer {
  const server = new McpServer(info)
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
 *  Resolves when the host disconnects. */
export async function stdio(registry: Registry, info?: Implementation): Promise<void> {
  const server = mcp(registry, info)
  await server.connect(new StdioServerTransport())
  return new Promise((resolve) => (server.server.onclose = resolve))
}

/** One required zod field per parameter: the tool's inputSchema, and the validation that
 *  runs before a handler sees the arguments. Mirrors the CLI: integers must be integers. */
export function shapeOf(parameters: readonly Parameter[]): Record<string, z.ZodType> {
  return Object.fromEntries(parameters.map((p) => [p.name, fieldOf(p.type).describe(p.description)]))
}

const fieldOf = (type: Parameter['type']): z.ZodType => {
  if (type === 'integer') return z.number().int()
  if (type === 'boolean') return z.boolean()
  return z.string()
}

/** An Outcome as a tool result: ok is one text block, failed is the reason marked as an error. */
export function resultOf(outcome: Outcome): CallToolResult {
  if (outcome.kind === OK) return { content: [{ type: 'text', text: render(outcome.data) }] }
  return { content: [{ type: 'text', text: outcome.reason }], isError: true }
}

// The CLI's rendering rule, so the two surfaces agree on what data looks like. The one
// difference: a tool result needs some text, so no data says "ok" where the CLI prints nothing.
function render(data: unknown): string {
  if (data == null) return 'ok'
  if (typeof data === 'string') return data
  return JSON.stringify(data)
}