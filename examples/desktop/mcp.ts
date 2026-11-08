// `node dist/mcp.js`: the MCP server on the shared file, without booting Electron. A host
// spawns this and talks over stdin and stdout; it exits when the host disconnects.
import { runMcp } from './counter.js'

await runMcp()
