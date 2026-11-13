// #region stdio
import { Registry, failed, ok } from '@ufo-soft/caelus'
import { stdio } from '@ufo-soft/caelus-mcp'

const todos: string[] = []
const registry = new Registry()

registry.register({
  name: 'add',
  command: {
    description: 'Add a todo',
    parameters: [{ name: 'text', type: 'string', description: 'The todo text' }],
  },
  handler: ({ text }) => {
    if (typeof text !== 'string' || text === '') return failed('text must be a non-empty string')
    todos.push(text)
    return ok(todos)
  },
})

await stdio(registry, { name: 'todo', version: '1.0.0' })
// #endregion stdio
