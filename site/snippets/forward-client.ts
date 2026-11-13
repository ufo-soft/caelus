// #region send
import { Registry, failed, forward } from '@ufo-soft/caelus'
import type { Send } from '@ufo-soft/caelus'

import { commands } from './descriptions.js'

const send: Send = async (name, args) => {
  try {
    const response = await fetch('http://localhost:3000/invoke', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, args }),
    })
    return response.ok ? await response.json() : failed(`${response.status} from the server`)
  } catch (error) {
    return failed(error instanceof Error ? error.message : String(error))
  }
}

const registry = new Registry()
registry.register(forward(commands, send))
// #endregion send

// #region cli
import { cli } from '@ufo-soft/caelus-cli'

process.exitCode = await cli(registry, process.argv.slice(2), 'counter')
// #endregion cli
