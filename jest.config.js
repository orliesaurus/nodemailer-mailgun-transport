module.exports = {
  transform: {
    '^.+\\.(t|j)sx?$': '@swc/jest',
  },
  testPathIgnorePatterns: ["<rootDir>/dist/", "<rootDir>/node_modules/"]
}