import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Use a relative base so deployments (Render, Netlify, etc.) can serve files from any path
  base: './',
  server: {
    // Bind to all network interfaces so the dev server is reachable on LAN
    // `true` tells Vite to listen on all addresses (0.0.0.0 / ::)
    host: true,
    port: 8080,
    strictPort: false,
    // Allow specific hostnames to access the dev server (helpful when using a forwarded or public dev hostname)
    // Add the host reported by Vite as blocked to this list for local development. Be careful with production.
    allowedHosts: [
      'smart-facility-manager.onrender.com',
      'localhost',
      '127.0.0.1'
    ],
    // Disable HMR in non-development modes to avoid websocket attempts from production builds
    hmr: mode === 'development' ? undefined : false,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  // Preview server configuration (used by `vite preview`) — make it predictable for deployments
  preview: {
    host: true,
    port: 8080
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
