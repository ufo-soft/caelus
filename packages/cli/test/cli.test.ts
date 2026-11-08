import { describe, expect, it } from 'vitest'
import { InvalidArgumentError } from 'commander'

import { Registry, failed, ok } from '@ufo-soft/caelus'
import type { Args, Parameter } from '@ufo-soft/caelus'
import { argsOf, cli, optionOf } from '../src/cli.js'

const text: Parameter = { name: 'text', type: 'string', description: 'What to add' }
const count: Parameter = { name: 'count', type: 'integer', description: 'How many' }
const verbose: Parameter = { name: 'verbose', type: 'boolean', description: 'Say more' }

/** A registry with `add` (all three parameter types) and a few one-liners. `received` captures what add's handler got. */
function registryOf(received: Args[] = []): Registry {
  const registry = new Registry()
  registry.register([
    {
      name: 'add',
      command: { description: 'Add a thing', parameters: [text, count, verbose] },
      handler: (args) => {
        received.push(args)
        return ok(`added ${args.text}`)
      },
    },
    { name: 'fail', command: { description: 'Always fails', parameters: [] }, handler: () => failed('nope') },
    { name: 'quiet', command: { description: 'Says nothing', parameters: [] }, handler: () => ok() },
    { name: 'data', command: { description: 'Returns an object', parameters: [] }, handler: () => ok({ n: 1 }) },
  ])
  return registry
}

/** Captures what the CLI writes. */
function io() {
  const out: string[] = []
  const err: string[] = []
  return {
    out: (s: string) => void out.push(s),
    err: (s: string) => void err.push(s),
    written: () => out.join(''),
    errors: () => err.join(''),
  }
}

describe('optionOf', () => {
  it('a string parameter is a mandatory option taking a value', () => {
    const option = optionOf(text)

    expect(option.flags).toBe('--text <value>')
    expect(option.description).toBe('What to add')
    expect(option.mandatory).toBe(true)
    expect(option.parseArg).toBeUndefined()
  })

  it('an integer parameter is mandatory and parses its value', () => {
    const option = optionOf(count)

    expect(option.flags).toBe('--count <value>')
    expect(option.mandatory).toBe(true)
    expect(option.parseArg!('42', undefined)).toBe(42)
    expect(option.parseArg!('-7', undefined)).toBe(-7)
  })

  it('an integer parameter rejects anything but a safe integer as a usage error', () => {
    const parse = optionOf(count).parseArg!

    for (const raw of ['abc', '4.2', '', '1e3', '99999999999999999999']) {
      expect(() => parse(raw, undefined)).toThrow(InvalidArgumentError)
    }
  })

  it('a boolean parameter is a flag defaulting to false', () => {
    const option = optionOf(verbose)

    expect(option.flags).toBe('--verbose')
    expect(option.mandatory).toBe(false)
    expect(option.defaultValue).toBe(false)
  })
})

describe('argsOf', () => {
  it('keys parsed option values by parameter name', () => {
    const options = [text, count, verbose].map(optionOf)

    expect(argsOf(options, { text: 'milk', count: 2, verbose: false })).toEqual({
      text: 'milk',
      count: 2,
      verbose: false,
    })
  })

  it('reads the camelCased attribute commander produces for a dashed name', () => {
    const options = [optionOf({ name: 'dry-run', type: 'boolean', description: '' })]

    expect(argsOf(options, { dryRun: true })).toEqual({ 'dry-run': true })
  })
})

describe('cli', () => {
  it('a subcommand with options invokes the command with typed args, prints the data, exits 0', async () => {
    const received: Args[] = []
    const t = io()

    const code = await cli(registryOf(received), ['add', '--text', 'milk', '--count', '2', '--verbose'], 'app', t)

    expect(code).toBe(0)
    expect(received).toEqual([{ text: 'milk', count: 2, verbose: true }])
    expect(t.written()).toBe('added milk\n')
    expect(t.errors()).toBe('')
  })

  it('a flag left out is false', async () => {
    const received: Args[] = []

    await cli(registryOf(received), ['add', '--text', 'milk', '--count', '2'], 'app', io())

    expect(received).toEqual([{ text: 'milk', count: 2, verbose: false }])
  })

  it('a failed outcome prints the reason to stderr and exits 1', async () => {
    const t = io()

    expect(await cli(registryOf(), ['fail'], 'app', t)).toBe(1)
    expect(t.errors()).toContain('nope')
    expect(t.written()).toBe('')
  })

  it('null data prints nothing; other data prints as JSON', async () => {
    const quiet = io()
    const data = io()

    await cli(registryOf(), ['quiet'], 'app', quiet)
    await cli(registryOf(), ['data'], 'app', data)

    expect(quiet.written()).toBe('')
    expect(data.written()).toBe('{"n":1}\n')
  })

  it('a missing mandatory option is a usage error: exit 1, nothing invoked', async () => {
    const received: Args[] = []
    const t = io()

    expect(await cli(registryOf(received), ['add', '--count', '2'], 'app', t)).toBe(1)
    expect(received).toEqual([])
    expect(t.errors()).toContain('--text')
  })

  it('a non-integer value is a usage error carrying the parser message', async () => {
    const t = io()

    expect(await cli(registryOf(), ['add', '--text', 'x', '--count', 'two'], 'app', t)).toBe(1)
    expect(t.errors()).toContain('expected an integer')
  })

  it('--help lists every command with its description under the given name, exits 0', async () => {
    const t = io()

    expect(await cli(registryOf(), ['--help'], 'myapp', t)).toBe(0)
    expect(t.written()).toContain('Usage: myapp')
    expect(t.written()).toContain('add')
    expect(t.written()).toContain('Add a thing')
    expect(t.written()).toContain('fail')
  })

  it('an unknown command is a usage error', async () => {
    const t = io()

    expect(await cli(registryOf(), ['nope'], 'app', t)).toBe(1)
    expect(t.errors()).toContain('nope')
  })
})
