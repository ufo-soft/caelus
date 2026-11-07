// Exposes exactly one function to the page: send(name, args) -> Promise<Outcome>.
// This is the renderer's `send` for forward(); the page never sees ipcRenderer.
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('caelus', {
  send: (name: string, args: unknown) => ipcRenderer.invoke('caelus:invoke', name, args),
})
