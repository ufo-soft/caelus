import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CancelledNotificationSchema,
  isJSONRPCErrorResponse,
  isJSONRPCRequest,
  isJSONRPCResultResponse,
} from '@modelcontextprotocol/sdk/types.js'
import type { CallToolResult, Implementation, JSONRPCMessage, RequestId } from '@modelcontextprotocol/sdk/types.js'
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
 *  Resolves when the host disconnects, once every request already received has been answered; a
 *  handler that never settles keeps the process alive. Handlers must not write to stdout: that is
 *  the protocol's channel. */
export async function stdio(
  registry: Registry,
  info: Implementation,
  stdin: Readable = process.stdin,
  stdout: Writable = process.stdout,
): Promise<void> {
  const server = mcp(registry, info)
  const closed = new Promise<void>((resolve) => (server.server.onclose = resolve))
  const transport = new StdioServerTransport(stdin, stdout)

  // The SDK transport reads stdin but never notices it ending, so a host closing it would hang us.
  // Closing the moment it ends would abort any request still being answered, after its handler
  // had taken effect. So the requests are tracked where the transport sees them: pending from the
  // instant one is parsed (this onmessage runs first, inside the data event) until its response
  // has been handed to the stream. The close waits for none pending, then for the stream to take
  // what it was handed, since a pipe write returns before the bytes leave the process.
  const pending = new Set<RequestId>()
  const closeIfDone = () => {
    if (stdin.readableEnded && pending.size === 0) stdout.write('', () => void server.close())
  }
  transport.onmessage = (message) => {
    if (isJSONRPCRequest(message)) pending.add(message.id)
    // the SDK sends no response for a request the client cancelled, so stop waiting for one
    const cancelled = cancelledId(message)
    if (cancelled !== undefined) {
      pending.delete(cancelled)
      closeIfDone()
    }
  }
  const send = transport.send.bind(transport)
  transport.send = async (message: JSONRPCMessage) => {
    try {
      await send(message)
    } finally {
      if ((isJSONRPCResultResponse(message) || isJSONRPCErrorResponse(message)) && message.id != null) {
        pending.delete(message.id)
        closeIfDone()
      }
    }
  }
  stdin.once('end', closeIfDone)

  await server.connect(transport)
  return closed
}

// the SDK's own schema for the notification, and its own rule of ignoring a falsy id
function cancelledId(message: JSONRPCMessage): RequestId | undefined {
  const parsed = CancelledNotificationSchema.safeParse(message)
  return parsed.success && parsed.data.params.requestId ? parsed.data.params.requestId : undefined
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
