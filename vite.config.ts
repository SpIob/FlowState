import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: true, // or "0.0.0.0" for cross-device local network testing
    watch: {
      // Tell vite to ignore watching `src-tauri` to prevent unnecessary rebuilds
      ignored: ["**/src-tauri/**"],
    },
  },

  // Expose TAURI_ environment variables to the frontend
  envPrefix: ["VITE_", "TAURI_"],
}));
