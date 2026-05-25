import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served at https://go.buildworth.org/visual-lab/ via GitHub Pages.
// `base` must match that path so built asset URLs resolve correctly.
export default defineConfig({
  base: "/visual-lab/",
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2020",
  },
});
