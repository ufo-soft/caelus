import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { Registry } from '@ufo-soft/caelus'
import { cli } from '@ufo-soft/caelus-cli'

/**
 * `node ace caelus <command> [--options]`: the registry's CLI, in-process. The app boots,
 * the registry comes out of the container, and the handlers hit the database directly.
 */
export default class Caelus extends BaseCommand {
  static commandName = 'caelus'
  static description = 'Run a registry command against this app'
  static options: CommandOptions = { startApp: true, allowUnknownFlags: true }

  async run() {
    const registry = await this.app.container.make(Registry)
    this.exitCode = await cli(registry, this.argv(), 'node ace caelus')
  }

  // ace has already parsed everything after `caelus` and does not keep the raw argv, so the
  // CLI gets it rebuilt: positionals, then each unknown flag with its value. `--help` never
  // reaches here; ace answers it itself. Use `node ace caelus help` for the registry's help.
  private argv(): string[] {
    const { _, unknownFlags, flags } = this.parsed
    const positionals = _.map(String)
    const options = unknownFlags.flatMap((name: string) =>
      flags[name] === true ? [`--${name}`] : [`--${name}`, String(flags[name])],
    )
    return [...positionals, ...options]
  }
}
