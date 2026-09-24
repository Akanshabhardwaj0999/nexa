import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
  server: {
    proxy: {
      // Same as api/itunes.ts on Vercel: search iTunes without the
      // browser's user agent (Apple redirects iPhones to the Music app).
      "/api/itunes": {
        target: "https://itunes.apple.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/itunes/, "/search"),
        headers: { "User-Agent": "Nexa/1.0" },
      },
    },
  },
})
