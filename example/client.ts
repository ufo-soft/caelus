// The `send` for forward() from any process outside Electron main: one JSON request
// per connection to main's socket, the Outcome back as JSON.
import { connect } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Registry, failed } from '@ufo-soft/caelus'
import type { Args, Outcome } from '@ufo-soft/caelus'
import { cli } from '@ufo-soft/caelus-cli'

import { commands } from './commands.js'

/** Shared by main (listens) and every client (connects); the temp dir so no Electron API is needed to find it. */
export const SOCKET = join(tmpdir(), 'caelus-example.sock')

export const send = (name: string, args: Args): Promise<Outcome> =>
  new Promise((resolve) => {
    const connection = connect(SOCKET)
    let text = ''
    connection.on('data', (chunk) => (text += chunk))
    connection.on('end', () => resolve(JSON.parse(text)))
    connection.on('error', () => resolve(failed('no running instance to send to')))
    connection.end(JSON.stringify({ name, args }))
  })

/** The CLI against a running instance. Both entries call this and differ only in how they exit. */
export function runCli(argv: readonly string[]): Promise<number> {
  const registry = new Registry()
  registry.forward(commands, send)
  return cli(registry, argv, undefined, 'caelus-example')
}
