/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@usuarios/(.*)$': '<rootDir>/src/usuarios/$1',
    '^@productos/(.*)$': '<rootDir>/src/productos/$1',
    '^@pagos/(.*)$': '<rootDir>/src/pagos/$1',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/**/*.orm-entity.ts', '!src/main.ts'],
};
