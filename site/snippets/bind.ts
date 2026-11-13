// #region descriptions
import type { Commands } from '@ufo-soft/caelus'

export const commands = {
  increment: { description: 'Add one', parameters: [] },
  decrement: { description: 'Subtract one', parameters: [] },
  reset: { description: 'Back to zero', parameters: [] },
} satisfies Commands
// #endregion descriptions

// #region bind
import { Registry, bind, ok } from '@ufo-soft/caelus'

let count = 0
const registry = new Registry()

registry.register(
  bind(commands, {
    increment: () => ok(++count),
    decrement: () => ok(--count),
    reset: () => ok((count = 0)),
  }),
)
// #endregion bind
