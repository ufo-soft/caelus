// The renderer. The counter lives in Electron main; every counter command here is a
// forwarder over the preload bridge. clearLog is the one command that lives in the page.
import { OK, Registry, forward, ok } from '@ufo-soft/caelus'
import type { Send } from '@ufo-soft/caelus'
import { keybindings } from '@ufo-soft/caelus/keybindings'

import { commands } from './commands.js'

// what preload.cts exposes
declare global {
  interface Window {
    caelus: { send: Send; count(): Promise<number> }
  }
}

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

const registry = new Registry()

registry.register(
  forward(commands, async (name, args) => {
    const outcome = await window.caelus.send(name, args)
    log(name)
    if (outcome.kind === OK) render(outcome.data)
    return outcome
  }),
)

// A UI command: only exists where the UI is.
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

// The CLI changes the counter from outside this page, and the registry has no change
// notification by design, so the page polls. Enough for a dev example.
const refresh = () => window.caelus.count().then(render)
refresh()
setInterval(refresh, 500)
