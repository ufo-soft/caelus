# Code Style Guide

This document defines the code style for Caelus. The goal is **a clear, direct, concise expression of information flow**. A reader should be able to see what data comes in, what it becomes, and where it goes, without tracing mutations across lines or unwinding nested callbacks.

The bias is always toward **simplicity**. If the "clever" version and the "boring" version both work, pick the boring one. TypeScript gives you many ways to write something, and most of them make the code harder to follow. Write code that a tired person can read.

A secondary but equally important goal: **testability**. Small, pure functions with clear inputs and outputs are easy to test. Functions that interleave state mutation and side effects (DOM listeners, file reads, registry dispatch) are not. Every rule here pushes code toward small, deterministic pieces. If you can't write a one-line unit test for a piece of logic, the logic needs to be extracted.

This is a library. Its users are other developers, and its core has zero dependencies. That raises the bar on both goals: the public surface has to be obvious, and the internals have to stay small enough to read in one sitting.

---

## 1. Expressions Over Mutation

Prefer building a value in one expression over declaring it empty and mutating it into shape. A `map`, `filter`, `every`, or spread says what the result *is*; a loop that pushes, adds, or sets says how to get there and makes the reader simulate it.

**Before:**
```ts
const mods = new Set<string>()
for (const t of tokens) {
  const mod = MODIFIER_ALIASES[t] ?? t
  if (!(MODIFIERS as readonly string[]).includes(mod)) return ''
  mods.add(mod)
}
return chord(mods, key)
```

**After:**
```ts
const mods = tokens.map((t) => MODIFIER_ALIASES[t] ?? t)
if (!mods.every(isModifier)) return ''
return chord(mods, key)
```

The second version reads as three facts: resolve the aliases, require that all are modifiers, join. The first version hides those facts inside the mechanics of a loop and a mutable Set.

Corollaries:

- **`const` by default.** A `let` is a flag that a value changes over time; make the reader see why.
- **Don't reach for a mutable accumulator to dedup or order.** If the output has a canonical order, filter the canonical list against the input (`MODIFIERS.filter((m) => mods.includes(m))`) and dedup falls out for free.
- **Mutation that remains should be local and obvious.** A `Map` built up inside one function and returned is fine when the alternative is an awkward reduce. The problem is mutation that spans lines, functions, or time, not mutation per se.
- **A loop is still right when there is real work per item or an early exit that `every`/`some` can't express.** Pick the shape that reads as data flow, not the shape that avoids the keyword `for`.

---

## 2. Isolate the Platform Edge

The pure core (parsing, merging, resolving, dispatch) imports nothing and touches no global. The platform (`window`, `KeyboardEvent`, file systems, `navigator`) enters at one function per surface, and that function takes the platform object as a parameter with a sensible default.

```ts
// The pure part: strings in, string out, testable in node
export function canonical(input: string): string

// The edge: takes its target so a test can hand it a fake
export function attach(table: () => Map<string, string>, registry: Registry, target: KeyTarget = window)
```

This is why the module stays usable server-side: a chord arriving over a socket goes through the same `canonical` and `resolve` as one from a keydown. If a function can't run in a plain node test, it is an edge function, and the pure part inside it should be extracted.

The same rule covers **formats**. The library takes plain objects; the app picks the TOML or JSON parser and does the file read. No format or I/O dependency crosses into the library.

---

## 3. One Canonical Form

When the same thing can arrive from two directions (config text and a keyboard event, a CLI flag and an MCP argument), every producer emits the **same canonical representation**, through shared code. The producers are tested against each other, not just against expected output.

```ts
expect(chordOf(ev('k', 'KeyK', { meta: true, shift: true }))).toBe(canonical('shift+cmd+k'))
```

Validation lives at the point where the canonical form is made. Downstream code never re-validates and never handles the raw form.

---

## 4. Degrade, Don't Throw

Misconfiguration never breaks an application. A bad chord, an unknown command, an unparseable entry: drop it and carry on. Functions that normalize return an empty or sentinel value (`''`, `undefined`) rather than throwing, and the caller decides what absence means.

Throwing is reserved for programmer errors that should be loud in development (a handler registered with the wrong shape). Runtime input from a user's config file is never a programmer error.

---

## 5. Types at the Boundaries, Data in the Middle

Use types to make a wrong *program* fail to compile, not to re-describe what the runtime already checks.

