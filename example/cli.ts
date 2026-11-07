// `node dist/cli.js <args>`: a client of a running instance, without booting Electron.
import { Registry, forward } from '@ufo-soft/caelus'
import { cli } from '@ufo-soft/caelus-cli'

import { send } from './client.js'
import { commands } from './commands.js'

const registry = new Registry()
registry.register(forward(commands, send))

process.exit(await cli(registry, process.argv.slice(2), undefined, 'caelus-example'))
