// A standalone CLI for the web app: a separate process, installed anywhere, that holds the
// same descriptions the server binds and forwards every command to the API's invoke route.
// The descriptions are compiled in from the API's source, which is why that file may import
// nothing at runtime.
import { Registry, failed, forward } from '@ufo-soft/caelus'
import type { Send } from '@ufo-soft/caelus'
import { cli } from '@ufo-soft/caelus-cli'

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

process.exitCode = await cli(registry, process.argv.slice(2), 'counter')
