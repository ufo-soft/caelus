// #region register
import { Registry, failed, ok } from '@ufo-soft/caelus'

const todos = new Set<string>()
const registry = new Registry()

registry.register({
  name: 'add',
  command: {
    description: 'Add a todo',
    parameters: [{ name: 'text', type: 'string', description: 'The todo text' }],
  },
  handler: ({ text }) => {
    if (typeof text !== 'string' || text === '') return failed('text must be a non-empty string')
    todos.add(text)
    return ok(todos.size)
  },
})
// #endregion register

// #region invoke
const added = await registry.invoke('add', { text: 'write the docs' })
const missing = await registry.invoke('add', {})
const unknown = await registry.invoke('remove', { text: 'write the docs' })

console.log(added)
console.log(missing)
console.log(unknown)
// #endregion invoke
