import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['{core,admin,components,hooks,providers,test-utils,__tests__}/**/*.test.{ts,tsx}'],
    setupFiles: ['./test-utils/setup.ts'],
  },
});
