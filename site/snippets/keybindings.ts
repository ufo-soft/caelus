// #region setup
import { OK, Registry, ok } from '@ufo-soft/caelus'
import { keybindings } from '@ufo-soft/caelus/keybindings'

const registry = new Registry()
registry.register([
  { name: 'newTodo', command: { description: 'Open the new todo dialog', parameters: [] }, handler: () => ok() },
  { name: 'search', command: { description: 'Focus the search field', parameters: [] }, handler: () => ok() },
])

const defaults = {
  'cmd+n': 'newTodo',
  'cmd+k': 'search',
}

const kb = keybindings(registry, defaults, () => fetch('/keymap.toml').then((response) => response.text()))
const detach = kb.attach()
// #endregion setup

// #region reload
const outcome = await kb.reload()
if (outcome.kind === OK) console.log([...outcome.data])
else console.error(`keymap not applied: ${outcome.reason}`)
// #endregion reload

detach()
