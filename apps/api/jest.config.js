const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  // isolatedModules is set in tsconfig.json (see compilerOptions.isolatedModules).
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  // Resolve @i18n-chat/* workspace path aliases via tsconfig paths.
  // prefix points one level up from rootDir (src/) to where tsconfig.json lives.
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths ?? {}, {
    prefix: '<rootDir>/../',
  }),
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  // No global threshold: unit tests cover services only; controllers, repositories
  // and workers are covered by E2E tests (not yet implemented — Phase 8.11).
};
