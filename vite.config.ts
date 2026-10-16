import vinext from "vinext";
import tailwindcss from "@tailwindcss/postcss";
import {defineConfig} from "vite";
// @ts-expect-error Build-only Node script; never enters application bundles.
import {generateContent} from "./scripts/generate-content.mjs";

export default defineConfig({
    css: {postcss: {plugins: [tailwindcss()]}},
    plugins: [
        {
            name: "course-discovery",
            buildStart() {
                generateContent();
            },
            configureServer(server) {
                server.watcher.add(["data/courses", "docs/content-format.md", "schemas"]);
                const handleContentChange = (file: string) => {
                    if (!/data[\\/]courses|content-format\.md|schemas[\\/]/.test(file)) return;
                    try {
                        generateContent();
                        server.ws.send({type: "full-reload"});
                    } catch (error) {
                        server.ws.send({type: "error", err: {message: String(error), stack: ""}});
                    }
                };
                server.watcher
                    .on("add", handleContentChange)
                    .on("change", handleContentChange)
                    .on("unlink", handleContentChange)
                    .on("unlinkDir", handleContentChange);
                server.httpServer?.once("close", () => {
                    server.watcher
                        .off("add", handleContentChange)
                        .off("change", handleContentChange)
                        .off("unlink", handleContentChange)
                        .off("unlinkDir", handleContentChange);
                });
            },
        },
        vinext(),
    ],
});
