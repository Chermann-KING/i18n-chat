/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: [require.resolve('../config/eslint/index.js')],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ['src/**/*.d.ts', 'src/**/*.js', 'dist/**'],
};
