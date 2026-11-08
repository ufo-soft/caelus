import { describe, expect, it } from 'vitest'

import { FAILED, Registry, ok } from '../src/core.js'
import { UNBIND, attach, canonical, chordOf, keybindings, parseKeymap, resolve } from '../src/keybindings.js'

/** Captures the keydown listener so a test can fire events at it. */
function target() {
  const listeners = new Set<(e: Event) => void>()
  return {
    addEventListener: (_type: string, fn: EventListenerOrEventListenerObject | null) => {
      listeners.add(fn as (e: Event) => void)
    },
    removeEventListener: (_type: string, fn: EventListenerOrEventListenerObject | null) => {
      listeners.delete(fn as (e: Event) => void)
    },
    press: (e: ReturnType<typeof ev>) => {
      const prevented = { value: false }
      const event = Object.assign(e, { preventDefault: () => (prevented.value = true) })
      for (const listener of listeners) listener(event)
      return prevented.value
    },
  }
}

/** A registry with the named commands; `fired` records which ones ran. */
function registryOf(names: string[], fired: string[] = []): Registry {
  const registry = new Registry()
  registry.register(
    names.map((name) => ({
      name,
      command: { description: name, parameters: [] },
      handler: () => (fired.push(name), ok()),
    })),
  )
  return registry
}

/** Minimal stand-in for a KeyboardEvent; vitest runs in node, so there's no real one. */
function ev(key: string, code: string, mods: Partial<Record<'meta' | 'ctrl' | 'alt' | 'shift', true>> = {}) {
  return {
    key,
    code,
    metaKey: !!mods.meta,
    ctrlKey: !!mods.ctrl,
    altKey: !!mods.alt,
    shiftKey: !!mods.shift,
  } as KeyboardEvent
}

describe('canonical', () => {
  it('parses modifiers and key', () => {
    expect(canonical('cmd+shift+k')).toBe('cmd+shift+k')
  })

  it('ignores modifier order, case, and whitespace', () => {
    expect(canonical('Shift + CMD + K')).toBe('cmd+shift+k')
  })

  it('resolves modifier aliases', () => {
    expect(canonical('command+k')).toBe('cmd+k')
    expect(canonical('meta+k')).toBe('cmd+k')
    expect(canonical('control+k')).toBe('ctrl+k')
    expect(canonical('option+k')).toBe('alt+k')
  })

  it('resolves key aliases', () => {
    expect(canonical('esc')).toBe('escape')
    expect(canonical('cmd+return')).toBe('cmd+enter')
    expect(canonical('ctrl+up')).toBe('ctrl+arrowup')
  })

  it('rejects unknown modifiers and empty input', () => {
    expect(canonical('hyper+k')).toBe('')
    expect(canonical('')).toBe('')
    expect(canonical('  ')).toBe('')
  })

  it('passes unknown keys through loosely', () => {
    expect(canonical('cmd+banana')).toBe('cmd+banana')
  })

  it('rejects a modifier standing in as the key', () => {
    expect(canonical('cmd+shift')).toBe('')
    expect(canonical('cmd+')).toBe('')
  })
})

describe('chordOf', () => {
  it('reads modifiers and a plain key', () => {
    expect(chordOf(ev('n', 'KeyN', { meta: true }))).toBe('cmd+n')
    expect(chordOf(ev('k', 'KeyK', { meta: true, shift: true }))).toBe('cmd+shift+k')
  })

  it('returns empty when the pressed key is itself a modifier', () => {
    expect(chordOf(ev('Shift', 'ShiftLeft', { shift: true }))).toBe('')
    expect(chordOf(ev('Meta', 'MetaLeft', { meta: true }))).toBe('')
  })

  it('names non-printable keys from event.key', () => {
    expect(chordOf(ev('Enter', 'Enter'))).toBe('enter')
    expect(chordOf(ev('ArrowUp', 'ArrowUp', { ctrl: true }))).toBe('ctrl+arrowup')
    expect(chordOf(ev('F5', 'F5'))).toBe('f5')
    expect(chordOf(ev(' ', 'Space'))).toBe('space')
  })

  it('uppercases from shift on a letter still match the lowercase key', () => {
    expect(chordOf(ev('K', 'KeyK', { shift: true }))).toBe('shift+k')
  })

  it('reads the unshifted key from event.code when shift cooks a symbol', () => {
    expect(chordOf(ev('!', 'Digit1', { shift: true }))).toBe('shift+1')
    expect(chordOf(ev('{', 'BracketLeft', { shift: true }))).toBe('shift+[')
  })

  it('reads from event.code when alt cooks the character (macOS)', () => {
    expect(chordOf(ev('å', 'KeyA', { alt: true }))).toBe('alt+a')
    expect(chordOf(ev('Dead', 'KeyN', { alt: true }))).toBe('alt+n')
  })

  it('follows the keyboard layout for unmodified and cmd chords', () => {
    // Dvorak: the physical QWERTY "b" key produces "n"; config says cmd+n and should match.
    expect(chordOf(ev('n', 'KeyB', { meta: true }))).toBe('cmd+n')
  })

  it('follows the layout for shifted letters on non-Latin layouts too', () => {
    // Cyrillic: shift uppercases a letter, it does not cook a symbol, so event.key is still right.
    expect(chordOf(ev('й', 'KeyQ', { meta: true }))).toBe('cmd+й')
    expect(chordOf(ev('Й', 'KeyQ', { meta: true, shift: true }))).toBe('cmd+shift+й')
  })

  it('keeps key aliases when the key is cooked', () => {
    expect(chordOf(ev(' ', 'Space', { shift: true }))).toBe('shift+space')
    expect(chordOf(ev(' ', 'Space', { alt: true }))).toBe('alt+space')
  })

  it('agrees with canonical for the same chord', () => {
    expect(chordOf(ev('k', 'KeyK', { meta: true, shift: true }))).toBe(canonical('shift+cmd+k'))
    expect(chordOf(ev('!', 'Digit1', { shift: true }))).toBe(canonical('shift+1'))
    expect(chordOf(ev('Escape', 'Escape'))).toBe(canonical('esc'))
  })
})

