// Where the counter lives: one row in a SQLite file. Electron main and the CLI entry each
// build their own registry from this, so both read and write the same row with no bridge
// between the processes; the window just sees the row change on its next poll.
import { homedir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { Registry, bind, ok } from '@ufo-soft/caelus'
import { cli } from '@ufo-soft/caelus-cli'

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

/** The CLI over a registry opened on the file. Both entries call this and differ only in how they exit. */
export function runCli(argv: readonly string[]): Promise<number> {
  return cli(counter().registry, argv, 'caelus-example')
}
