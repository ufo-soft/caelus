// Exposes two functions to the page: send(name, args) -> Promise<Outcome>, the renderer's
// `send` for forward(), and count() -> Promise<number>, a read for display. The page never
// sees ipcRenderer.
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('caelus', {
  send: (name: string, args: unknown) => ipcRenderer.invoke('caelus:invoke', name, args),
  count: () => ipcRenderer.invoke('caelus:count'),
})
