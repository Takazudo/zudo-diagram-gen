import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.mjs', 'packages/*/test/**/*.test.mjs'],
    testTimeout: 10000,
    hookTimeout: 10000,
    fileParallelism: true,
  },
});
