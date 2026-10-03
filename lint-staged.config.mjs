// Runs on staged files only (pre-commit). Fast feedback; CI re-checks everything.
const config = {
  '*': 'prettier --write --ignore-unknown',
  '*.{ts,tsx,js,mjs,cjs}': 'eslint --max-warnings=0 --fix --no-warn-ignored',
  // Type errors can surface in files you did not touch, so typecheck whole projects.
  '{apps,packages}/**/*.{ts,tsx}': () => 'pnpm typecheck',
};

export default config;
