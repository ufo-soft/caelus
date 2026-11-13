// typescript-eslint's recommended rules and nothing else; Prettier owns formatting, so the
// formatting rules are turned off. The Adonis example ships its own kit config and is skipped.
import eslint from '@eslint/js'
import prettier from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'

export default defineConfig(
  globalIgnores(['**/dist/', '**/node_modules/', 'examples/web/api/', '**/.adonisjs/', '**/.vitepress/cache/']),
  eslint.configs.recommended,
  tseslint.configs.recommended,
  prettier,
)
