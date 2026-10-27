import type { Locale } from "@/plugins/i18n";
import type { MapApp } from "@/util/mapApps";

import { useLocalStorage, usePreferredLanguages } from "@vueuse/core";
import { defineStore } from "pinia";
import { computed } from "vue";

import { isSupportedLocale } from "@/plugins/i18n";
import { isMapApp } from "@/util/mapApps";

export const THEME_PREFERENCES = ["light", "dark", "system"] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export type LocalePreference = Locale | "system";

// "ask" lets users choose the app for every route
export type MapAppPreference = MapApp | "ask";

// Used when none of the device languages is supported
const DEFAULT_SYSTEM_LOCALE: Locale = "de";

function isThemePreference(value: string): value is ThemePreference {
  return (THEME_PREFERENCES as readonly string[]).includes(value);
}

function isLocalePreference(value: string): value is LocalePreference {
  return value === "system" || isSupportedLocale(value);
}

function isMapAppPreference(value: string): value is MapAppPreference {
  return value === "ask" || isMapApp(value);
}

// Invalid stored values, e.g. of options that no longer exist, fall back to the default
function usePersistedPreference<T extends string>(
  key: string,
  defaultValue: T,
  isValid: (value: string) => value is T
) {
  return useLocalStorage<T>(key, defaultValue, {
    serializer: {
      read: (value) => (isValid(value) ? value : defaultValue),
      write: (value) => value,
    },
  });
}

/**
 * Store for user settings which are persisted in the browser
 */
export const useSettingsStore = defineStore("settings", () => {
  const themePreference = usePersistedPreference<ThemePreference>(
    "parkhausradar.themePreference",
    "system",
    isThemePreference
  );
  const localePreference = usePersistedPreference<LocalePreference>(
    "parkhausradar.localePreference",
    "system",
    isLocalePreference
  );
  const mapAppPreference = usePersistedPreference<MapAppPreference>(
    "parkhausradar.mapAppPreference",
    "ask",
    isMapAppPreference
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

  return {
    themePreference,
    localePreference,
    mapAppPreference,
    systemLocale,
    locale,
  };
});
