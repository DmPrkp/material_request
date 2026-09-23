import swc from 'unplugin-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// e2e — приложение целиком через supertest, но с подменённой базой: CI гоняет его без Postgres.
export default defineConfig({
  plugins: [tsconfigPaths(), swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['test/**/*.e2e-spec.ts'],
  },
});
