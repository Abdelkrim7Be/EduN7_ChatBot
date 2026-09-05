import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function manualChunks(id: string) {
  if (!id.includes("node_modules")) return;
  if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/.test(id)) {
    return "react";
  }
  if (/[\\/]node_modules[\\/](react-markdown|remark-gfm|remark-math|rehype-katex|rehype-sanitize|katex)[\\/]/.test(id)) {
    return "markdown";
  }
  if (/[\\/]node_modules[\\/](@floating-ui|cmdk|framer-motion|lucide-react)[\\/]/.test(id)) {
    return "ui";
  }
}

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: process.env.VITE_API_TARGET || "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
