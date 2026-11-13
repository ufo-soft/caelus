# Docs Style Guide

This document defines how Caelus's documentation is written: the site under `site/`, the READMEs it
includes, and the TSDoc the API reference is generated from. Agents write most of it. Humans read it
first, agents second, so every page has to work for a developer reading it once, start to finish.

The goal is **the shortest correct explanation**. Caelus is small. If a page needs more than a few
paragraphs to explain one idea, the explanation is wrong, not long.

The reference for the voice is the root `README.md`. When in doubt, read it and match it.

---

## 1. Voice

Write like an engineer explaining their own code to a colleague: plain, specific, and done when the
point is made.

- Second person, present tense, active voice. "`invoke` returns an `Outcome`", not "an `Outcome`
  will be returned by `invoke`".
- State what the code does. Not what it "aims to", "tries to", or "is designed to" do.
- One idea per paragraph. A paragraph that needs "Also," or "Additionally," is two paragraphs.
- Short sentences. Split any sentence that needs a semicolon, a parenthetical, and a comma to hold
  together.
- Simplest framing first. Say what something is in one sentence before explaining how it works.

**Before:**
> The Registry is a powerful, flexible abstraction that seamlessly enables you to dispatch commands
> across a wide variety of surfaces — whether that's a keyboard shortcut, a button, or even an MCP
> tool call!

**After:**
> A `Registry` holds commands by name. Every surface dispatches through `registry.invoke`: a key
> chord, a button, a CLI subcommand, or an MCP tool call.

## 2. Banned

These read as filler or as machine-written. Cut them on sight.

- Em dashes and en dashes as punctuation. Use a period, a colon, or a comma. Hyphens in compound
  words are fine.
- Filler adverbs and adjectives: simply, just, easily, seamlessly, powerful, robust, flexible,
  elegant, effortless, intuitive, comprehensive, cutting-edge.
- Throat-clearing openers: "Let's", "In this guide we will", "It's worth noting that", "As
  mentioned above", "Under the hood".
- Closing summaries. A page ends when its last point is made. No "In summary" or "That's it!".
- Rhetorical questions and exclamation marks.
- Emoji.
- A bold label leading every bullet. Bold a term where it is defined. A list of plain facts stays
  plain.
- Callout boxes (`::: tip`, `::: warning`), except for a real hazard: data loss, a security
  boundary, or a behavior that silently does the wrong thing.
- Comparisons to other libraries.

## 3. Terms

One word per concept, always the same word, always the one the code uses. A synonym makes a reader
think there are two things.

| Term | Means | Not |
|---|---|---|
| registry | a `Registry`: commands by name, and `invoke` | dispatcher, bus, store |
| command | a `Command`: a description and its parameters | action, operation, task |
| registration | a `Registration`: a name, a command, a handler | entry, binding |
| handler | the function that runs a command | callback, listener, executor |
| parameter | one declared input of a command | argument (that's the value) |
| args | the values passed to `invoke` | params, payload, input |
| outcome | an `Outcome`: `ok` with data, or `failed` with a reason | result, response, return value |
| surface | anything that dispatches through the registry: keys, buttons, CLI, MCP | interface, frontend, channel |
| forwarder | a registration from `forward` that sends the call to another process | proxy, stub, bridge |
| chord | a key combination in canonical form, `cmd+shift+n` | shortcut, hotkey, keybinding |
| keymap | an object of chord to command name | bindings, shortcuts |
| table | the resolved `Map` of chord to command name | lookup, index |

Code identifiers go in backticks: `Registry`, `invoke`, `ok()`. The concept in prose is lowercase
and unformatted: "the registry".

## 4. Accuracy

The docs describe the code that exists, at the version they are built from.

- Read the source before describing it. Copy signatures from `src/`, not from memory or from
  another page.
- Never invent API: no option, overload, or default the code doesn't have.
- Name the gaps. Where a reader would look for something deliberately unsupported (the `mod`
  modifier, chord sequences, focus context, Electron menu accelerators), say it is unsupported.
- Document what a caller can rely on. Internals belong in the architecture pages, and only to
  explain a design choice.

## 5. Code examples

Examples are the most-read part of any page, and the first part to go stale.

- Every example is a real file. Snippets live under `site/snippets/` as `.ts` files that CI
  type-checks, and pages import them with `<<< @/snippets/name.ts`. An example that doesn't
  compile can't ship.
- Complete and minimal: imports included, nothing the point doesn't need.
- Code first, then one or two sentences on what it shows.
- Realistic names: a todo app, or the counter from `examples/`. Never `foo` and `bar`.
- When a command prints or returns something, show the output in its own block.

## 6. Pages

- One page answers one question. The title is that question's subject.
- Open with what it is, in one or two sentences. Then the smallest working example. Then detail.
- Headings are labels, not sentences: "Reloading", not "How to reload your keybindings".
- Link the first mention of another page's concept, and no later ones.
- The API reference is generated from TSDoc. Guides link to it instead of restating signatures.

## 7. Diagrams

Diagrams are Mermaid, in the page source.

- Draw the mechanism, not a box per noun. A diagram earns its place by showing a flow or a boundary
  the prose would need a paragraph for.
- Node labels use the terms from section 3.
- Keep it under about ten nodes. A bigger one is two diagrams.
