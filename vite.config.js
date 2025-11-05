import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'build',
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
    copyPublicDir: true,
  },
  server: {
    port: 8081,
  },
  publicDir: 'public',
  // Allow importing config.js as a static asset
  assetsInclude: ['**/*.js'],
});
