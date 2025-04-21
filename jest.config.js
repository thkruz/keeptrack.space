// Equivalent ES module Jest config for ES module projects
export default {
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig-jest.json',
    },
  },
  // preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    '\\.(js|ts|jsx|tsx)$': 'babel-jest',
  },
  // Ignore all node_modules except for new-github-issue-url
  transformIgnorePatterns: ['node_modules/(?!(new-github-issue-url|ootk|ootk-core)/)'],
  testMatch: ['**/?(*.)+(spec|test).?(m)[jt]s?(x)'],
  moduleFileExtensions: ['js', 'mjs', 'ts'],
  setupFiles: ['jest-canvas-mock', '<rootDir>/test/polyfills.js', '<rootDir>/test/test-env.js', '<rootDir>/test/test-env-mocks.js'],
  coverageDirectory: '<rootDir>/coverage',
  moduleDirectories: ['node_modules', 'offline'],
  modulePathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/offline/', '<rootDir>/dist/', '<rootDir>/src/admin/'],
  moduleNameMapper: {
    '\\.(css|less|sass|scss)$': '<rootDir>/scripts/styleMock.js',
    '\\.(jpg|ico|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/scripts/fileMock.js',
    '^@app(.*)$': '<rootDir>/src/$1',
    '^@public(.*)$': '<rootDir>/public/$1',
    '^@css(.*)$': '<rootDir>/public/css/$1',
  },
  coverageReporters: ['lcov', 'html', 'text'],
  coveragePathIgnorePatterns: ['/node_modules/', '/src/lib/external/', '/test/', '/dist/'],
};
