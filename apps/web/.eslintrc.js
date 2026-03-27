/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['next/core-web-vitals', 'prettier'],
  ignorePatterns: ['e2e/**'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  rules: {
    // App Router does not use a pages/ directory — disable this Next.js rule.
    '@next/next/no-html-link-for-pages': 'off',
  },
};
