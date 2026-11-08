import { Command, CommanderError, InvalidArgumentError, Option } from 'commander'

import { FAILED, render } from '@ufo-soft/caelus'
import type { Args, Parameter, Registration, Registry } from '@ufo-soft/caelus'

/** Where the CLI writes. Defaults to the process streams; tests hand in collectors. */
export interface Io {
  out(text: string): void
  err(text: string): void
}

const stdio: Io = { out: (text) => process.stdout.write(text), err: (text) => process.stderr.write(text) }

/** What commander hands an action: values keyed by camelCased option name, not by parameter name. */
export type OptionValues = Record<string, unknown>

/** Exposes the registry as a CLI named `name`: one subcommand per command, one option per parameter,
 *  all derived. Resolves to the exit code; the caller decides whether to exit the process. */
export async function cli(registry: Registry, argv: readonly string[], name: string, io: Io = stdio): Promise<number> {
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
function subcommand(root: Command, { name, command: { description, parameters } }: Registration, registry: Registry, io: Io): void {
  const options = parameters.map(optionOf)
  const sub = root.command(name).description(description)
  for (const option of options) sub.addOption(option)
  sub.action(async (opts: OptionValues) => {
    const outcome = await registry.invoke(name, argsOf(options, opts))
    if (outcome.kind === FAILED) return sub.error(outcome.reason)
    const text = render(outcome.data)
    if (text) io.out(text + '\n')
  })
}

/** One commander option per parameter: string and integer take a value and are mandatory, boolean is a flag. */
export function optionOf(parameter: Parameter): Option {
  const { name, type, description } = parameter
  if (type === 'boolean') return new Option(`--${name}`, description).default(false)
  const option = new Option(`--${name} <value>`, description).makeOptionMandatory()
  return type === 'integer' ? option.argParser(integer) : option
}

/** Parsed values back under their parameter names. An option's name() is the parameter name;
 *  its attributeName() is the camelCased key commander stores the value under. */
export function argsOf(options: readonly Option[], opts: OptionValues): Args {
  return Object.fromEntries(options.map((option) => [option.name(), opts[option.attributeName()]]))
}

function integer(raw: string): number {
  if (!/^-?\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) throw new InvalidArgumentError('expected an integer')
  return Number(raw)
}
