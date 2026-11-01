import { Registry } from "./core";

type Keymap = Record<string, string>;

function canonical() {

}

function chordOf() {

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
