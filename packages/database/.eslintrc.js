/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: [require.resolve('../config/eslint/index.js')],
  parserOptions: {
    project: './tsconfig.eslint.json',
    tsconfigRootDir: __dirname,
  },
  overrides: [
    {
      // Seed and migration scripts are dev-only — allow devDependencies imports.
      files: ['prisma/**/*.ts'],
      rules: {
        'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
      },
    },
  ],
};
