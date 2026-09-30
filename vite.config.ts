import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { localApiDevMiddleware } from "./vite-plugins/localApiDevMiddleware";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    localApiDevMiddleware(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Dagligt Dashboard",
        short_name: "Dashboard",
        description: "El, benzin, vejr og valuta – ét overblik, hver dag.",
        theme_color: "#F3F6FD",
        background_color: "#F3F6FD",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Cache API-svar kort, så appen føles hurtig og virker offline med "gamle" tal.
        runtimeCaching: [
          {
            urlPattern: /^\/api\/elpriser.*/,
            handler: "NetworkFirst",
            options: {
              cacheName: "elpriser-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 },
              networkTimeoutSeconds: 8,
            },
          },
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/,
            handler: "NetworkFirst",
            options: {
              cacheName: "vejr-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 },
            },
          },
          {
            urlPattern: /^\/api\/valuta.*/,
            handler: "NetworkFirst",
            options: {
              cacheName: "valuta-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 6 },
              networkTimeoutSeconds: 8,
            },
          },
          {
            urlPattern: /^\/api\/benzin.*/,
            handler: "NetworkFirst",
            options: {
              cacheName: "benzin-cache",
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 6 },
              networkTimeoutSeconds: 8,
            },
          },
        ],
      },
    }),
  ],
});