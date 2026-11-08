// Where the counter lives: one row in a SQLite file. Electron main, the CLI and the MCP server
// each build their own registry from this, so all of them read and write the same row with no
// bridge between the processes; the window just sees the row change on its next poll.
import { homedir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { Registry, bind, ok } from '@ufo-soft/caelus'
import { cli } from '@ufo-soft/caelus-cli'
import { stdio } from '@ufo-soft/caelus-mcp'

import { commands } from './commands.js'

export const DATABASE = join(homedir(), '.caelus-example.sqlite')

export function counter(): { registry: Registry; current: () => number } {
  const db = new DatabaseSync(DATABASE)
  db.exec(`
    CREATE TABLE IF NOT EXISTS counter (id INTEGER PRIMARY KEY CHECK (id = 1), value INTEGER NOT NULL);
    INSERT OR IGNORE INTO counter (id, value) VALUES (1, 0);
  `)
  const adjust = db.prepare('UPDATE counter SET value = value + ? WHERE id = 1 RETURNING value')
  const reset = db.prepare('UPDATE counter SET value = 0 WHERE id = 1 RETURNING value')
  const read = db.prepare('SELECT value FROM counter WHERE id = 1')
  const value = (row: unknown) => (row as { value: number }).value

  const registry = new Registry()
  registry.register(
    bind(commands, {
      increment: () => ok(value(adjust.get(1))),
      decrement: () => ok(value(adjust.get(-1))),
      reset: () => ok(value(reset.get())),
    }),
  )
  return { registry, current: () => value(read.get()) }
}

// the name hosts register this app under, so the CLI's help and the MCP server's serverInfo say the same thing
const INFO = { name: 'caelus-desktop', version: '0.1.0' }

// Both runners are async so that a failure to open the file is a rejection the entries can report
// and exit on, not a synchronous throw, which under Electron would be a modal dialog in a headless process.

/** The CLI over a registry opened on the file. Both entries call this and differ only in how they exit. */
export async function runCli(argv: readonly string[]): Promise<number> {
  return cli(counter().registry, argv, INFO.name)
}

/** The MCP server over a registry opened on the file, on stdin and stdout; resolves when the host disconnects. */
export async function runMcp(): Promise<void> {
  return stdio(counter().registry, INFO)
}