describe('parseKeymap', () => {
  it('reads the bindings table, quoted keys unquoted', () => {
    const toml = `
      # rebind the dialog
      [bindings]
      "cmd+i" = "openItemDialog"
      "cmd+n" = "unbind"
    `
    expect(parseKeymap(toml)).toEqual(ok({ 'cmd+i': 'openItemDialog', 'cmd+n': UNBIND }))
  })

  it('treats a missing bindings table as an empty patch', () => {
    expect(parseKeymap('')).toEqual(ok({}))
    expect(parseKeymap('[settings]\ntheme = "dark"')).toEqual(ok({}))
  })

  it('drops non-string values and ignores other sections', () => {
    const toml = `
      [bindings]
      "cmd+i" = "openItemDialog"
      "cmd+k" = 3
      [settings]
      theme = "dark"
    `
    expect(parseKeymap(toml)).toEqual(ok({ 'cmd+i': 'openItemDialog' }))
  })

  it('fails on malformed TOML with the parser message', () => {
    const outcome = parseKeymap('[bindings]\n"cmd+i" = ')
    expect(outcome.kind).toBe(FAILED)
    if (outcome.kind === FAILED) expect(outcome.reason).toMatch(/Invalid TOML/)
  })
})

describe('resolve', () => {
  const registry = registryOf(['open', 'close'])

  it('keeps defaults when there is no patch', () => {
    expect(resolve({ 'cmd+n': 'open' }, {}, registry)).toEqual(new Map([['cmd+n', 'open']]))
  })

  it('patch overrides a default, regardless of chord spelling', () => {
    const table = resolve({ 'cmd+n': 'open' }, { 'Cmd + N': 'close' }, registry)
    expect(table).toEqual(new Map([['cmd+n', 'close']]))
  })

  it('unbind removes a default', () => {
    const table = resolve({ 'cmd+n': 'open', 'cmd+w': 'close' }, { 'cmd+n': UNBIND }, registry)
    expect(table).toEqual(new Map([['cmd+w', 'close']]))
  })

  it('drops bindings to unknown commands', () => {
    expect(resolve({ 'cmd+n': 'nope' }, {}, registry)).toEqual(new Map())
    // a patch that rebinds to an unknown command loses the default too: the user moved away from it
    expect(resolve({ 'cmd+n': 'open' }, { 'cmd+n': 'nope' }, registry)).toEqual(new Map())
  })

  it('drops unparseable chords without touching the rest', () => {
    const table = resolve({ 'hyper+n': 'open', 'cmd+w': 'close' }, {}, registry)
    expect(table).toEqual(new Map([['cmd+w', 'close']]))
  })
})

