// @ts-check
import { react } from '@agent-chat/eslint-config/react';
import { defineConfig } from 'eslint/config';

export default defineConfig(react({ tsconfigRootDir: import.meta.dirname }));
