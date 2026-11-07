import { counter } from './api.js'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

const render = (value: number) => {
  $('count').textContent = String(value)
}

const log = (line: string) => {
  const el = $('log')
  el.append(Object.assign(document.createElement('div'), { textContent: line }))
  el.scrollTop = el.scrollHeight
}

const run = async (name: keyof typeof counter) => {
  try {
    render(await counter[name]())
    log(name)
    $('status').textContent = ''
  } catch (error) {
    $('status').textContent = error instanceof Error ? error.message : String(error)
  }
}

$('increment').onclick = () => run('increment')
$('decrement').onclick = () => run('decrement')
$('reset').onclick = () => run('reset')

run('current')
