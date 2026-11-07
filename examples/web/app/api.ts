// The app's REST client: one function per endpoint, the way a web app would write it
// before it had ever heard of a command registry. It is also the whole REST-to-command
// mapping: `counter` must have a call for every described command, and the compiler checks it.
import { commands } from '../api/start/commands.js'

const base = import.meta.env.VITE_API_URL

async function call(method: string, path: string): Promise<number> {
  const response = await fetch(`${base}${path}`, { method })
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status}`)
  const { value } = (await response.json()) as { value: number }
  return value
}

export const current = () => call('GET', '/counter')

export const counter = {
  increment: () => call('POST', '/counter/increment'),
  decrement: () => call('POST', '/counter/decrement'),
  reset: () => call('DELETE', '/counter'),
} satisfies Record<keyof typeof commands, () => Promise<number>>
