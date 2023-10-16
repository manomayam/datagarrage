import { resolve } from "path";
import { defineConfig } from "vite";
// import { dirname } from "path";
// import { fileURLToPath } from "url";

// const _dirname = __dirname ?? dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(async () => ({
    root: "src/",
    publicDir: "../public/",
    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
        port: 1420,
        strictPort: true,
        open: false
    },
    // 3. to make use of `TAURI_DEBUG` and other env variables
    // https://tauri.studio/v1/api/config#buildconfig.beforedevcommand
    envPrefix: ["VITE_", "TAURI_"],
    build: {
        outDir: "../dist",
        rollupOptions: {
            input: {
                main: resolve(__dirname, "src/index.html"),
                solidos: resolve(__dirname, "src/pr_apps/solidos/index.html"),
            },
        },
    },
    resolve: {
        alias: { "/src": resolve(__dirname, "src") }
    }
}));
