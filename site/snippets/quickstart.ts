// #region register
import { OK, Registry, ok } from '@ufo-soft/caelus'
import { keybindings } from '@ufo-soft/caelus/keybindings'

let count = 0
const registry = new Registry()

registry.register({
  name: 'increment',
  command: { description: 'Add one', parameters: [] },
  handler: () => ok(++count),
})
// #endregion register

// #region surfaces
// A button per command, built from the registry
for (const { name, command } of registry.all()) {
  const button = document.createElement('button')
  button.textContent = name
  button.title = command.description
  button.onclick = () => registry.invoke(name, {})
  document.body.append(button)
}

// A key chord for the same command
keybindings(registry, { 'alt+up': 'increment' }).attach()
// #endregion surfaces

// #region invoke
const outcome = await registry.invoke('increment', {})
if (outcome.kind === OK) console.log(outcome.data)
// #endregion invoke
