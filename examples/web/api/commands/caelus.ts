import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { Registry } from '@ufo-soft/caelus'
import { cli } from '@ufo-soft/caelus-cli'

/**
 * `node ace caelus -- <command> [options]`: the registry's CLI, in-process. The app boots,
 * the registry comes out of the container, and the handlers hit the database directly.
 * Ace parses everything before `--` itself and rewrites option values as it goes, so the
 * registry's arguments go after `--`, which reaches here untouched.
 */
export default class Caelus extends BaseCommand {
  static commandName = 'caelus'
  static description = 'Run a registry command against this app: node ace caelus -- <command>'
  static options: CommandOptions = { startApp: true }

  async run() {
    const registry = await this.app.container.make(Registry)
    this.exitCode = await cli(registry, this.parsed._.map(String), 'node ace caelus --')
  }
}
