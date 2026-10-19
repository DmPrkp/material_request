import swc from 'unplugin-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// swc, а не esbuild: esbuild не эмитит design:paramtypes, и декораторы Nest в тестах
// вели бы себя не так, как в сборке. tsconfigPaths — ради алиаса ~/.
export default defineConfig({
  plugins: [tsconfigPaths(), swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['src/**/*.spec.ts'],
  },
});
