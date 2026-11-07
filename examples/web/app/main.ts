// The page. The counter lives on the server; every counter command here is a forwarder
// whose send() is a dispatch into the REST client. clearLog is the one command that lives
// in the page. Same descriptions as the server binds, imported from the API's source.
import { OK, Registry, failed, forward, ok } from '@ufo-soft/caelus'
import type { Send } from '@ufo-soft/caelus'
import { keybindings } from '@ufo-soft/caelus/keybindings'

import { commands } from '../api/start/commands.js'
import { counter, current } from './api.js'

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

// A name goes in, the matching REST call goes out. A failed request is a failed Outcome.
const send: Send = async (name) => {
  const call = counter[name as keyof typeof counter]
  if (!call) return failed(`no endpoint for ${name}`)
  try {
    return ok(await call())
  } catch (error) {
    return failed(error instanceof Error ? error.message : String(error))
  }
}

const registry = new Registry()

registry.register(
  forward(commands, async (name, args) => {
    const outcome = await send(name, args)
    log(name)
    if (outcome.kind === OK) render(outcome.data)
    else $('status').textContent = outcome.reason
    return outcome
  }),
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
current().then(render, (error) => ($('status').textContent = String(error)))
