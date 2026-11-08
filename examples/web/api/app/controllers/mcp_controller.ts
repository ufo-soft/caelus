import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { Registry } from '@ufo-soft/caelus'
import { mcp } from '@ufo-soft/caelus-mcp'

import { info } from '../../registry/descriptions.js'

// The registry as an MCP server over streamable HTTP, beside REST and /invoke. Stateless: each
// request gets its own server and transport, so there are no sessions to keep and nothing to
// clean up but the one request. The transport writes the raw response itself, so the headers
// Adonis queued (CORS among them) are relayed onto it first, and it gets the body as the client
// sent it, since the bodyparser's copy has had empty strings turned into null.
@inject()
export default class McpController {
  constructor(private registry: Registry) {}

  async handle({ request, response }: HttpContext) {
    const server = mcp(this.registry, info)
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    response.response.on('close', () => {
      void transport.close()
      void server.close()
    })
    await server.connect(transport)
    response.relayHeaders()
    const raw = request.raw()
    await transport.handleRequest(request.request, response.response, raw ? JSON.parse(raw) : undefined)
  }
}
