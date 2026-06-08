/* eslint-disable @typescript-eslint/no-explicit-any */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig((async ({ mode }: any) => {
  let componentTagger: any;
  if (mode === "development") {
    try {
      const mod = await import("lovable-tagger");
      componentTagger = mod.componentTagger;
    } catch {
      // lovable-tagger not available, skip
    }
  }

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
      headers: {
        "Permissions-Policy": "camera=*"
      }
    },
    plugins: [react(), mode === "development" && componentTagger ? componentTagger() : false].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
  };
}) as any);
