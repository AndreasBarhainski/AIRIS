import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:5001",
        changeOrigin: true,
        secure: false,
      },
      "/object_info": {
        target: "http://localhost:5001",
        changeOrigin: true,
        secure: false,
      },
      "/ws": {
        target: "ws://localhost:5001",
        ws: true,
      },
      "/images": {
        target: "http://localhost:5001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
