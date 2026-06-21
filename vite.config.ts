import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Cache audio worklets too
        additionalManifestEntries: [
          { url: '/worklets/pitch-detector-worklet.js', revision: null },
          { url: '/worklets/pitch-shifter-worklet.js', revision: null },
          { url: '/worklets/recorder-worklet.js', revision: null },
        ],
        runtimeCaching: [
          {
            // Cache-first for static assets
            urlPattern: /\.(?:js|css|woff2?)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'voicecraft-assets',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Network-first for API calls (Kie.ai, etc.)
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: { cacheName: 'voicecraft-api', networkTimeoutSeconds: 10 },
          },
        ],
        // Offline fallback
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: { enabled: false },
      manifest: {
        name: 'VoiceCraft',
        short_name: 'VoiceCraft',
        description: 'Professional voice and music creation studio — record, tune, produce, and share.',
        theme_color: '#0a0e1a',
        background_color: '#0a0e1a',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        categories: ['music', 'entertainment', 'productivity'],
        icons: [
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/icon-maskable.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
        screenshots: [],
        shortcuts: [
          {
            name: 'Open Tuner',
            short_name: 'Tuner',
            description: 'Tune your instrument',
            url: '/?view=tuner',
          },
          {
            name: 'Open Loop Library',
            short_name: 'Loops',
            description: 'Browse loops',
            url: '/?view=loops',
          },
          {
            name: 'Open Live View',
            short_name: 'Live',
            description: 'Record vocals live',
            url: '/?view=live',
          },
        ],
      },
    }),
  ],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
