import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

const appVersion = process.env.npm_package_version || '1.0.2';
const commitRef =
  process.env.GITHUB_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.COMMIT_REF ||
  'local';

/**
 * Vite configuration with performance optimizations
 * Fase 5C: Performance Optimization
 *
 * Includes:
 * - Code splitting for large dependencies (Excel export, jsPDF)
 * - Dynamic imports for heavy components
 * - Chunk size optimization
 * - Asset optimization
 */
export default defineConfig(() => {
  const buildTime = new Date().toISOString();
  const deployTarget =
    process.env.VITE_DEPLOY_TARGET ||
    (process.env.NETLIFY ? 'netlify' : process.env.VERCEL ? 'vercel' : 'local');

  return {
    plugins: [react(), tailwindcss()],
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      __BUILD_TIME__: JSON.stringify(buildTime),
      __GIT_COMMIT__: JSON.stringify(commitRef.slice(0, 7)),
      __DEPLOY_TARGET__: JSON.stringify(deployTarget),
      __PRODUCTION_URL__: JSON.stringify(process.env.VITE_PRODUCTION_URL || ''),
    },
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
              if (id.includes('write-excel-file') || id.includes('jspdf')) {
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
          // Content hashes prevent stale JS/CSS after multiple deploys on the same day.
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
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
