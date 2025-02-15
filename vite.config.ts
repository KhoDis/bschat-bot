import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  build: {
    outDir: "dist", // Output directory
    lib: {
      entry: path.resolve(__dirname, "src/app.ts"), // Entry point
      formats: ["cjs"], // CommonJS format for Node.js
      fileName: "app", // Output file name
    },
    rollupOptions: {
      external: ["node:module"], // Externalize Node.js built-in modules
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"), // Path aliases
    },
  },
});
