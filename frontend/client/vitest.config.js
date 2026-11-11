import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Testes do frontend. Os testes de interface marcam jsdom no próprio arquivo.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['test/**/*.test.{js,jsx}'],
  },
});
