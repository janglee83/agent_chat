// @ts-check
// Root config: lints repo-level files (tool configs, shared eslint-config package).
// Each app has its own eslint.config.* — ESLint 10 picks the nearest config per file.
import { base } from '@agent-chat/eslint-config/base';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';

export default defineConfig(
  globalIgnores(['apps/**']),
  base({ tsconfigRootDir: import.meta.dirname }),
  {
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // Config factories are long declarative lists by nature.
    files: ['packages/eslint-config/**/*.js'],
    rules: { 'max-lines-per-function': 'off', 'max-lines': 'off' },
  },
);
