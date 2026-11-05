// Electron main process. The renderer is the same index.html + main.ts the
// browser runs; this file only opens a window on the Vite build of it.
import { app, BrowserWindow } from 'electron'

app.whenReady().then(() => {
  new BrowserWindow({ width: 900, height: 720 }).loadFile('dist/index.html')
})

app.on('window-all-closed', () => app.quit())
