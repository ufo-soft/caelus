---
name: docs-review
description: >
  Review Caelus documentation changes against .claude/docs-style-guide.md: voice, banned patterns,
  terms, accuracy against the source, snippets, page shape, diagrams. Use when the user says
  "docs review", "review the docs", "/docs-review", or asks whether a docs PR follows the style
  guide. Takes an optional PR number or branch; defaults to the current branch against main.
  Reports findings, does not apply them unless asked.
---

# Docs review

Check every changed piece of documentation against `.claude/docs-style-guide.md`. The guide is the
whole rubric. This skill only says how to apply it.

## 1. Load the rubric

Read `.claude/docs-style-guide.md` in full, every time. Don't review from memory of it. Read the root
`README.md` too: it is the voice reference the guide points to.

## 2. Find what changed

- PR number given: `gh pr diff <n> --name-only`, then `gh pr diff <n>` for the content.
- Branch given: `git diff main...<branch>`.
- Nothing given: `git diff main...HEAD`, plus uncommitted changes from `git diff HEAD`.

In scope:

- `README.md`, `packages/*/README.md`, `docs/architecture.md`
- every `.md` under `site/` except the generated `site/api/`
- every file under `site/snippets/`
- TSDoc comments (`/** */`) changed in `packages/*/src/*.ts`. They become the API reference.

Nothing in scope changed: say so and stop.

## 3. Run the mechanical check

Run `node scripts/lint-docs.js`. It covers dashes, banned words, and emoji, the same check CI runs in
`npm run lint`. Report its hits as they are, and don't repeat them in the judgment pass.

If any snippet changed, run `npm run build` too. It type-checks `site/snippets/`. A snippet that
fails to compile is a finding against section 5.

## 4. Judgment pass

Read each changed file whole, not only the diff lines: voice and page shape are properties of the
page. Then check it section by section:

1. **Voice.** Passive voice, intentions instead of facts, paragraphs holding two ideas, sentences
   that need splitting, detail before the reader has the shape.
2. **Banned.** The patterns the script can't see: throat-clearing openers, closing summaries,
   rhetorical questions, bold labels leading every bullet, callouts that aren't a real hazard,
   comparisons to other libraries.
3. **Terms.** Every concept against the terms table. Flag any synonym from the "Not" column, and
   any concept used under two names on one page.
4. **Accuracy.** For every claim about the API, open the source in `packages/*/src/` and confirm
   it: names, signatures, parameter types, defaults, return values, and behavior. A claim you can't
   confirm in the source is a finding. Check that deliberate gaps are named where a reader would
   look for them.
5. **Code examples.** Code inline in a page instead of imported from `site/snippets/`, missing
   imports, placeholder names, prose before the code, output not shown.
6. **Pages.** One question per page, opening with what the thing is, label headings, the first
   mention of another page's concept linked, signatures restated instead of linked to the API
   reference.
7. **Diagrams.** A box per noun instead of a mechanism, node labels off the terms table, more than
   about ten nodes.

## 5. Report

List findings ordered by section: accuracy first, since a wrong fact misleads, then terms, then the
rest in guide order. One finding per entry:

```
site/guide/keybindings.md:14  §4 Accuracy
  Says `reload()` throws on a parse error. keybindings.ts:149: it keeps the previous table and
  returns a failed outcome with the reason.
  Suggest: "A failed read or parse keeps the previous table. `reload` returns the reason as a failed
  outcome."
```

File and line, the section, what is wrong in one or two sentences, and a concrete rewrite when the
fix is prose. No findings: say the change follows the guide, and name what was checked.

Don't edit files unless the user asks. When they do, apply the suggested rewrites, run
`npm run lint` and `npm run build`, and report what changed.
