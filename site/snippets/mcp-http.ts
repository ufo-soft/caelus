import { createServer } from 'node:http'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { Registry, ok } from '@ufo-soft/caelus'
import { mcp } from '@ufo-soft/caelus-mcp'

const registry = new Registry()
registry.register({
  name: 'count',
  command: { description: 'How many todos there are', parameters: [] },
  handler: () => ok(0),
})

// Stateless: a new server and transport per request
createServer(async (request, response) => {
  const server = mcp(registry, { name: 'todo', version: '1.0.0' })
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  response.on('close', () => {
    void transport.close()
    void server.close()
  })
  await server.connect(transport)
  await transport.handleRequest(request, response)
}).listen(3000)
