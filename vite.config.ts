import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    target: 'node18',
    lib: {
      entry: {
        extension: resolve(__dirname, 'src/extension.ts'),
      },
      formats: ['cjs'],
      fileName: (format, entryName) => `${entryName}.js`,
    },
    outDir: 'dist',
    rollupOptions: {
      external: ['vscode', 'fs', 'path'],
      output: {
        globals: {
          vscode: 'vscode',
        },
      },
    },
    minify: process.env.NODE_ENV === 'production',
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
