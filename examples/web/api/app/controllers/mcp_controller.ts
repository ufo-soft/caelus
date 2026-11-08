import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { Registry } from '@ufo-soft/caelus'
import { mcp } from '@ufo-soft/caelus-mcp'

import { info } from '../../registry/descriptions.js'

// The registry as an MCP server over streamable HTTP, beside REST and /invoke. Stateless: each
// request gets its own server and transport, so there are no sessions to keep and nothing to
// clean up but the one request. The transport writes the raw response itself.
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
    await transport.handleRequest(request.request, response.response, request.body())
  }
}
