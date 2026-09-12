// jest.config.js
// Configuration for Jest testing framework

module.exports = {
    // Run tests in Node.js environment (not browser)
    testEnvironment: 'node',

    // Look for test files in tests/ folder
    testMatch: ['**/tests/**/*.test.js'],

    // Files to measure coverage for (exclude server.js)
    collectCoverageFrom: ['src/**/*.js', '!src/server.js'],

    // Where to save coverage reports
    coverageDirectory: 'coverage',

    // Show detailed test results
    verbose: true,

    // Force exit after tests complete
    forceExit: true,

    // Clear all mocks before each test
    clearMocks: true,

    // ✅ Load jest.setup.js before running tests
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
};