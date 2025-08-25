module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // This helps Jest resolve ES module imports
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  // Since the project is ESM, we need to tell ts-jest to process it as such.
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
};
