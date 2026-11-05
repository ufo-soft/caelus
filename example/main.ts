import { Registry, ok } from '@ufo-soft/caelus'
import { keybindings } from '@ufo-soft/caelus/keybindings'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

// --- app state: a counter, so the commands have something to do -------------

let count = 0

const render = () => {
  $('count').textContent = String(count)
}

const log = (line: string) => {
  const el = $('log')
  el.append(Object.assign(document.createElement('div'), { textContent: line }))
  el.scrollTop = el.scrollHeight
}

// --- commands, defined once --------------------------------------------------

const registry = new Registry()

const simple = (name: string, description: string, run: () => void) => ({
  name,
  command: { description, parameters: [] },
  handler: () => {
    run()
    log(name)
    render()
    return ok()
  },
})

registry.register([
  simple('increment', 'Add one', () => count++),
  simple('decrement', 'Subtract one', () => count--),
  simple('reset', 'Back to zero', () => (count = 0)),
  simple('clearLog', 'Empty the log', () => $('log').replaceChildren()),
])

// --- surface 1: buttons, generated from the registry -------------------------

$('buttons').replaceChildren(
  ...registry.all().map((r) =>
    Object.assign(document.createElement('button'), {
      textContent: r.name,
      title: r.command.description,
      onclick: () => registry.invoke(r.name, {}),
    }),
  ),
)

// --- surface 2: keybindings, with the textarea as the user's keymap source ---

const defaults = {
  'alt+up': 'increment',
  'alt+down': 'decrement',
  'alt+r': 'reset',
  'alt+l': 'clearLog',
}

const keymap = $<HTMLTextAreaElement>('keymap')
keymap.value = `[bindings]\n"alt+0" = "reset"\n"alt+l" = "unbind"\n`

const kb = keybindings(registry, defaults, () => keymap.value)
kb.attach()

const renderTable = () => {
  $('table').replaceChildren(
    ...[...kb.table].map(([chord, name]) => {
      const row = document.createElement('tr')
      row.append(
        Object.assign(document.createElement('td'), { textContent: chord }),
        Object.assign(document.createElement('td'), { textContent: name }),
      )
      return row
    }),
  )
}

$('reload').onclick = async () => {
  const outcome = await kb.reload()
  const status = $('status')
  status.textContent = outcome.kind === 'ok' ? 'reloaded' : outcome.reason
  status.className = outcome.kind
  renderTable()
}

renderTable()
render()
