// Conventional Commits, enforced on commit-msg (husky) and in CI for every PR commit.
const config = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      ['backend', 'frontend', 'eslint-config', 'tsconfig', 'docker', 'ci', 'deps', 'docs', 'repo'],
    ],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [2, 'always', 100],
  },
};

export default config;
