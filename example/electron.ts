// Electron main: where the counter lives. Holds the real registry and answers forwarded
// invokes from two places: the renderer over IPC, and other processes (the CLI) over a
// local socket. The renderer is the same index.html + main.ts the browser runs.
import { BrowserWindow, app, ipcMain } from 'electron'
import { rmSync } from 'node:fs'
import { createServer } from 'node:net'
import { Registry, forward, ok } from '@ufo-soft/caelus'
import type { Args } from '@ufo-soft/caelus'
import { cli } from '@ufo-soft/caelus-cli'

import { SOCKET, send } from './client.js'
import { commands } from './commands.js'

let count = 0

const registry = new Registry()
registry.register([
  { name: 'increment', command: commands.increment, handler: () => ok(++count) },
  { name: 'decrement', command: commands.decrement, handler: () => ok(--count) },
  { name: 'reset', command: commands.reset, handler: () => ok((count = 0)) },
])

ipcMain.handle('caelus:invoke', (_event, name: string, args: Args) => registry.invoke(name, args))

/** One request per connection: the client writes { name, args } and half-closes;
 *  the Outcome comes back as JSON and the connection ends. */
function listen(): void {
  rmSync(SOCKET, { force: true }) // left behind if the last run was killed
  // allowHalfOpen: the client half-closes after writing, and the answer goes back on the open half
  createServer({ allowHalfOpen: true }, (connection) => {
    let text = ''
    connection.on('data', (chunk) => (text += chunk))
    connection.on('end', async () => {
      const { name, args } = JSON.parse(text)
      connection.end(JSON.stringify(await registry.invoke(name, args ?? {})))
    })
  }).listen(SOCKET)
}

// `electron . --cli <args>`: no window, no listener. This process is a client of a
// running instance, exactly like cli.js, just started through the Electron binary.
const flag = process.argv.indexOf('--cli')

if (flag !== -1) {
  app.dock?.hide()
  const client = new Registry()
  client.register(forward(commands, send))
  cli(client, process.argv.slice(flag + 1), undefined, 'caelus-example').then((code) => app.exit(code))
} else {
  app.whenReady().then(() => {
    listen()
    new BrowserWindow({
      width: 900,
      height: 720,
      webPreferences: { preload: `${import.meta.dirname}/preload.cjs` },
    }).loadFile('dist/index.html')
  })

  app.on('window-all-closed', () => app.quit())
}
