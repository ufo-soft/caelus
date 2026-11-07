// Electron main. The counter lives in a SQLite file (see counter.ts); main holds a registry
// on it and answers the renderer's forwarded invokes over IPC. The CLI entries hold their own
// registry on the same file, so they work whether or not this window is running.
import { BrowserWindow, app, ipcMain } from 'electron'
import type { Args } from '@ufo-soft/caelus'

import { counter, runCli } from './counter.js'

// `electron . --cli <args>`: no window; the CLI through the Electron binary, like cli.js.
const flag = process.argv.indexOf('--cli')

if (flag !== -1) {
  app.dock?.hide()
  runCli(process.argv.slice(flag + 1)).then(
    (code) => app.exit(code),
    () => app.exit(1),
  )
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
