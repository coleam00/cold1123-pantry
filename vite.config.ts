import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development the UI runs on Vite (5173) and calls the API server on PORT (3000).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": `http://127.0.0.1:${process.env.PORT ?? 3000}`,
      "/health": `http://127.0.0.1:${process.env.PORT ?? 3000}`,
    },
  },
});
