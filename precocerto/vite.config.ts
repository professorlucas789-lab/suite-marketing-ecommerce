import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

/**
 * Vite configuration with performance optimizations
 * Fase 5C: Performance Optimization
 *
 * Includes:
 * - Code splitting for large dependencies (xlsx, jsPDF)
 * - Dynamic imports for heavy components
 * - Chunk size optimization
 * - Asset optimization
 */
export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Optimize chunk size and splitting
      rollupOptions: {
        output: {
          // Manual chunk configuration for large dependencies
          manualChunks: {
            // Separate export libraries into their own chunks
            'export-libs': ['xlsx', 'jspdf', 'jspdf-autotable'],
            // Core vendor libraries
            'vendor': ['react', 'react-dom'],
          },
        },
      },
      // Increase chunk size warning limit since we're optimizing
      chunkSizeWarningLimit: 1000,
      // Use Vite's default esbuild minification
      minify: 'esbuild',
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
