import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'

import { Registry, failed, ok } from '@ufo-soft/caelus'
import type { Args, Parameter } from '@ufo-soft/caelus'
import { mcp, resultOf, shapeOf } from '../src/mcp.js'

const text: Parameter = { name: 'text', type: 'string', description: 'What to add' }
const count: Parameter = { name: 'count', type: 'integer', description: 'How many' }
const verbose: Parameter = { name: 'verbose', type: 'boolean', description: 'Say more' }

describe('shapeOf', () => {
  it('one required zod field per parameter, typed by the parameter', () => {
    const shape = z.object(shapeOf([text, count, verbose]))

    expect(shape.parse({ text: 'milk', count: 2, verbose: true })).toEqual({ text: 'milk', count: 2, verbose: true })
    expect(shape.safeParse({ text: 'milk', count: 2 }).success).toBe(false)
  })

  it('an integer parameter rejects a non-integer and a string', () => {
    const shape = z.object(shapeOf([count]))

    expect(shape.safeParse({ count: 2.5 }).success).toBe(false)
    expect(shape.safeParse({ count: '2' }).success).toBe(false)
  })

  it('carries the description so the tool schema is self-describing', () => {
    expect(shapeOf([text]).text.description).toBe('What to add')
  })

  it('no parameters is an empty shape', () => {
    expect(shapeOf([])).toEqual({})
  })
})

/** A registry with `add` (all three parameter types) and `fail`. `received` captures what add's handler got. */
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
  ])
  return registry
}

/** A client talking to mcp(registry) over the SDK's in-memory transport pair: the real protocol, no process. */
async function connected(registry: Registry): Promise<Client> {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
  await mcp(registry).connect(serverSide)
  const client = new Client({ name: 'test', version: '0' })
  await client.connect(clientSide)
  return client
}

describe('mcp', () => {
  it('lists one tool per command, described, with the parameters as its input schema', async () => {
    const { tools } = await (await connected(registryOf())).listTools()

    expect(tools.map((t) => t.name)).toEqual(['add', 'fail'])
    expect(tools[0].description).toBe('Add a thing')
    expect(tools[0].inputSchema).toMatchObject({
      type: 'object',
      properties: { text: { type: 'string' }, count: { type: 'integer' }, verbose: { type: 'boolean' } },
      required: ['text', 'count', 'verbose'],
    })
  })

  it('a tool call invokes the command with the validated arguments and returns its outcome', async () => {
    const received: Args[] = []
    const client = await connected(registryOf(received))

    const result = await client.callTool({ name: 'add', arguments: { text: 'milk', count: 2, verbose: false } })

    expect(result).toMatchObject({ content: [{ type: 'text', text: 'added milk' }] })
    expect(received).toEqual([{ text: 'milk', count: 2, verbose: false }])
  })

  it('a failed outcome is an error result, not a thrown error', async () => {
    const result = await (await connected(registryOf())).callTool({ name: 'fail', arguments: {} })

    expect(result).toMatchObject({ content: [{ type: 'text', text: 'nope' }], isError: true })
  })

  it('invalid arguments never reach the handler', async () => {
    const received: Args[] = []
    const client = await connected(registryOf(received))

    const result = await client.callTool({ name: 'add', arguments: { text: 'milk', count: 'two', verbose: false } })

    expect(result.isError).toBe(true)
    expect(received).toEqual([])
  })
})

describe('resultOf', () => {
  it('ok with string data is that text', () => {
    expect(resultOf(ok('added milk'))).toEqual({ content: [{ type: 'text', text: 'added milk' }] })
  })

  it('ok with other data is JSON; ok with no data is "ok"', () => {
    expect(resultOf(ok({ n: 1 }))).toEqual({ content: [{ type: 'text', text: '{"n":1}' }] })
    expect(resultOf(ok())).toEqual({ content: [{ type: 'text', text: 'ok' }] })
  })

  it('failed is the reason, marked as an error', () => {
    expect(resultOf(failed('nope'))).toEqual({ content: [{ type: 'text', text: 'nope' }], isError: true })
  })
})