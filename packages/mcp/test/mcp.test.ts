import { PassThrough } from 'node:stream'
import { describe, expect, it } from 'vitest'
import { z } from 'zod/v4'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'

import { Registry, failed, ok } from '@ufo-soft/caelus'
import type { Args, Parameter } from '@ufo-soft/caelus'
import { mcp, resultOf, shapeOf, stdio } from '../src/mcp.js'

const text: Parameter = { name: 'text', type: 'string', description: 'What to add' }
const count: Parameter = { name: 'count', type: 'integer', description: 'How many' }
const verbose: Parameter = { name: 'verbose', type: 'boolean', description: 'Say more' }

const INFO = { name: 'test-app', version: '1.0.0' }

describe('shapeOf', () => {
  it('string and integer are required; boolean is optional and false by default, as in the CLI', () => {
    const shape = z.object(shapeOf([text, count, verbose]))

    expect(shape.parse({ text: 'milk', count: 2, verbose: true })).toEqual({ text: 'milk', count: 2, verbose: true })
    expect(shape.parse({ text: 'milk', count: 2 })).toEqual({ text: 'milk', count: 2, verbose: false })
    expect(shape.safeParse({ count: 2 }).success).toBe(false)
  })

  it('an integer parameter rejects a non-integer and a string', () => {
    const shape = z.object(shapeOf([count]))

    expect(shape.safeParse({ count: 2.5 }).success).toBe(false)
    expect(shape.safeParse({ count: '2' }).success).toBe(false)
  })

  it('no parameters is an empty shape', () => {
    expect(shapeOf([])).toEqual({})
  })
})

/** A registry with `add` (all three parameter types), `fail`, `boom` and `quiet`. `received` captures what add got. */
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
    {
      name: 'boom',
      command: { description: 'Throws', parameters: [] },
      handler: () => {
        throw new Error('kaboom')
      },
    },
    { name: 'quiet', command: { description: 'Says nothing', parameters: [] }, handler: () => ok() },
  ])
  return registry
}

/** A client talking to mcp(registry) over the SDK's in-memory transport pair: the real protocol, no process. */
async function connected(registry: Registry): Promise<Client> {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
  await mcp(registry, INFO).connect(serverSide)
  const client = new Client({ name: 'test', version: '0' })
  await client.connect(clientSide)
  return client
}

describe('mcp', () => {
  it('lists one tool per command with its description and the parameters as its input schema', async () => {
    const { tools } = await (await connected(registryOf())).listTools()

    expect(tools.map((t) => t.name)).toEqual(['add', 'fail', 'boom', 'quiet'])
    expect(tools[0].description).toBe('Add a thing')
    expect(tools[0].inputSchema).toMatchObject({
      type: 'object',
      properties: {
        text: { type: 'string', description: 'What to add' },
        count: { type: 'integer', description: 'How many' },
        verbose: { type: 'boolean', description: 'Say more', default: false },
      },
      required: ['text', 'count'],
    })
    expect(tools[1].inputSchema).toMatchObject({ type: 'object', properties: {} })
  })

  it('a tool call invokes the command with the validated arguments and returns its outcome', async () => {
    const received: Args[] = []
    const client = await connected(registryOf(received))

    const result = await client.callTool({ name: 'add', arguments: { text: 'milk', count: 2 } })

    expect(result).toMatchObject({ content: [{ type: 'text', text: 'added milk' }] })
    expect(received).toEqual([{ text: 'milk', count: 2, verbose: false }])
  })

  it('a failed outcome, and a handler that throws, are error results, not thrown errors', async () => {
    const client = await connected(registryOf())

    expect(await client.callTool({ name: 'fail', arguments: {} })).toMatchObject({
      content: [{ type: 'text', text: 'nope' }],
      isError: true,
    })
    expect(await client.callTool({ name: 'boom', arguments: {} })).toMatchObject({ isError: true })
    expect(await client.callTool({ name: 'quiet', arguments: {} })).toMatchObject({ content: [{ type: 'text', text: 'ok' }] })
  })

  it('invalid arguments never reach the handler', async () => {
    const received: Args[] = []
    const client = await connected(registryOf(received))

    const result = await client.callTool({ name: 'add', arguments: { text: 'milk', count: 'two' } })

    expect(result.isError).toBe(true)
    expect(received).toEqual([])
  })

  it('an empty registry still answers tools/list', async () => {
    expect((await (await connected(new Registry())).listTools()).tools).toEqual([])
  })

  it('carries the app name to the host', async () => {
    expect((await connected(registryOf())).getServerVersion()).toMatchObject(INFO)
  })
})

describe('stdio', () => {
  it('speaks the protocol on the given streams and resolves when stdin ends', async () => {
    const stdin = new PassThrough()
    const stdout = new PassThrough()
    const out: string[] = []
    stdout.on('data', (chunk) => out.push(String(chunk)))

    const done = stdio(registryOf(), INFO, stdin, stdout)
    const initialize = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '0' } },
    }
    stdin.write(JSON.stringify(initialize) + '\n')
    await new Promise((resolve) => setTimeout(resolve, 50))
    stdin.end()

    await expect(done).resolves.toBeUndefined()
    expect(out.join('')).toContain('"serverInfo":{"name":"test-app","version":"1.0.0"}')
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
