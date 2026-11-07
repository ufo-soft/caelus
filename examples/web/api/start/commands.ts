import type { Commands } from '@ufo-soft/caelus'

/** The counter commands, described once. The registry provider binds them to CounterService;
 *  the page and any network CLI bind forwarders to these same descriptions. */
export const commands = {
  increment: { description: 'Add one', parameters: [] },
  decrement: { description: 'Subtract one', parameters: [] },
  reset: { description: 'Back to zero', parameters: [] },
} satisfies Commands
