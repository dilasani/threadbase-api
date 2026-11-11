module.exports = {
  testEnvironment: "node",
  setupFiles: ["<rootDir>/jest.setup.cjs"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  transform: {
    "^.+\\.(t|j)sx?$": [
      "@swc/jest",
      {
        jsc: {
          target: "es2022",
          parser: {
            syntax: "typescript"
          }
        },
        module: {
          type: "commonjs"
        }
      }
    ]
  },
  testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"]
};
