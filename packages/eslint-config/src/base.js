// @ts-check
/**
 * Shared rules for EVERY TypeScript package in the monorepo (backend + frontend).
 * App-specific presets (node.js / react.js) build on top of this.
 */
import eslintComments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import eslint from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import prettier from 'eslint-config-prettier/flat';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importX from 'eslint-plugin-import-x';
import perfectionist from 'eslint-plugin-perfectionist';
import promise from 'eslint-plugin-promise';
import regexp from 'eslint-plugin-regexp';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export const TS_FILES = ['**/*.{ts,tsx,mts,cts}'];
export const TEST_FILES = ['**/*.{spec,test,e2e-spec}.{ts,tsx}', '**/test/**/*.{ts,tsx}'];
export const CONFIG_FILES = ['**/*.config.{js,mjs,cjs,ts,mts}'];

/**
 * @param {{ tsconfigRootDir: string }} options
 */
export function base({ tsconfigRootDir }) {
  return defineConfig(
    globalIgnores([
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/*.d.ts',
      '**/generated/**',
    ]),

    // ---------- Recommended presets (strictest available) ----------
    eslint.configs.recommended,
    tseslint.configs.strictTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    unicorn.configs.recommended,
    sonarjs.configs.recommended,
    promise.configs['flat/recommended'],
    regexp.configs['flat/recommended'],
    importX.flatConfigs.recommended,
    importX.flatConfigs.typescript,
    eslintComments.recommended,

    {
      name: 'agent-chat/base/setup',
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
      },
      linterOptions: {
        reportUnusedDisableDirectives: 'error',
        reportUnusedInlineConfigs: 'error',
      },
      settings: {
        'import-x/resolver-next': [createTypeScriptImportResolver({ alwaysTryTypes: true })],
      },
      plugins: { perfectionist },
    },

    // ---------- Core JS: correctness & complexity budget ----------
    {
      name: 'agent-chat/base/core',
      rules: {
        eqeqeq: ['error', 'always'],
        curly: ['error', 'all'],
        'no-console': 'error',
        'no-debugger': 'error',
        'no-alert': 'error',
        'no-eval': 'error',
        'no-implied-eval': 'off', // handled by @typescript-eslint/no-implied-eval
        'no-var': 'error',
        'prefer-const': 'error',
        'no-param-reassign': ['error', { props: true }],
        'no-nested-ternary': 'error',
        'no-else-return': ['error', { allowElseIf: false }],
        'no-lonely-if': 'error',
        'no-implicit-coercion': 'error',
        'no-useless-rename': 'error',
        'no-useless-concat': 'error',
        'no-useless-return': 'error',
        'object-shorthand': ['error', 'always'],
        'prefer-template': 'error',
        'prefer-arrow-callback': 'error',
        'default-case-last': 'error',
        'no-restricted-syntax': [
          'error',
          {
            selector: 'TSEnumDeclaration',
            message: 'Use a union type or `as const` object instead of enum.',
          },
          {
            selector: 'LabeledStatement',
            message: 'Labels are hard to follow; restructure the loop.',
          },
          { selector: 'ForInStatement', message: 'Use for...of with Object.keys/entries instead.' },
        ],

        // Complexity budget — split the code when you hit these.
        complexity: ['error', 10],
        'max-depth': ['error', 3],
        'max-params': 'off', // handled by @typescript-eslint/max-params
        'max-nested-callbacks': ['error', 3],
        'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
        'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
        'max-statements': ['error', 20],
      },
    },

    // ---------- TypeScript: type safety ----------
    {
      name: 'agent-chat/base/typescript',
      files: TS_FILES,
      rules: {
        '@typescript-eslint/max-params': ['error', { max: 4 }],
        '@typescript-eslint/explicit-function-return-type': [
          'error',
          { allowExpressions: true, allowTypedFunctionExpressions: true },
        ],
        '@typescript-eslint/explicit-module-boundary-types': 'error',
        '@typescript-eslint/explicit-member-accessibility': [
          'error',
          { accessibility: 'explicit', overrides: { constructors: 'no-public' } },
        ],
        '@typescript-eslint/consistent-type-imports': [
          'error',
          { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
        ],
        '@typescript-eslint/consistent-type-exports': 'error',
        '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
        '@typescript-eslint/no-import-type-side-effects': 'error',
        '@typescript-eslint/strict-boolean-expressions': [
          'error',
          { allowString: false, allowNumber: false, allowNullableObject: true },
        ],
        '@typescript-eslint/switch-exhaustiveness-check': [
          'error',
          { considerDefaultExhaustiveForUnions: true, requireDefaultForNonUnion: true },
        ],
        '@typescript-eslint/prefer-readonly': 'error',
        '@typescript-eslint/promise-function-async': 'error',
        '@typescript-eslint/require-array-sort-compare': 'error',
        '@typescript-eslint/no-unnecessary-qualifier': 'error',
        '@typescript-eslint/no-useless-empty-export': 'error',
        '@typescript-eslint/prefer-enum-initializers': 'error',
        '@typescript-eslint/return-await': ['error', 'always'],
        '@typescript-eslint/no-shadow': 'error',
        '@typescript-eslint/no-loop-func': 'error',
        '@typescript-eslint/default-param-last': 'error',
        '@typescript-eslint/method-signature-style': ['error', 'property'],
        '@typescript-eslint/member-ordering': [
          'error',
          {
            default: [
              'signature',
              'field',
              'constructor',
              'public-method',
              'protected-method',
              'private-method',
            ],
          },
        ],
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'all' },
        ],
        '@typescript-eslint/naming-convention': [
          'error',
          { selector: 'default', format: ['camelCase'], leadingUnderscore: 'allow' },
          { selector: 'import', format: ['camelCase', 'PascalCase'] },
          {
            selector: 'variable',
            format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
            leadingUnderscore: 'allow',
          },
          { selector: 'function', format: ['camelCase', 'PascalCase'] },
          { selector: 'typeLike', format: ['PascalCase'] },
          { selector: 'enumMember', format: ['PascalCase'] },
          {
            selector: 'variable',
            types: ['boolean'],
            format: ['PascalCase'],
            prefix: ['is', 'has', 'should', 'can', 'did', 'will'],
          },
          // Object literal keys (HTTP headers, env vars, config) are not ours to name.
          { selector: ['objectLiteralProperty', 'typeProperty'], format: null },
        ],
      },
    },

    // ---------- Imports: structure & ordering ----------
    {
      name: 'agent-chat/base/imports',
      rules: {
        'import-x/no-cycle': ['error', { maxDepth: Infinity }],
        'import-x/no-self-import': 'error',
        'import-x/no-useless-path-segments': 'error',
        'import-x/no-duplicates': ['error', { 'prefer-inline': false }],
        'import-x/no-default-export': 'error',
        'import-x/no-mutable-exports': 'error',
        'import-x/no-extraneous-dependencies': 'error',
        'import-x/no-relative-packages': 'error',
        'import-x/first': 'error',
        'import-x/newline-after-import': 'error',
        // TypeScript already resolves these, and the rules are slow.
        'import-x/named': 'off',
        'import-x/namespace': 'off',
        'import-x/default': 'off',
        'import-x/no-named-as-default-member': 'off',
        'import-x/no-unresolved': 'off',
        'import-x/no-named-as-default': 'off',

        'perfectionist/sort-imports': [
          'error',
          { type: 'natural', order: 'asc', newlinesBetween: 1, internalPattern: ['^@/.+'] },
        ],
        'perfectionist/sort-named-imports': ['error', { type: 'natural' }],
        'perfectionist/sort-named-exports': ['error', { type: 'natural' }],
        'perfectionist/sort-exports': ['error', { type: 'natural' }],
      },
    },

    // ---------- Escape hatches must be justified ----------
    {
      name: 'agent-chat/base/eslint-comments',
      rules: {
        // `// eslint-disable-next-line rule -- reason` : the reason is mandatory.
        '@eslint-community/eslint-comments/require-description': ['error', { ignore: [] }],
        '@eslint-community/eslint-comments/no-unlimited-disable': 'error',
        '@eslint-community/eslint-comments/disable-enable-pair': 'error',
        '@eslint-community/eslint-comments/no-restricted-disable': [
          'error',
          '@typescript-eslint/no-explicit-any',
          '@typescript-eslint/no-unsafe-*',
          'react-hooks/*',
          'import-x/no-cycle',
        ],
      },
    },

    // ---------- Unicorn / Sonar tuning ----------
    {
      name: 'agent-chat/base/unicorn-sonar',
      rules: {
        'unicorn/filename-case': ['error', { case: 'kebabCase' }],
        'unicorn/no-null': 'off', // null is a legitimate value in JSON/DOM/React APIs
        'unicorn/name-replacements': 'off', // too noisy for props/env/req/res/ref
        'unicorn/import-style': 'off', // named imports from node:* are clearer
        'unicorn/no-array-reduce': 'error',
        'unicorn/no-useless-undefined': ['error', { checkArguments: false }],
        // Class layout: fields → constructor → public → protected → private (see member-ordering).
        'unicorn/consistent-class-member-order': 'off',
        'sonarjs/cognitive-complexity': ['error', 10],
        'sonarjs/todo-tag': 'warn',
      },
    },

    // ---------- Tests: allow test-specific patterns ----------
    {
      name: 'agent-chat/base/tests',
      files: TEST_FILES,
      plugins: { vitest },
      rules: {
        ...vitest.configs.recommended.rules,
        'vitest/consistent-test-it': ['error', { fn: 'it' }],
        'vitest/no-focused-tests': 'error',
        'vitest/no-disabled-tests': 'error',
        'vitest/expect-expect': 'error',
        'vitest/require-top-level-describe': 'error',
        'vitest/prefer-strict-equal': 'error',
        'max-lines-per-function': 'off',
        'max-nested-callbacks': 'off',
        // Test factories/mocks rely on inferred types.
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/unbound-method': 'off',
        'sonarjs/no-hardcoded-ip': 'off',
      },
    },

    // ---------- Tool configs need default exports ----------
    {
      name: 'agent-chat/base/config-files',
      files: CONFIG_FILES,
      rules: {
        'import-x/no-default-export': 'off',
        'max-lines-per-function': 'off',
        'import-x/no-extraneous-dependencies': ['error', { devDependencies: true }],
      },
    },

    // Plain JS files get no type-aware rules.
    {
      name: 'agent-chat/base/js',
      files: ['**/*.{js,mjs,cjs}'],
      extends: [tseslint.configs.disableTypeChecked],
    },

    // MUST be last: turn off every rule that would fight Prettier.
    prettier,
    {
      // Safe to re-enable after eslint-config-prettier when set to "all".
      name: 'agent-chat/base/after-prettier',
      rules: { curly: ['error', 'all'] },
    },
  );
}
