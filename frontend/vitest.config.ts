import { fileURLToPath } from "node:url";

import { defineConfig, mergeConfig } from "vitest/config";

import viteConfig from "./vite.config.ts";

export default defineConfig((configEnv) =>
  mergeConfig(
    viteConfig(configEnv),
    defineConfig({
      test: {
        environment: "jsdom",
        root: fileURLToPath(new URL("./", import.meta.url)),
        server: {
          deps: {
            inline: ["vuetify"],
          },
        },
        // Cached modules keep unplugin-vue-i18n's virtual locale ids, which only resolve in the process that created them
        fsModuleCache: false,
      },
    })
  )
);
