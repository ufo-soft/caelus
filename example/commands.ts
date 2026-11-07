import type { Commands } from '@ufo-soft/caelus'

/** The counter commands, described once. Electron main binds the real handlers;
 *  the renderer and the CLI bind forwarders to these same descriptions. */
export const commands = {
  increment: { description: 'Add one', parameters: [] },
  decrement: { description: 'Subtract one', parameters: [] },
  reset: { description: 'Back to zero', parameters: [] },
} satisfies Commands
