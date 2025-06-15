import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    target: 'node18',
    lib: {
      entry: resolve(__dirname, 'src/extension.ts'),
      fileName: 'extension',
      formats: ['cjs'],
    },
    outDir: 'dist',
    rollupOptions: {
      external: ['vscode', 'fs', 'path', 'minimatch'],
      output: {
        entryFileNames: 'extension.js',
      },
    },
    minify: process.env.NODE_ENV === 'production',
    sourcemap: true,
  },
});