import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'

import { OK } from '@ufo-soft/caelus'
import type { Outcome, Parameter } from '@ufo-soft/caelus'

/** One required zod field per parameter: the tool's inputSchema, and the validation that
 *  runs before a handler sees the arguments. Mirrors the CLI: integers must be integers. */
export function shapeOf(parameters: readonly Parameter[]): Record<string, z.ZodType> {
  return Object.fromEntries(parameters.map((p) => [p.name, fieldOf(p.type).describe(p.description)]))
}

const fieldOf = (type: Parameter['type']): z.ZodType => {
  if (type === 'integer') return z.number().int()
  if (type === 'boolean') return z.boolean()
  return z.string()
}

/** An Outcome as a tool result: ok is one text block, failed is the reason marked as an error. */
export function resultOf(outcome: Outcome): CallToolResult {
  if (outcome.kind === OK) return { content: [{ type: 'text', text: render(outcome.data) }] }
  return { content: [{ type: 'text', text: outcome.reason }], isError: true }
}

// The CLI's rendering rule, so the two surfaces agree on what data looks like. The one
// difference: a tool result needs some text, so no data says "ok" where the CLI prints nothing.
function render(data: unknown): string {
  if (data == null) return 'ok'
  if (typeof data === 'string') return data
  return JSON.stringify(data)
}