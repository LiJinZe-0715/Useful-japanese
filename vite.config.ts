import vinext from "vinext";
import tailwindcss from "@tailwindcss/postcss";
import { defineConfig } from "vite";
// @ts-expect-error Build-only Node script; never enters application bundles.
import { generate } from "./scripts/content.mjs";

export default defineConfig({
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [
    {
      name: "course-discovery",
      buildStart() {
        generate();
      },
      configureServer(server) {
        server.watcher.add(["data/courses", "docs/content-format.md", "schemas"]);
        const changed = (file: string) => {
          if (!/data[\\/]courses|content-format\.md|schemas[\\/]/.test(file)) return;
          try {
            generate();
            server.ws.send({ type: "full-reload" });
          } catch (error) {
            server.ws.send({ type: "error", err: { message: String(error), stack: "" } });
          }
        };
        server.watcher
          .on("add", changed)
          .on("change", changed)
          .on("unlink", changed)
          .on("unlinkDir", changed);
        server.httpServer?.once("close", () => {
          server.watcher
            .off("add", changed)
            .off("change", changed)
            .off("unlink", changed)
            .off("unlinkDir", changed);
        });
      },
    },
    vinext(),
  ],
});
