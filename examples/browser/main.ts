// One process: the counter, the registry, and both surfaces all live in the page.
import { OK, Registry, bind, ok } from '@ufo-soft/caelus'
import type { Registration } from '@ufo-soft/caelus'
import { keybindings } from '@ufo-soft/caelus/keybindings'

import { commands } from './commands.js'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

const render = (count: unknown) => {
  $('count').textContent = String(count)
}

const log = (line: string) => {
  const el = $('log')
  el.append(Object.assign(document.createElement('div'), { textContent: line }))
  el.scrollTop = el.scrollHeight
}

// --- commands --------------------------------------------------------------------

let count = 0

// The page reacts inside the handler, so every surface that invokes it is covered.
const reacting = (registration: Registration): Registration => ({
  ...registration,
  handler: async (args) => {
    const outcome = await registration.handler(args)
    log(registration.name)
    if (outcome.kind === OK) render(outcome.data)
    return outcome
  },
})

const registry = new Registry()

registry.register(
  bind(commands, {
    increment: () => ok(++count),
    decrement: () => ok(--count),
    reset: () => ok((count = 0)),
  }).map(reacting),
)

registry.register({
  name: 'clearLog',
  command: { description: 'Empty the log', parameters: [] },
  handler: () => {
    $('log').replaceChildren()
    return ok()
  },
})

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
  status.textContent = outcome.kind === OK ? 'reloaded' : outcome.reason
  status.className = outcome.kind
  renderTable()
}

renderTable()
render(count)
