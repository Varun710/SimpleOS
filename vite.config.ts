import path from "path";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { chatApiPlugin } from "./vite-plugin-chat-api";

export default defineConfig({
  plugins: [react(), tailwindcss(), chatApiPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
