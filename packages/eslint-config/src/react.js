// @ts-check
/**
 * Frontend (React + Vite) preset: base + React + hooks/compiler + a11y + browser.
 */
import eslintReact from '@eslint-react/eslint-plugin';
import jsxA11y from 'eslint-plugin-jsx-a11y-x';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig } from 'eslint/config';
import globals from 'globals';

import { base, TS_FILES } from './base.js';

/**
 * @param {{ tsconfigRootDir: string }} options
 */
export function react(options) {
  return defineConfig(
    base(options),
    {
      name: 'agent-chat/react/plugins',
      files: TS_FILES,
      extends: [
        eslintReact.configs['strict-type-checked'],
        reactHooks.configs.flat['recommended-latest'],
        reactRefresh.configs.vite,
        jsxA11y.configs.strict,
      ],
      languageOptions: { globals: { ...globals.browser } },
    },
    {
      name: 'agent-chat/react/rules',
      files: TS_FILES,
      rules: {
        // Every hook rule is an error, including React Compiler diagnostics.
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'error',
        // Components are PascalCase.tsx, everything else kebab-case.
        'unicorn/filename-case': ['error', { cases: { kebabCase: true, pascalCase: true } }],
        // Components are functions returning JSX; the return type is inferred noise.
        '@typescript-eslint/explicit-function-return-type': [
          'error',
          {
            allowExpressions: true,
            allowTypedFunctionExpressions: true,
            allowHigherOrderFunctions: true,
          },
        ],
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/backend/**'],
                message: 'Frontend must not import backend code; call the HTTP API.',
              },
            ],
          },
        ],
      },
    },
  );
}
