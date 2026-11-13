# Keybindings

`@ufo-soft/caelus/keybindings` dispatches commands from key chords. The app supplies a keymap of
defaults, the user can supply a keymap in TOML, and one `keydown` listener invokes the command the
pressed chord maps to.

<<< @/snippets/keybindings.ts#setup

`keybindings(registry, defaults, source)` returns a handle. `attach()` adds the listener to `window`
and returns a function that removes it. To listen on another element, pass it to `attach`.

When the pressed chord is in the table, the listener calls `preventDefault()` on the event and
invokes the command with `{}` as args. A command bound to a chord gets no args.

## The user keymap

The source is any function that returns the user's keymap text, or a promise of it: a file read, a
fetch, a value from storage.

<<< @/snippets/keymap.toml

The `[bindings]` table maps chords to command names. It is a patch over the defaults: a chord in
both takes the user's command, and a chord only in the defaults stays. A chord mapped to `unbind`
is removed. Values that are not strings are ignored, and a document with no `[bindings]` table is
an empty patch.

## Reloading

<<< @/snippets/keybindings.ts#reload

With the keymap above, the resolved table is:

```txt
[ [ 'cmd+n', 'newTodo' ], [ 'ctrl+alt+n', 'newTodo' ], [ 'cmd+/', 'search' ] ]
```

The handle starts on the defaults alone. `reload()` reads the source, parses it, and swaps in the
new table. A source that throws, or text that does not parse, is a failed outcome: the previous
table stays, and the reason says what went wrong. When reloads overlap, the latest one wins.

The table is resolved against the registry when it is built: at creation, and on each reload. A
chord whose command is not registered at that moment is dropped. Register commands before calling
`keybindings`, and reload after registering more.

`kb.table` is the current table, a `Map` of chord to command name. A reload replaces it and never
changes it in place.

## Chords

A chord is zero or more modifiers and one key, joined with `+`. Case, spaces, and modifier order do
not matter: every chord is converted to one canonical form before it is compared.

<<< @/snippets/canonical.ts

```txt
cmd+shift+k
ctrl+alt+escape
cmd+arrowup
""
```

The modifiers are `cmd`, `ctrl`, `alt`, and `shift`, always written in that order in canonical
form. `cmd` is the Meta key: Command on macOS, the Windows key on Windows.

| Alias | Canonical |
|---|---|
| `command`, `meta`, `super` | `cmd` |
| `control` | `ctrl` |
| `option`, `opt` | `alt` |
| `esc` | `escape` |
| `return` | `enter` |
| `del` | `delete` |
| `up`, `down`, `left`, `right` | `arrowup`, `arrowdown`, `arrowleft`, `arrowright` |

The space bar is `space`. Other keys use the name the browser gives them, in lowercase: `f1`, `tab`,
`pageup`.

A chord that does not parse is dropped from the table. That covers an unknown modifier, and a
modifier with no key.

With `alt` held, or `shift` held on a symbol, a keymap names the unshifted key. Write `shift+/`, not
`?`, and `alt+e`, not the accent Option+E types on macOS.

## Not supported

- A platform modifier (`mod` for `cmd` on macOS and `ctrl` elsewhere). Bind both chords.
- Chord sequences, such as `cmd+k cmd+s`.
- Focus context. The listener fires wherever focus is, text fields included.
- Electron menu accelerators.
- Layout-aware `alt` chords. With `alt` held, the key is read by its physical position on a US
  layout, so on other layouts an `alt` chord can name a different character than the key shows.

## Lower-level functions

The handle is built from exported functions an app can use directly: `parseKeymap` reads the TOML,
`canonical` converts a chord string, `chordOf` converts a `KeyboardEvent`, `resolve` merges the two
keymaps into a table, and `attach` adds the listener. See the
[API reference](/api/@ufo-soft/caelus/keybindings/) for their signatures.
