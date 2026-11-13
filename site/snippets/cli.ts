import { Registry, failed, ok } from '@ufo-soft/caelus'
import { cli } from '@ufo-soft/caelus-cli'

const todos: string[] = []
const registry = new Registry()

registry.register([
  {
    name: 'add',
    command: {
      description: 'Add a todo',
      parameters: [
        { name: 'text', type: 'string', description: 'The todo text' },
        { name: 'top', type: 'boolean', description: 'Put it first' },
      ],
    },
    handler: ({ text, top }) => {
      if (typeof text !== 'string') return failed('text must be a string')
      if (top) todos.unshift(text)
      else todos.push(text)
      return ok(todos)
    },
  },
  {
    name: 'remove',
    command: {
      description: 'Remove a todo by position',
      parameters: [{ name: 'index', type: 'integer', description: 'Its position, from 0' }],
    },
    handler: ({ index }) =>
      typeof index === 'number' && index in todos ? ok(todos.splice(index, 1)[0]) : failed(`no todo at ${index}`),
  },
])

process.exitCode = await cli(registry, process.argv.slice(2), 'todo')