**Type it** when removing the type would let a wrong program compile and the runtime would not catch it:

- `Outcome` as a two-case union, so a caller cannot ignore failure.
- `Registration` and `Command`, the schema other surfaces read.
- A parameter's shape at a public function boundary.

**Leave it as data** when the runtime validates it anyway:

- A chord is a `string`. `canonical` decides whether it is a good one, and that check must exist for the config-file path regardless. A template-literal type that parses chords at compile time duplicates it for free marginal value and real reading cost.
- A keymap is `Record<string, string>`. A tombstone is the string `'unbind'`.
- No nominal wrappers (`Key`, `Chord` classes) for values that are just strings. TypeScript is structural; the wrapper buys nothing and costs an unwrap at every use.

Prefer a two-case or discriminated union over a bag of optional fields. Avoid `any`; take `unknown` and narrow.

---

## 6. Early Returns Over Else Branches

Handle the edge case and exit, so the reader never holds two branches at once.

```ts
export function canonical(input: string): string {
  const tokens = input.toLowerCase().split('+').map((t) => t.trim()).filter(Boolean)
  if (tokens.length === 0) return ''
  ...
}
```

A ternary as a single expression that computes a value is fine. Do not nest ternaries; switch to early returns or a small helper.

---

## 7. Extract Functions Instead of Nesting

When a block of logic has a name in your head, give it a name in the code. `keyOf`, `fromCode`, and `chord` exist so that `chordOf` reads as one line. One level of callback or optional chaining is the limit; a second means extract a variable or return early.

---

## 8. Name Callback Parameters

A single letter is fine for a trivial single-expression callback (`tokens.map((t) => t.trim())`). Anything multi-line or ambiguous gets a real name.

---

## 9. Small, Testable Pieces

The litmus test: **can you test this with inputs and an `expect(...).toEqual(...)`?** If not, split the pure part from the side effect.

Tripwires that mean "extract now":

- A decision computed inside an event handler. Return it from a pure function and dispatch on it.
- Platform globals (`window`, `navigator`, `Date.now`) read inline. Inject them with a default.
- The same mutable state written from more than one function. Give it one owner.

---

## 10. Test First

For pure logic, red, green, refactor:

1. **Red.** Write a failing test that states the behavior as inputs and expected output. Watch it fail on the assertion, not on a missing import.
2. **Green.** Write the simplest code that passes. Don't generalize ahead of a test that demands it.
3. **Refactor.** Apply the rules above with green as the safety net.

Edge functions (`attach`, a file reader) get a fake for the platform object and a test that the pure part was called correctly. Tests live in `test/`, one file per module, using Vitest. Fakes are small helpers in the test file (`ev()`, `registryOf()`, `target()`), not fixtures or mocking frameworks.

---

## 11. Comment the Why, Not the What

Make the code self-documenting first. A comment earns its place only to explain what the code cannot: a non-obvious decision, a gotcha, a non-local invariant.

```ts
// alt and shift change event.key ('å', '!'); config names the unshifted key, so read event.code.
```

Doc blocks on exported symbols: at most three lines, current behavior only, nothing the signature already says. No `@param`/`@returns` that restate types.

Never in a comment: rule numbers from this guide, phase or status tags, counts or line numbers, history ("used to"), or plans ("later"). All of these rot the moment something moves.

---

## Summary

| Rule | One-liner |
|---|---|
| Expressions over mutation | Build a value in one expression. `map`/`filter`/`every` over push-into-accumulator. `const` by default. |
| Isolate the platform edge | Pure core imports nothing. Platform objects are parameters with defaults. Formats and I/O stay in the app. |
| One canonical form | Every producer emits the same representation through shared code, and the producers are tested against each other. |
| Degrade, don't throw | Bad config is dropped, not raised. Normalizers return a sentinel; callers decide. |
| Types at the boundaries | Type what the runtime can't catch. Leave validated data as data. No nominal string wrappers. |
| Early returns | Handle the edge case and exit. |
| Extract functions | If it has a name in your head, give it a name in the code. |
| Name callback params | Single letters only for trivial one-liners. |
| Small, testable pieces | If you can't `toEqual` it, extract the pure part. |
| Test first | Red, green, refactor. Fakes are small helpers in the test file. |
| Comment the why | Non-obvious decisions, gotchas, invariants. Nothing that rots. |

The guiding principle: **if you have to read it twice to understand it, rewrite it.**
