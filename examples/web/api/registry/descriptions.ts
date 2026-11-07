import type { Commands } from '@ufo-soft/caelus'

/** The counter commands, described once. The registry provider binds them to CounterService.
 *  Other processes compile this file into themselves, so it must import nothing at runtime. */
export const commands = {
  increment: { description: 'Add one', parameters: [] },
  decrement: { description: 'Subtract one', parameters: [] },
  reset: { description: 'Back to zero', parameters: [] },
} satisfies Commands
