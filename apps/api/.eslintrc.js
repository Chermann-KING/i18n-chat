/** @type {import('eslint').Linter.Config} */
module.exports = {
  // Resolve the shared config by path — ESLint v8 does not support scoped
  // workspace package names in 'extends' without require.resolve.
  extends: [require.resolve('../../packages/config/eslint/index.js')],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  rules: {
    // NestJS uses parameter decorators which trigger this rule
    'no-unused-vars': 'off',
    // Use inline `type` modifiers instead of separate `import type` statements
    // when a module has both value and type imports — avoids import/no-duplicates.
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
    ],
  },
};
