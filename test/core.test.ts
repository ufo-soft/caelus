import { describe, expect, it } from 'vitest'

import { Registry, failed, forward, ok } from '../src/core.js'
import type { Args, Registration } from '../src/core.js'

/** A registry with "doThingInCoolApp" registered. `received` captures what the
 *  handler actually got, so the happy path is assertable. */
function registryWithCoolThing(received: string[]): Registry {
  const registry = new Registry()

  registry.register({
    name: 'doThingInCoolApp',
    command: {
      description: 'super cool function for library',
      parameters: [
        {
          name: 'message',
          type: 'string',
          description: 'Message to be printed out by function',
        },
      ],
    },
    handler: ({ message }) => {
      if (typeof message !== 'string') return failed('message must be a string')
      received.push(message)
      return ok()
    },
  })

  return registry
}

const trivial = (name: string): Registration => ({
  name,
  command: { description: name, parameters: [] },
  handler: () => ok(),
})

describe('Registry', () => {
  it('invoke with a valid string arg returns Ok and runs the handler', async () => {
    const received: string[] = []
    const registry = registryWithCoolThing(received)

    const outcome = await registry.invoke('doThingInCoolApp', { message: 'this is a message' })

    expect(outcome).toEqual(ok())
    expect(received).toEqual(['this is a message'])
  })

  it('invoke with a wrong arg type returns Failed and skips the handler', async () => {
    const received: string[] = []
    const registry = registryWithCoolThing(received)

    const outcome = await registry.invoke('doThingInCoolApp', { message: 1234 })

    expect(outcome).toEqual(failed('message must be a string'))
    expect(received).toEqual([])
  })

  it('invoke of an unknown command returns Failed', async () => {
    const outcome = await new Registry().invoke('nope', {})

    expect(outcome).toEqual(failed('no command named nope'))
  })

  it('invoke awaits an async handler', async () => {
    const registry = new Registry()
    registry.register({
      ...trivial('slow'),
      handler: () => Promise.resolve(ok('done')),
    })

    expect(await registry.invoke('slow', {})).toEqual(ok('done'))
  })

  it('register(list) registers every registration', () => {
    const registry = new Registry()
    const names = ['a', 'b', 'c']

    registry.register(names.map(trivial))

    for (const name of names) expect(registry.retrieve(name)?.name).toBe(name)
  })

  it('all() returns every registration', () => {
    const registry = new Registry()
    const names = ['a', 'b', 'c']
    registry.register(names.map(trivial))

    expect(registry.all().map((r) => r.name)).toEqual(names)
  })

  it('forward() registrations carry the description and send name and args through', async () => {
    const sent: [string, Args][] = []
    const registry = new Registry()
    registry.register(
      forward(
        { add: { description: 'Add', parameters: [{ name: 'text', type: 'string', description: 'What' }] } },
        async (name, args) => {
          sent.push([name, args])
          return ok('from afar')
        },
      ),
    )

    expect(registry.retrieve('add')?.command.description).toBe('Add')
    expect(await registry.invoke('add', { text: 'milk' })).toEqual(ok('from afar'))
    expect(sent).toEqual([['add', { text: 'milk' }]])
  })

  it('retrieve() returns a registration, or undefined when absent', () => {
    const registry = registryWithCoolThing([])

    const found = registry.retrieve('doThingInCoolApp')
    expect(found?.name).toBe('doThingInCoolApp')
    expect(found?.command.description).toBe('super cool function for library')

    expect(registry.retrieve('nope')).toBeUndefined()
  })
})
