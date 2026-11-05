import { Registry } from "./core";

type Keymap = Record<string, string>;

const MODIFIERS = ['cmd', 'ctrl', 'alt', 'shift'] as const
type Modifier = (typeof MODIFIERS)[number]
const EVENT_FLAG: Record<Modifier, 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'> = {
  cmd: 'metaKey', ctrl: 'ctrlKey', alt: 'altKey', shift: 'shiftKey',
}
const MODIFIER_ALIASES: Record<string, string> = {
  command: 'cmd', meta: 'cmd', super: 'cmd',
  control: 'ctrl',
  option: 'alt', opt: 'alt',
}

const KEY_ALIASES: Record<string, string> = {
  esc: 'escape', return: 'enter', del: 'delete', ' ': 'space',
  up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright',
}

// event.code -> unshifted char, for when event.key is unusable (alt, shift+symbol, dead keys)
const CODE_CHARS: Record<string, string> = {
  Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\',
  Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backquote: '`',
}

/** Config text -> canonical chord string ('cmd+shift+k'), or '' if unparseable. */
export function canonical(input: string): string {
  const tokens = input.toLowerCase().split('+').map((t) => t.trim()).filter(Boolean)
  if (tokens.length === 0) return ''
  const key = tokens.pop()!
  const mods = tokens.map((t) => MODIFIER_ALIASES[t] ?? t)
  if (!mods.every(isModifier)) return ''
  return chord(mods, KEY_ALIASES[key] ?? key)
}

const isModifier = (s: string): s is Modifier => (MODIFIERS as readonly string[]).includes(s)

/** KeyboardEvent -> canonical chord string, or '' when the key is itself a modifier. */
export function chordOf(e: KeyboardEvent): string {
  if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return ''
  return chord(MODIFIERS.filter((m) => e[EVENT_FLAG[m]]), keyOf(e))
}

function keyOf(e: KeyboardEvent): string {
  const key = e.key.toLowerCase()
  if (key.length > 1 && key !== 'dead') return KEY_ALIASES[key] ?? key
  // alt and shift change event.key ('å', '!'); config names the unshifted key, so read event.code.
  const cooked = e.altKey || key === 'dead' || (e.shiftKey && !/[a-z]/.test(key))
  return cooked ? fromCode(e.code) ?? key : KEY_ALIASES[key] ?? key
}

function fromCode(code: string): string | undefined {
  const m = /^(?:Key|Digit|Numpad)(.)$/.exec(code)
  return m ? m[1].toLowerCase() : CODE_CHARS[code]
}

/** Join in fixed modifier order so spelling order never matters; duplicates fall out for free. */
function chord(mods: readonly string[], key: string): string {
  return [...MODIFIERS.filter((m) => mods.includes(m)), key].join('+')
}

/** Merge patch over defaults per canonical chord. 'unbind' and unknown commands remove the chord. */
export function resolve(defaults: Keymap, patch: Keymap, registry: Registry): Map<string, string> {
  const out = new Map<string, string>()
  for (const layer of [defaults, patch]) {
    for (const [chord, name] of Object.entries(layer)) {
      const key = canonical(chord)
      if (!key) continue
      if (name === 'unbind' || !registry.retrieve(name)) out.delete(key)
      else out.set(key, name)
    }
  }
  return out
}

type KeyTarget = Pick<EventTarget, 'addEventListener'>

/** One keydown listener; reads the table through a thunk so a reload is just a swap. */
export function attach(table: () => Map<string, string>, registry: Registry, target: KeyTarget = window) {
  target.addEventListener('keydown', (e) => {
    const name = table().get(chordOf(e as KeyboardEvent))
    if (name) {
      e.preventDefault()
      registry.invoke(name, {})
    }
  })
}
