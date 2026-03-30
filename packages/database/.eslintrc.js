/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: [require.resolve('../config/eslint/index.js')],
  // Prisma generates JS/map/d.ts files in src/ — never lint them.
  ignorePatterns: ['src/index.js', 'src/index.js.map', 'src/index.d.ts', 'src/index.d.ts.map'],
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
