import type { Commands } from '@ufo-soft/caelus'

export const commands = {
  increment: { description: 'Add one', parameters: [] },
  decrement: { description: 'Subtract one', parameters: [] },
  reset: { description: 'Back to zero', parameters: [] },
} satisfies Commands
