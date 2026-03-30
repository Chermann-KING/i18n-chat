const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  // isolatedModules skips full project type-checking (rootDir / cross-file errors).
  // Type correctness is enforced by the dedicated `type-check` CI job.
  transform: { '^.+\\.(t|j)s$': ['ts-jest', { isolatedModules: true }] },
  // Resolve @i18n-chat/* workspace path aliases via tsconfig paths.
  // prefix points one level up from rootDir (src/) to where tsconfig.json lives.
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths ?? {}, {
    prefix: '<rootDir>/../',
  }),
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  coverageThreshold: {
    global: { lines: 80, branches: 80 },
  },
};
