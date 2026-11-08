import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { failed, ok } from '@ufo-soft/caelus'
import type { Parameter } from '@ufo-soft/caelus'
import { resultOf, shapeOf } from '../src/mcp.js'

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