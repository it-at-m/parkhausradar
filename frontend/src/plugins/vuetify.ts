import "vuetify/styles";

import type { VueI18nAdapterParams } from "vuetify/locale/adapters/vue-i18n";

import { useI18n } from "vue-i18n";
import { createVuetify } from "vuetify";
import { aliases, mdi } from "vuetify/iconsets/mdi-svg";
import { createVueI18nAdapter } from "vuetify/locale/adapters/vue-i18n";

import i18n from "@/plugins/i18n";

export default createVuetify({
  icons: {
    defaultSet: "mdi",
    aliases,
    sets: {
      mdi,
    },
  },
  theme: {
    themes: {
      light: {
        colors: {
          primary: "#333333",
          secondary: "#FFCC00",
          accent: "#7BA4D9",
          success: "#69BE28",
          error: "#FF0000",
          // Behind the content of full screen pages, which forms groups on the surface color
          "grouped-background": "#EEEEEE",
        },
        variables: {
          "floating-shadow-opacity": 0.08,
          "shadow-ring-color": "#000000",
          "shadow-ring-opacity": 0.08,
        },
      },
      dark: {
        colors: {
          // Light, so primary buttons stand out on the dark surfaces
          primary: "#E0E0E0",
          secondary: "#FFCC00",
          accent: "#90CAF9",
          success: "#81C784",
          error: "#E57373",
          "grouped-background": "#121212",
        },
        // Shadows hardly show on a dark map, a light ring outlines the surfaces instead
        variables: {
          "floating-shadow-opacity": 0.35,
          "shadow-ring-color": "#FFFFFF",
          "shadow-ring-opacity": 0.12,
        },
      },
    },
  },
  locale: {
    // @ts-expect-error false positive for type mismatch (no tsc compilation error)
    adapter: createVueI18nAdapter({ i18n, useI18n } as VueI18nAdapterParams),
  },
});
