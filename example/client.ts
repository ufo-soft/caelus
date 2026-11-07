// The `send` for forward() from any process outside Electron main: one JSON request
// per connection to main's socket, the Outcome back as JSON.
import { connect } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { text } from 'node:stream/consumers'
import { Registry, failed, forward } from '@ufo-soft/caelus'
import type { Args, Send } from '@ufo-soft/caelus'
import { cli } from '@ufo-soft/caelus-cli'

import { commands } from './commands.js'

/** Shared by main (listens) and every client (connects); the temp dir so no Electron API is needed to find it. */
export const SOCKET = join(tmpdir(), 'caelus-example.sock')

/** The one thing that crosses the socket: exactly what invoke() takes. The reply is an Outcome. */
export interface Request {
  readonly name: string
  readonly args: Args
}

export const send: Send = async (name, args) => {
  const request: Request = { name, args }
  const connection = connect(SOCKET).end(JSON.stringify(request))
  try {
    return JSON.parse(await text(connection))
  } catch {
    return failed('no running instance to send to') // nothing listening, or it quit mid-request
  }
}

/** The CLI against a running instance. Both entries call this and differ only in how they exit. */
export function runCli(argv: readonly string[]): Promise<number> {
  const registry = new Registry()
  registry.register(forward(commands, send))
  return cli(registry, argv, 'caelus-example')
}
