// `node dist/cli.js <args>`: a client of a running instance, without booting Electron.
import { runCli } from './client.js'

process.exitCode = await runCli(process.argv.slice(2))
