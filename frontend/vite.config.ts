import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    plugins: [
      react(),
      {
        name: "handle-html5-routing",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            // Only handle GET requests
            if (req.method !== "GET") {
              return next();
            }
            // Check if the request is for a static file
            if (req.url?.includes(".")) {
              return next();
            }
            // Serve index.html for all other routes
            const indexHtml = fs.readFileSync(
              resolve(__dirname, "index.html"),
              "utf-8"
            );
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/html");
            res.end(indexHtml);
          });
        },
      },
    ],
    server: {
      port: 8501,
      watch: {
        usePolling: false,
        interval: 1000,
      },
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
      },
    },
    define: {
      "process.env": process.env,
    },
  };
});
