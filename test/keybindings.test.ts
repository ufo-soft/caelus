import { describe, expect, it } from 'vitest'

import { Registry, ok } from '../src/core.js'
import { attach, canonical, chordOf, parseKeymap, resolve } from '../src/keybindings.js'

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
    expect(parseKeymap(toml)).toEqual(ok({ 'cmd+i': 'openItemDialog', 'cmd+n': 'unbind' }))
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
    expect(outcome.kind).toBe('failed')
    if (outcome.kind === 'failed') expect(outcome.reason).toMatch(/Invalid TOML/)
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
    const table = resolve({ 'cmd+n': 'open', 'cmd+w': 'close' }, { 'cmd+n': 'unbind' }, registry)
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
  /** Captures the keydown listener so a test can fire events at it. */
  function target() {
    let listener: (e: Event) => void = () => {}
    return {
      addEventListener: (_type: string, fn: EventListenerOrEventListenerObject | null) => {
        listener = fn as (e: Event) => void
      },
      press: (e: ReturnType<typeof ev>) => {
        const prevented = { value: false }
        listener(Object.assign(e, { preventDefault: () => (prevented.value = true) }))
        return prevented.value
      },
    }
  }

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