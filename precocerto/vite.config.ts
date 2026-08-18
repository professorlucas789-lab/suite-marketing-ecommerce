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
      // Target modern browsers for smaller bundle
      target: 'es2020',

      // Optimize chunk size and splitting
      rollupOptions: {
        output: {
          // Manual chunk configuration for large dependencies (Fase 12)
          manualChunks: (id) => {
            // Separate vendor libraries by category
            if (id.includes('node_modules')) {
              // Export libraries (heavy)
              if (id.includes('xlsx') || id.includes('jspdf')) {
                return 'export-libs';
              }
              // Firebase (large)
              if (id.includes('firebase')) {
                return 'firebase';
              }
              // Motion/React animations
              if (id.includes('motion')) {
                return 'animations';
              }
              // Core React
              if (id.includes('react')) {
                return 'react';
              }
              // Other vendors
              return 'vendor';
            }
          },
        },
      },

      // Increase chunk size warning limit (1500 kB)
      chunkSizeWarningLimit: 1500,

      // Use esbuild for faster minification
      minify: 'esbuild',

      // Source maps only in development
      sourcemap: false,

      // CSS code splitting
      cssCodeSplit: true,

      // Terser options for better compression
      terserOptions: {
        compress: {
          drop_console: false, // Keep console for debugging
          passes: 2, // Multiple passes for better compression
        },
      },
    },

    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },

    // Optimize dependencies (Fase 12)
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
        'motion/react',
      ],
      exclude: ['firebase/storage'], // Lazy load storage
    },
  };
});
