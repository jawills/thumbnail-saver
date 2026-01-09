import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        viewer: resolve(__dirname, 'src/viewer/index.html'),
        content: resolve(__dirname, 'src/content/content.ts'),
        background: resolve(__dirname, 'src/background/background.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'content' || chunkInfo.name === 'background') {
            return '[name].js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // Keep HTML files in root with proper names
          if (assetInfo.name === 'index.html') {
            // Determine which HTML file based on the input
            const input = assetInfo.names?.[0] || '';
            if (input.includes('viewer')) {
              return 'viewer.html';
            }
            return 'popup.html';
          }
          return 'assets/[name]-[hash].[ext]';
        },
      },
    },
  },
});
