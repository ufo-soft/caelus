// The mechanical half of .claude/docs-style-guide.md, section 2, over the prose the docs site and npm
// publish: dashes, banned words, emoji. Everything that takes judgment is the docs-review skill's job.
// Prints every hit as file:line and exits 1 if there are any.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const RULES = [
  ['dash: use a period, a colon, or a comma', /[—–]/],
  [
    'banned word',
    /\b(simply|just|easily|seamless(ly)?|powerful|robust|flexible|elegant|effortless|intuitive|comprehensive|cutting-edge)\b/i,
  ],
  ['emoji', /\p{Extended_Pictographic}/u],
]

// Tracked files only, so the generated site/api/ (gitignored) is never checked. In a git pathspec,
// * also matches /, so site/*.md covers every page.
const PROSE = ['README.md', 'packages/*/README.md', 'docs/architecture.md', 'site/*.md']

const files = execFileSync('git', ['ls-files', ...PROSE])
  .toString()
  .split('\n')
  .filter(Boolean)

const hits = files.flatMap((file) =>
  readFileSync(file, 'utf8')
    .split('\n')
    .flatMap((line, i) =>
      RULES.filter(([, pattern]) => pattern.test(line)).map(([rule]) => `${file}:${i + 1}: ${rule}: ${line.trim()}`),
    ),
)

for (const hit of hits) console.log(hit)
process.exitCode = hits.length ? 1 : 0
