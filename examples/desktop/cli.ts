// `node dist/cli.js <args>`: the CLI on the shared file, without booting Electron.
import { runCli } from './counter.js'

process.exitCode = await runCli(process.argv.slice(2))
