// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        manifest: false, // served from public/manifest.webmanifest
        devOptions: { enabled: false },
        filename: "sw.js",
        includeAssets: ["offline.html", "favicon.png", "icons/*.png"],
        workbox: {
          // Static shell assets and generic HTML only; never cache private API responses.
          globPatterns: ["**/*.{js,css,woff2,png,svg,ico,webmanifest}", "offline.html"],
          navigateFallback: null,
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: ({ request, url }) =>
                request.mode === "navigate" && url.origin === self.location.origin &&
                !/^\/(api|~oauth|login|signup|forgot-password|reset-password)(\/|$)/.test(url.pathname),
              handler: "NetworkFirst",
              options: {
                cacheName: "study-app-shell",
                networkTimeoutSeconds: 3,
                cacheableResponse: { statuses: [200] },
                expiration: { maxEntries: 24, maxAgeSeconds: 30 * 24 * 60 * 60 },
                precacheFallback: { fallbackURL: "/offline.html" },
              },
            },
          ],
        },
      }),
    ],
  },
});
