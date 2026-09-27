import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { validateApiBaseUrl } from "./config/api-url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  validateApiBaseUrl(env.VITE_API_BASE_URL);
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { "@": path.resolve(__dirname, ".") } },
    server: { port: 3000, strictPort: true },
    preview: { port: 3000, strictPort: true },
  };
});
