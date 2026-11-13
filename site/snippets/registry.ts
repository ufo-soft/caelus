import { Registry, ok, failed } from '@ufo-soft/caelus'

const store = new Set<string>()
const registry = new Registry()

registry.register({
  name: 'add',
  command: {
    description: 'Add a todo',
    parameters: [{ name: 'text', type: 'string', description: 'The todo text' }],
  },
  handler: ({ text }) => {
    if (typeof text !== 'string') return failed('text must be a string')
    store.add(text)
    return ok()
  },
})

await registry.invoke('add', { text: 'write it down' })
