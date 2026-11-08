// A standalone CLI for the web app: a separate process, installed anywhere, that holds the
// same descriptions the server binds and forwards every command to the API's invoke route.
// The descriptions are compiled in from the API's source, which is why that file may import
// nothing at runtime.
import { Registry, failed, forward } from '@ufo-soft/caelus'
import type { Send } from '@ufo-soft/caelus'
import { cli } from '@ufo-soft/caelus-cli'
import { stdio } from '@ufo-soft/caelus-mcp'

import { commands } from '../api/registry/descriptions.js'

const base = process.env.COUNTER_API ?? 'http://localhost:3333/api/v1'

const send: Send = async (name, args) => {
  try {
    const response = await fetch(`${base}/invoke`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, args }),
    })
    return response.ok ? await response.json() : failed(`${response.status} from ${base}/invoke`)
  } catch (error) {
    return failed(`${base}/invoke: ${error instanceof Error ? error.message : String(error)}`)
  }
}

const registry = new Registry()
registry.register(forward(commands, send))

// the name hosts register this bin under, so the CLI's help and the MCP server's serverInfo say the same thing
const INFO = { name: 'counter', version: '0.1.0' }

// `counter --mcp`: the same forwarding registry as an MCP server over stdio, for a host to spawn;
// every tool call becomes a POST to the API. Only as the first argument: anywhere else it is an
// unknown option the CLI rejects, not a silent switch into a server.
const argv = process.argv.slice(2)
if (argv[0] === '--mcp') await stdio(registry, INFO)
else process.exitCode = await cli(registry, argv, INFO.name)
