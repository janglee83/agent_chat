// @ts-check
/**
 * Backend (Node / NestJS) preset: base + Node runtime + security + Nest conventions.
 */
import nodePlugin from 'eslint-plugin-n';
import security from 'eslint-plugin-security';
import { defineConfig } from 'eslint/config';
import globals from 'globals';

import { base, TEST_FILES, TS_FILES } from './base.js';

/**
 * @param {{ tsconfigRootDir: string }} options
 */
export function node(options) {
  return defineConfig(
    base(options),
    nodePlugin.configs['flat/recommended-module'],
    security.configs.recommended,
    {
      name: 'agent-chat/node/runtime',
      languageOptions: { globals: { ...globals.node } },
      rules: {
        'n/no-process-exit': 'error',
        'n/no-sync': 'error',
        'n/prefer-node-protocol': 'error',
        'n/prefer-global/process': ['error', 'always'],
        'n/no-missing-import': 'off', // TypeScript resolves imports
        'n/no-unpublished-import': 'off', // private app, nothing is published
        'n/no-extraneous-import': 'off', // import-x/no-extraneous-dependencies covers it
        // Too many false positives with typed code; TypeScript guards key access.
        'security/detect-object-injection': 'off',
      },
    },
    {
      name: 'agent-chat/node/nestjs',
      files: TS_FILES,
      rules: {
        // Nest modules are empty classes carrying a decorator.
        '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
        // DI via constructor parameter properties is the Nest idiom — but always readonly.
        '@typescript-eslint/parameter-properties': [
          'error',
          { allow: ['private readonly', 'protected readonly', 'public readonly'] },
        ],
        // Decorator metadata needs runtime (value) imports for injected classes;
        // the rule understands emitDecoratorMetadata and only flags truly type-only imports.
        '@typescript-eslint/consistent-type-imports': [
          'error',
          { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
        ],
        // Logging goes through Nest's Logger.
        'no-restricted-imports': [
          'error',
          {
            paths: [{ name: 'console', message: 'Use Logger from @nestjs/common.' }],
            patterns: [
              { group: ['**/frontend/**'], message: 'Backend must not import frontend code.' },
            ],
          },
        ],
      },
    },
    {
      name: 'agent-chat/node/tests',
      files: TEST_FILES,
      rules: {
        'n/no-sync': 'off',
        '@typescript-eslint/explicit-member-accessibility': 'off',
      },
    },
  );
}
