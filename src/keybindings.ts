import { parse } from 'smol-toml'

import { FAILED, Registry, Outcome, ok, failed } from './core.js'

type Keymap = Record<string, string>

/** The tombstone value: binding a chord to this removes it from the resolved table. */
export const UNBIND = 'unbind'

/** Reads the [bindings] table of a TOML keymap. No table is an empty patch; a malformed document is a failure. */
export function parseKeymap(text: string): Outcome<Keymap> {
  try {
    const table = parse(text).bindings
    const entries = typeof table !== 'object' || Array.isArray(table) ? [] : Object.entries(table)
    return ok(Object.fromEntries(entries.filter(([, value]) => typeof value === 'string')))
  } catch (e) {
    return failed(e instanceof Error ? e.message : String(e))
  }
}

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
  if (isModifier(key) || !mods.every(isModifier)) return ''
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
  const isDead = key === 'dead'
  if (key.length > 1 && !isDead) return KEY_ALIASES[key] ?? key
  // alt and shift change event.key ('å', '!'); config names the unshifted key, so read event.code.
  const cooked = e.altKey || isDead || (e.shiftKey && !/\p{L}/u.test(key))
  return (cooked ? fromCode(e.code) : undefined) ?? KEY_ALIASES[key] ?? key
}

function fromCode(code: string): string | undefined {
  const m = /^(?:Key|Digit|Numpad)(.)$/.exec(code)
  return m ? m[1].toLowerCase() : CODE_CHARS[code]
}

/** Join in fixed modifier order so spelling order never matters; duplicates fall out for free. */
function chord(mods: readonly string[], key: string): string {
  return [...MODIFIERS.filter((m) => mods.includes(m)), key].join('+')
}

/** Merge patch over defaults per canonical chord. UNBIND and unknown commands remove the chord. */
export function resolve(defaults: Keymap, patch: Keymap, registry: Registry): Map<string, string> {
  const merged = { ...canonicalized(defaults), ...canonicalized(patch) }
  const bound = Object.entries(merged).filter(([, name]) => name !== UNBIND && registry.retrieve(name))
  return new Map(bound)
}

/** Re-key a layer by canonical chord, dropping entries that don't parse. */
function canonicalized(layer: Keymap): Keymap {
  const entries = Object.entries(layer).map(([chord, name]) => [canonical(chord), name])
  return Object.fromEntries(entries.filter(([key]) => key))
}

type KeyTarget = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>

/** One keydown listener; reads the table through a thunk so a reload is just a swap. Returns the detach. */
export function attach(table: () => ReadonlyMap<string, string>, registry: Registry, target: KeyTarget = window) {
  const listener = (e: Event) => {
    const name = table().get(chordOf(e as KeyboardEvent))
    if (name) {
      e.preventDefault()
      void registry.invoke(name, {})
    }
  }
  target.addEventListener('keydown', listener)
  return () => target.removeEventListener('keydown', listener)
}

/** Produces the user's keymap text from wherever the app keeps it: a file, storage, an API. */
export type Source = () => string | Promise<string>

export interface Keybindings {
  /** The current resolved table. Replaced wholesale on a successful reload, never mutated. */
  readonly table: ReadonlyMap<string, string>
  /** Adds the keydown listener; returns the detach. */
  attach(target?: KeyTarget): () => void
  /** Re-reads the source and swaps the table. On failure the previous table stays and the reason is returned. */
  reload(): Promise<Outcome<ReadonlyMap<string, string>>>
}

/** Wires defaults, an optional user source, and the registry into one reloadable handle.
 *  Starts on defaults alone; call reload() to apply the source and learn whether it parsed. */
export function keybindings(registry: Registry, defaults: Keymap, source?: Source): Keybindings {
  let table = resolve(defaults, {}, registry)
  let latest = 0

  const reload = async (): Promise<Outcome<ReadonlyMap<string, string>>> => {
    const request = ++latest
    const patch = await read(source)
    if (patch.kind === FAILED) return patch
    // a newer reload has already started; let its result win even if ours resolved later
    if (request !== latest) return ok(table)
    table = resolve(defaults, patch.data, registry)
    return ok(table)
  }

  return {
    get table() {
      return table
    },
    attach: (target) => attach(() => table, registry, target),
    reload,
  }
}

/** A throwing source (unreadable file, failed fetch) is a failure like a parse error, not an exception. */
async function read(source?: Source): Promise<Outcome<Keymap>> {
  if (!source) return ok({})
  try {
    return parseKeymap(await source())
  } catch (e) {
    return failed(e instanceof Error ? e.message : String(e))
  }
}
