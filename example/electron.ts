// Electron main: where the counter lives. Holds the real registry and answers forwarded
// invokes from two places: the renderer over IPC, and other processes (the CLI) over a
// local socket. The renderer is the same index.html + main.ts the browser runs.
import { BrowserWindow, app, ipcMain } from 'electron'
import { rmSync } from 'node:fs'
import { createServer } from 'node:net'
import { text } from 'node:stream/consumers'
import { Registry, bind, failed, ok } from '@ufo-soft/caelus'
import type { Args, Outcome } from '@ufo-soft/caelus'

import { SOCKET, runCli } from './client.js'
import type { Invocation } from './client.js'
import { commands } from './commands.js'

// `electron . --cli <args>`: no window, no registry of its own. This process is a client of
// a running instance, exactly like cli.js, just started through the Electron binary.
const flag = process.argv.indexOf('--cli')

if (flag !== -1) {
  app.dock?.hide()
  runCli(process.argv.slice(flag + 1)).then(
    (code) => app.exit(code),
    () => app.exit(1),
  )
} else if (!app.requestSingleInstanceLock()) {
  app.quit() // a second window would take the socket path from the first
} else {
  app.whenReady().then(() => {
    const registry = counter()
    ipcMain.handle('caelus:invoke', (_event, name: string, args: Args) => registry.invoke(name, args))
    listen(registry)
    new BrowserWindow({
      width: 900,
      height: 720,
      webPreferences: { preload: `${import.meta.dirname}/preload.cjs` },
    }).loadFile('dist/index.html')
  })

  app.on('window-all-closed', () => app.quit())
}

function counter(): Registry {
  let count = 0
  const registry = new Registry()
  registry.register(
    bind(commands, {
      increment: () => ok(++count),
      decrement: () => ok(--count),
      reset: () => ok((count = 0)),
    }),
  )
  return registry
}

/** One request per connection: the client writes an Invocation and half-closes;
 *  the Outcome comes back as JSON and the connection ends. */
function listen(registry: Registry): void {
  rmSync(SOCKET, { force: true }) // nothing closes the server on quit, so the file outlives every run
  // allowHalfOpen: the client half-closes after writing, and the answer goes back on the open half
  const server = createServer({ allowHalfOpen: true }, async (connection) => {
    connection.on('error', () => connection.destroy())
    try {
      connection.end(JSON.stringify(await answer(registry, await text(connection))))
    } catch {
      connection.destroy() // the client went away mid-request
    }
  })
  server.on('error', (error) => console.error('socket listener:', error.message))
  server.listen(SOCKET)
}

// The socket is a trust boundary: whatever arrives becomes an Outcome, never a throw.
async function answer(registry: Registry, request: string): Promise<Outcome> {
  const parsed = parse(request)
  if (!parsed) return failed('malformed request')
  try {
    return await registry.invoke(parsed.name, parsed.args)
  } catch (error) {
    return failed(error instanceof Error ? error.message : String(error))
  }
}

function parse(request: string): Invocation | undefined {
  try {
    const { name, args } = JSON.parse(request)
    if (typeof name !== 'string') return undefined
    return { name, args: typeof args === 'object' && args !== null ? args : {} }
  } catch {
    return undefined
  }
}
