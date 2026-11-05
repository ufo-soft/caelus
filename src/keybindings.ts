import { Registry } from "./core";

type Keymap = Record<string, string>;

const MODIFIERS = ['cmd', 'ctrl', 'alt', 'shift'] as const
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
  const mods = new Set<string>()
  for (const t of tokens) {
    const mod = MODIFIER_ALIASES[t] ?? t
    if (!(MODIFIERS as readonly string[]).includes(mod)) return ''
    mods.add(mod)
  }
  return chord(mods, KEY_ALIASES[key] ?? key)
}

/** KeyboardEvent -> canonical chord string, or '' when the key is itself a modifier. */
export function chordOf(e: KeyboardEvent): string {
  if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return ''
  const mods = new Set<string>()
  if (e.metaKey) mods.add('cmd')
  if (e.ctrlKey) mods.add('ctrl')
  if (e.altKey) mods.add('alt')
  if (e.shiftKey) mods.add('shift')
  return chord(mods, keyOf(e))
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

function chord(mods: Set<string>, key: string): string {
  return [...MODIFIERS.filter((m) => mods.has(m)), key].join('+')
}

function resolve(defaults: Keymap, patch: Keymap, registry: Registry): Map<string, string> {
  const out = new Map<string, string>()
  for (const [chord, name] of Object.entries({...defaults, ...patch})) {
    const key = canonical(chord)
    if (key && name !== 'unbind' && registry.retrieve(name)) out.set(key, name)
  }
  return out;
}

function attach(table: () => Map<string, string>, registry: Registry) {
  window.addEventListener('keydown', e => {
    const name = table().get(chordOf(e));
    if (name) {
      e.preventDefault();
      registry.invoke(name, {});
    }
  });
}
