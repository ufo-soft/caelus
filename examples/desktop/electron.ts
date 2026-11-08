// Electron main. The counter lives in a SQLite file (see counter.ts); main holds a registry
// on it and answers the renderer's forwarded invokes over IPC. The CLI and MCP entries hold
// their own registry on the same file, so they work whether or not this window is running.
import { BrowserWindow, app, ipcMain } from 'electron'
import type { Args } from '@ufo-soft/caelus'

import { counter, runCli, runMcp } from './counter.js'

// `electron . --cli <args>` and `electron . --mcp`: no window; the CLI or the MCP server through
// the Electron binary, the same as cli.js and mcp.js through plain Node. The prototype's modes.
const flag = process.argv.indexOf('--cli')

// stderr is the one channel a host keeps for a spawned server, so a failure is written there before exiting
const failing = (error: unknown) => {
  console.error(error)
  app.exit(1)
}

if (flag !== -1) {
  app.dock?.hide()
  runCli(process.argv.slice(flag + 1)).then((code) => app.exit(code), failing)
} else if (process.argv.includes('--mcp')) {
  app.dock?.hide()
  runMcp().then(() => app.exit(0), failing)
} else {
  app.whenReady().then(() => {
    const { registry, current } = counter()
    ipcMain.handle('caelus:invoke', (_event, name: string, args: Args) => registry.invoke(name, args))
    ipcMain.handle('caelus:count', current) // a read for display, beside the registry: not an action
    new BrowserWindow({
      width: 900,
      height: 720,
      webPreferences: { preload: `${import.meta.dirname}/preload.cjs` },
    }).loadFile('dist/index.html')
  })

  app.on('window-all-closed', () => app.quit())
}
