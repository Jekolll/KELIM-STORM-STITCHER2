import { defineConfig } from 'vite';

// base: './' agar production build bisa di-deploy di subpath (mis. GitHub Pages)
// tanpa memaksa rewrite asset URL.
export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Izinkan host live preview environment (dev only, bukan production).
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    // Chunk Phaser ~1.4 MB — ukuran library, bukan kode game; jangan peringatan tiap build.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // Phaser di-chunk terpisah: kode game (kecil) bisa dieksekusi segera,
        // dan Phaser tetap ter-cache antar rilis game.
        manualChunks: (id) => (id.includes('node_modules/phaser') ? 'phaser' : undefined),
      },
    },
  },
});
