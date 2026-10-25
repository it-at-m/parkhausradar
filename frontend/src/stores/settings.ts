import type { Locale } from "@/plugins/i18n";

import { useLocalStorage, usePreferredLanguages } from "@vueuse/core";
import { defineStore } from "pinia";
import { computed } from "vue";

import { isSupportedLocale } from "@/plugins/i18n";

export const THEME_PREFERENCES = ["light", "dark", "system"] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export type LocalePreference = Locale | "system";

// Used when none of the device languages is supported
const DEFAULT_SYSTEM_LOCALE: Locale = "de";

function isThemePreference(value: string): value is ThemePreference {
  return (THEME_PREFERENCES as readonly string[]).includes(value);
}

function isLocalePreference(value: string): value is LocalePreference {
  return value === "system" || isSupportedLocale(value);
}

/**
 * Store for user settings which are persisted in the browser
 */
export const useSettingsStore = defineStore("settings", () => {
  const themePreference = useLocalStorage<ThemePreference>(
    "parkhausradar.themePreference",
    "system",
    {
      serializer: {
        read: (value) => (isThemePreference(value) ? value : "system"),
        write: (value) => value,
      },
    }
  );

  const localePreference = useLocalStorage<LocalePreference>(
    "parkhausradar.localePreference",
    "system",
    {
      serializer: {
        read: (value) => (isLocalePreference(value) ? value : "system"),
        write: (value) => value,
      },
    }
  );

  const preferredLanguages = usePreferredLanguages();

  const systemLocale = computed<Locale>(
    () =>
      preferredLanguages.value
        .map((language) => new Intl.Locale(language).language)
        .find(isSupportedLocale) ?? DEFAULT_SYSTEM_LOCALE
  );

  const locale = computed<Locale>(() =>
    localePreference.value === "system"
      ? systemLocale.value
      : localePreference.value
  );

  return { themePreference, localePreference, systemLocale, locale };
});
