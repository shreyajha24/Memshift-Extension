import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({ command }) => ({
  root: command === 'build' ? resolve(__dirname, 'src') : undefined,
  plugins: [
    react(),
    ...(command === 'build' ? [viteStaticCopy({
      targets: [
        {
          src: '../public/manifest.json',
          dest: '.',
        },
        {
          src: '../public/icons/*',
          dest: 'icons',
        },
      ],
    })] : []),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    // The manifest and icons are copied explicitly below. Do not let Vite
    // copy the whole public/ directory into the production extension.
    copyPublicDir: false,
    sourcemap: false,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        background: resolve(__dirname, 'src/background/service-worker.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') {
            return 'background.js';
          }
          return 'assets/[name]-[hash].js';
        },
        // Only create a separate chunk for vendor (node_modules). Keep local
        // application modules bundled per entry so content scripts are self-contained.
        manualChunks(id) {
          return id.includes('node_modules') ? 'vendor' : undefined;
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
  },
}));
