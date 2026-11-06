import { Command, CommanderError, InvalidArgumentError, Option } from 'commander'

import { FAILED } from '@ufo-soft/caelus'
import type { Args, Parameter, Registration, Registry } from '@ufo-soft/caelus'

/** Where the CLI writes. Defaults to the process streams; tests hand in collectors. */
export interface Io {
  out(text: string): void
  err(text: string): void
}

const stdio: Io = { out: (text) => process.stdout.write(text), err: (text) => process.stderr.write(text) }

/** Exposes the registry as a CLI: one subcommand per command, one option per parameter, all derived.
 *  Resolves to the exit code; the caller decides whether to exit the process. */
export async function cli(registry: Registry, argv: readonly string[], io: Io = stdio, name = 'app'): Promise<number> {
  const root = new Command(name).exitOverride().configureOutput({ writeOut: io.out, writeErr: io.err })
  for (const registration of registry.all()) subcommand(root, registration, registry, io)
  try {
    await root.parseAsync(argv, { from: 'user' })
    return 0
  } catch (e) {
    if (e instanceof CommanderError) return e.exitCode
    throw e
  }
}

// root.command() rather than addCommand(): only the former copies exitOverride and output config to the child
function subcommand(root: Command, { name, command }: Registration, registry: Registry, io: Io): void {
  const sub = root.command(name).description(command.description)
  for (const parameter of command.parameters) sub.addOption(optionOf(parameter))
  sub.action(async (opts: Record<string, unknown>) => {
    const outcome = await registry.invoke(name, argsOf(command.parameters, opts))
    if (outcome.kind === FAILED) return sub.error(outcome.reason, { exitCode: 1 })
    if (outcome.data !== null) io.out(render(outcome.data) + '\n')
  })
}

const render = (data: unknown): string => (typeof data === 'string' ? data : JSON.stringify(data))

/** One commander option per parameter: string and integer take a value and are mandatory, boolean is a flag. */
export function optionOf(parameter: Parameter): Option {
  const { name, type, description } = parameter
  if (type === 'boolean') return new Option(`--${name}`, description).default(false)
  const option = new Option(`--${name} <value>`, description).makeOptionMandatory()
  return type === 'integer' ? option.argParser(integer) : option
}

/** Parsed option values back under their parameter names. Commander camelCases option names; attributeName() is that key. */
export function argsOf(parameters: readonly Parameter[], opts: Record<string, unknown>): Args {
  return Object.fromEntries(parameters.map((p) => [p.name, opts[optionOf(p).attributeName()]]))
}

function integer(raw: string): number {
  if (!/^-?\d+$/.test(raw)) throw new InvalidArgumentError('expected an integer')
  return Number(raw)
}