describe('attach', () => {
  it('invokes the bound command and prevents default', () => {
    const fired: string[] = []
    const registry = registryOf(['open'], fired)
    const t = target()
    attach(() => new Map([['cmd+n', 'open']]), registry, t)

    expect(t.press(ev('n', 'KeyN', { meta: true }))).toBe(true)
    expect(fired).toEqual(['open'])
  })

  it('ignores unbound chords and leaves default behaviour alone', () => {
    const fired: string[] = []
    const t = target()
    attach(() => new Map([['cmd+n', 'open']]), registryOf(['open'], fired), t)

    expect(t.press(ev('x', 'KeyX', { meta: true }))).toBe(false)
    expect(fired).toEqual([])
  })

  it('returns a dispose function that detaches the listener', () => {
    const fired: string[] = []
    const t = target()
    const dispose = attach(() => new Map([['cmd+n', 'open']]), registryOf(['open'], fired), t)

    t.press(ev('n', 'KeyN', { meta: true }))
    dispose()
    t.press(ev('n', 'KeyN', { meta: true }))

    expect(fired).toEqual(['open'])
  })

  it('reads the table through the thunk, so swapping it is a live reload', () => {
    const fired: string[] = []
    const registry = registryOf(['open', 'close'], fired)
    let table = new Map([['cmd+n', 'open']])
    const t = target()
    attach(() => table, registry, t)

    t.press(ev('n', 'KeyN', { meta: true }))
    table = new Map([['cmd+n', 'close']])
    t.press(ev('n', 'KeyN', { meta: true }))

    expect(fired).toEqual(['open', 'close'])
  })
})

describe('keybindings', () => {
  const defaults = { 'cmd+n': 'open' }
  const cmdN = () => ev('n', 'KeyN', { meta: true })

  it('starts on defaults alone', () => {
    const keys = keybindings(registryOf(['open']), defaults)
    expect(keys.table).toEqual(new Map([['cmd+n', 'open']]))
  })

  it('reload applies the source over the defaults', async () => {
    const keys = keybindings(registryOf(['open', 'close']), defaults, () => '[bindings]\n"cmd+n" = "close"')
    const outcome = await keys.reload()
    expect(outcome).toEqual(ok(new Map([['cmd+n', 'close']])))
    expect(keys.table).toEqual(new Map([['cmd+n', 'close']]))
  })

  it('accepts a synchronous source and no source', async () => {
    const sync = keybindings(registryOf(['open', 'close']), defaults, () => '[bindings]\n"cmd+w" = "close"')
    await sync.reload()
    expect(sync.table).toEqual(
      new Map([
        ['cmd+n', 'open'],
        ['cmd+w', 'close'],
      ]),
    )

    const none = keybindings(registryOf(['open']), defaults)
    expect(await none.reload()).toEqual(ok(new Map([['cmd+n', 'open']])))
  })

  it('a reload that fails to parse keeps the previous table and returns the reason', async () => {
    let text = '[bindings]\n"cmd+n" = "close"'
    const keys = keybindings(registryOf(['open', 'close']), defaults, async () => text)
    await keys.reload()

    text = '[bindings]\n"cmd+n" = '
    const outcome = await keys.reload()

    expect(outcome.kind).toBe(FAILED)
    expect(keys.table).toEqual(new Map([['cmd+n', 'close']]))
  })

  it('a source that throws is a failed outcome and the previous table stays', async () => {
    const keys = keybindings(registryOf(['open']), defaults, async () => {
      throw new Error('ENOENT: no such file')
    })
    const outcome = await keys.reload()

    expect(outcome.kind).toBe(FAILED)
    if (outcome.kind === FAILED) expect(outcome.reason).toMatch(/ENOENT/)
    expect(keys.table).toEqual(new Map([['cmd+n', 'open']]))
  })

  it('reload without a source re-resolves, so late-registered commands bind', async () => {
    const registry = new Registry()
    const keys = keybindings(registry, defaults)
    expect(keys.table).toEqual(new Map())

    registry.register({ name: 'open', command: { description: 'open', parameters: [] }, handler: () => ok() })
    await keys.reload()

    expect(keys.table).toEqual(new Map([['cmd+n', 'open']]))
  })

  it('overlapping reloads apply the latest request, not the last to resolve', async () => {
    const registry = registryOf(['open', 'close'])
    let settle: (text: string) => void = () => {}
    const slow = new Promise<string>((resolve) => (settle = resolve))
    const reads = [() => slow, () => '[bindings]\n"cmd+n" = "close"']
    const keys = keybindings(registry, defaults, () => reads.shift()!())

    const first = keys.reload()
    const second = keys.reload()
    await second
    settle('[bindings]\n"cmd+n" = "open"')
    await first

    expect(keys.table).toEqual(new Map([['cmd+n', 'close']]))
  })

  it('the attached listener sees the swapped table after reload', async () => {
    const fired: string[] = []
    let text = ''
    const keys = keybindings(registryOf(['open', 'close'], fired), defaults, () => text)
    const t = target()
    keys.attach(t)

    t.press(cmdN())
    text = '[bindings]\n"cmd+n" = "close"'
    await keys.reload()
    t.press(cmdN())

    expect(fired).toEqual(['open', 'close'])
  })
})
