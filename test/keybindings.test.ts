import { describe, expect, it } from 'vitest'

import { canonical, chordOf } from '../src/keybindings.js'

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