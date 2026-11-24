import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const libs = fileURLToPath(new URL('../../../libs', import.meta.url));

export default defineConfig({
  // @annophis/<lib> → libs/<lib>/src (tsconfig paths, which vitest does not read)
  resolve: { alias: [{ find: /^@annophis\/(.*)$/, replacement: `${libs}/$1/src/index.ts` }] },
  test: { include: ['src/**/*.spec.ts'], environment: 'node' },
});
