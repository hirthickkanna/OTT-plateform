import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: "../",
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5001",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://127.0.0.1:5001",
        changeOrigin: true,
      },
      "/vod": {
        target: "http://127.0.0.1:5001",
        changeOrigin: true,
      },
    },
  },
});

