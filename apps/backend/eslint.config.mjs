// @ts-check
import { node } from '@agent-chat/eslint-config/node';
import { defineConfig } from 'eslint/config';

export default defineConfig(node({ tsconfigRootDir: import.meta.dirname }));
